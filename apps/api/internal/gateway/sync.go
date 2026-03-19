package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/agent"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/board"
)

// SyncResult holds the result counts for an agent sync operation.
type SyncResult struct {
	AgentsSynced  int `json:"agents_synced"`
	AgentsAdded   int `json:"agents_added"`
	AgentsUpdated int `json:"agents_updated"`
	AgentsOffline int `json:"agents_offline"`
}

// openclawAgent represents an agent as returned by the OpenClaw agents.list RPC.
type openclawAgent struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Model       string `json:"model"`
	Description string `json:"description"`
	Role        string `json:"role"`
}

// SyncAgents calls agents.list on the gateway and reconciles the result
// with Mission Control's database. The operation is idempotent.
//
// Behavior:
//   - Agents present in OpenClaw but not in MC are created with status "online".
//   - Agents present in both are updated to status "online" with refreshed metadata.
//   - Agents in MC linked to this gateway but NOT in the OpenClaw response are set to "offline".
func (m *Manager) SyncAgents(ctx context.Context, gatewayID uuid.UUID) (*SyncResult, error) {
	// 1. Get the gateway from DB (includes board association via organization).
	gw, err := m.entClient.Gateway.Get(ctx, gatewayID)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, fmt.Errorf("gateway %s not found", gatewayID)
		}
		return nil, fmt.Errorf("sync agents: get gateway: %w", err)
	}

	// 2. Call agents.list via the gateway client.
	client, err := m.GetClient(gatewayID)
	if err != nil {
		return nil, fmt.Errorf("sync agents: %w", err)
	}

	rawResult, err := client.Call(ctx, "agents.list", nil)
	if err != nil {
		return nil, fmt.Errorf("sync agents: rpc agents.list: %w", err)
	}

	m.logger.Debug("agents.list raw result", "result", string(rawResult), "len", len(rawResult))

	// The result may be an array directly, or wrapped in {"agents": [...]} or similar.
	var openclawAgents []openclawAgent
	if err := json.Unmarshal(rawResult, &openclawAgents); err != nil {
		// Try as a wrapper object with an "agents" key.
		var wrapper map[string]json.RawMessage
		if err2 := json.Unmarshal(rawResult, &wrapper); err2 == nil {
			// Try common keys: "agents", "items", "data", or the first array value.
			for _, key := range []string{"agents", "items", "data"} {
				if v, ok := wrapper[key]; ok {
					if err3 := json.Unmarshal(v, &openclawAgents); err3 == nil {
						break
					}
				}
			}
			if openclawAgents == nil {
				// Try each value to find an array.
				for _, v := range wrapper {
					if err3 := json.Unmarshal(v, &openclawAgents); err3 == nil {
						break
					}
				}
			}
		}
		if openclawAgents == nil {
			return nil, fmt.Errorf("sync agents: unmarshal agents.list result: %w (raw: %s)", err, string(rawResult))
		}
	}

	m.logger.Info("received agents from gateway",
		"gateway_id", gatewayID,
		"agent_count", len(openclawAgents),
	)

	// 3. Get all existing MC agents linked to this gateway.
	existingAgents, err := m.entClient.Agent.Query().
		Where(agent.GatewayID(gatewayID)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("sync agents: query existing agents: %w", err)
	}

	// Build a lookup map: name -> existing agent.
	existingByName := make(map[string]*generated.Agent, len(existingAgents))
	for _, a := range existingAgents {
		existingByName[a.Name] = a
	}

	// Track which agents from OpenClaw we've seen.
	seenNames := make(map[string]bool, len(openclawAgents))

	result := &SyncResult{}

	// We need a board to assign new agents to. Find the first board
	// in the gateway's organization, or use a fallback approach.
	boardID, err := m.findBoardForGateway(ctx, gw)
	if err != nil {
		return nil, fmt.Errorf("sync agents: find board for gateway: %w", err)
	}

	// 4. Reconcile each OpenClaw agent.
	for _, oa := range openclawAgents {
		seenNames[oa.Name] = true

		role := oa.Role
		if role == "" {
			role = "agent"
		}

		backstory := oa.Description

		// Build metadata JSON with model info.
		metadata := map[string]string{
			"openclaw_id": oa.ID,
			"model":       oa.Model,
		}
		metadataJSON, _ := json.Marshal(metadata)

		existing, found := existingByName[oa.Name]
		if found {
			// Update existing agent: set online, refresh metadata.
			_, err := m.entClient.Agent.UpdateOne(existing).
				SetStatus(agent.StatusOnline).
				SetRole(role).
				SetBackstory(backstory).
				SetGoal(string(metadataJSON)).
				Save(ctx)
			if err != nil {
				m.logger.Error("sync: failed to update agent",
					"name", oa.Name,
					"error", err,
				)
				continue
			}
			result.AgentsUpdated++
			slog.Debug("agent updated from gateway sync", "name", oa.Name, "gateway_id", gatewayID)
		} else {
			// Create new agent linked to this gateway and board.
			_, err := m.entClient.Agent.Create().
				SetName(oa.Name).
				SetRole(role).
				SetBackstory(backstory).
				SetGoal(string(metadataJSON)).
				SetStatus(agent.StatusOnline).
				SetBoardID(boardID).
				SetGatewayID(gatewayID).
				Save(ctx)
			if err != nil {
				m.logger.Error("sync: failed to create agent",
					"name", oa.Name,
					"error", err,
				)
				continue
			}
			result.AgentsAdded++
			slog.Info("agent created from gateway sync", "name", oa.Name, "gateway_id", gatewayID)
		}
	}

	// 5. Set agents linked to this gateway but NOT in OpenClaw's list to offline.
	for _, existing := range existingAgents {
		if !seenNames[existing.Name] {
			_, err := m.entClient.Agent.UpdateOne(existing).
				SetStatus(agent.StatusOffline).
				Save(ctx)
			if err != nil {
				m.logger.Error("sync: failed to set agent offline",
					"name", existing.Name,
					"error", err,
				)
				continue
			}
			result.AgentsOffline++
			slog.Info("agent set offline (not in gateway)", "name", existing.Name, "gateway_id", gatewayID)
		}
	}

	result.AgentsSynced = result.AgentsAdded + result.AgentsUpdated

	m.logger.Info("agent sync complete",
		"gateway_id", gatewayID,
		"synced", result.AgentsSynced,
		"added", result.AgentsAdded,
		"updated", result.AgentsUpdated,
		"offline", result.AgentsOffline,
	)

	return result, nil
}

// findBoardForGateway finds an appropriate board to assign new agents to.
// It looks for boards in the gateway's organization.
func (m *Manager) findBoardForGateway(ctx context.Context, gw *generated.Gateway) (uuid.UUID, error) {
	// Query boards belonging to the gateway's organization.
	boards, err := m.entClient.Board.Query().
		Where(board.OrganizationID(gw.OrganizationID)).
		Limit(1).
		All(ctx)
	if err != nil {
		return uuid.Nil, fmt.Errorf("query boards for org %s: %w", gw.OrganizationID, err)
	}

	if len(boards) == 0 {
		return uuid.Nil, fmt.Errorf("no boards found in organization %s; create a board first", gw.OrganizationID)
	}

	return boards[0].ID, nil
}

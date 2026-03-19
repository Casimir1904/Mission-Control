package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/gateway"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/teamtemplate"
)

// TeamTemplateService manages team templates and creates teams from them.
type TeamTemplateService interface {
	ListTemplates(ctx context.Context) ([]dto.TeamTemplateOutput, error)
	GetTemplate(ctx context.Context, name string) (*dto.TeamTemplateOutput, error)
	ListModels(ctx context.Context) ([]dto.AvailableModelOutput, error)
	CreateTeam(ctx context.Context, input dto.CreateTeamInput) (*dto.CreateTeamOutput, error)
}

type teamTemplateService struct {
	boardSvc  BoardService
	agentSvc  AgentService
	gwManager *gateway.Manager
}

// NewTeamTemplateService creates a new TeamTemplateService.
func NewTeamTemplateService(boardSvc BoardService, agentSvc AgentService, gwManager *gateway.Manager) TeamTemplateService {
	return &teamTemplateService{
		boardSvc:  boardSvc,
		agentSvc:  agentSvc,
		gwManager: gwManager,
	}
}

func (s *teamTemplateService) ListTemplates(ctx context.Context) ([]dto.TeamTemplateOutput, error) {
	templates := teamtemplate.Registry()
	out := make([]dto.TeamTemplateOutput, len(templates))
	for i, t := range templates {
		out[i] = templateToOutput(t)
	}
	return out, nil
}

// openclawModel matches the JSON from OpenClaw's models.list RPC.
type openclawModel struct {
	Key           string `json:"key"`
	Name          string `json:"name"`
	ContextWindow int    `json:"contextWindow"`
	Available     bool   `json:"available"`
	Local         bool   `json:"local"`
}

func (s *teamTemplateService) ListModels(ctx context.Context) ([]dto.AvailableModelOutput, error) {
	// Try to discover models from any connected gateway.
	if s.gwManager != nil {
		if models := s.discoverModelsFromGateway(ctx); len(models) > 0 {
			return models, nil
		}
	}

	// Fallback to hardcoded list.
	static := teamtemplate.AvailableModels()
	out := make([]dto.AvailableModelOutput, len(static))
	for i, m := range static {
		out[i] = dto.AvailableModelOutput{
			Key:         m.Key,
			Name:        m.Name,
			Provider:    m.Provider,
			Tier:        m.Tier,
			ContextSize: m.ContextSize,
		}
	}
	return out, nil
}

// discoverModelsFromGateway calls models.list on the first connected gateway.
func (s *teamTemplateService) discoverModelsFromGateway(ctx context.Context) []dto.AvailableModelOutput {
	clients := s.gwManager.ConnectedGatewayIDs()
	if len(clients) == 0 {
		return nil
	}

	for _, gwID := range clients {
		client, err := s.gwManager.GetClient(gwID)
		if err != nil {
			continue
		}

		raw, err := client.Call(ctx, "models.list", nil)
		if err != nil {
			slog.Debug("models.list RPC failed", "gateway_id", gwID, "error", err)
			continue
		}

		// Parse response — may be an array or {"models": [...], "count": N}.
		var models []openclawModel
		if err := json.Unmarshal(raw, &models); err != nil {
			var wrapper struct {
				Models []openclawModel `json:"models"`
			}
			if err2 := json.Unmarshal(raw, &wrapper); err2 == nil {
				models = wrapper.Models
			} else {
				slog.Debug("models.list parse failed", "gateway_id", gwID, "error", err, "raw", string(raw))
				continue
			}
		}

		// Convert to DTOs, filtering to available models only.
		out := make([]dto.AvailableModelOutput, 0, len(models))
		for _, m := range models {
			if !m.Available {
				continue
			}
			out = append(out, dto.AvailableModelOutput{
				Key:         m.Key,
				Name:        m.Name,
				Provider:    providerFromKey(m.Key),
				Tier:        inferTier(m.Key, m.Local),
				ContextSize: m.ContextWindow,
			})
		}

		if len(out) > 0 {
			slog.Info("models discovered from gateway", "gateway_id", gwID, "count", len(out))
			return out
		}
	}

	return nil
}

// providerFromKey extracts the provider from a model key like "anthropic/claude-sonnet-4-6".
func providerFromKey(key string) string {
	if i := strings.Index(key, "/"); i >= 0 {
		return key[:i]
	}
	return key
}

// inferTier guesses a cost tier from the model key.
func inferTier(key string, local bool) string {
	if local {
		return "economy"
	}
	k := strings.ToLower(key)
	switch {
	case strings.Contains(k, "opus"):
		return "premium"
	case strings.Contains(k, "lightning"), strings.Contains(k, "glm"), strings.Contains(k, "flash"):
		return "economy"
	default:
		return "standard"
	}
}

func (s *teamTemplateService) GetTemplate(ctx context.Context, name string) (*dto.TeamTemplateOutput, error) {
	for _, t := range teamtemplate.Registry() {
		if t.Name == name {
			out := templateToOutput(t)
			return &out, nil
		}
	}
	return nil, fmt.Errorf("template %q not found", name)
}

func (s *teamTemplateService) CreateTeam(ctx context.Context, input dto.CreateTeamInput) (*dto.CreateTeamOutput, error) {
	// Find the template.
	var tpl *teamtemplate.Template
	for _, t := range teamtemplate.Registry() {
		if t.Name == input.TemplateName {
			tpl = &t
			break
		}
	}
	if tpl == nil {
		return nil, fmt.Errorf("template %q not found", input.TemplateName)
	}

	// Build model override map.
	modelOverrides := make(map[string]string, len(input.ModelOverrides))
	for _, o := range input.ModelOverrides {
		modelOverrides[o.RoleName] = o.Model
	}

	// Create the board.
	board, err := s.boardSvc.Create(ctx, dto.CreateBoardInput{
		Name:              input.BoardName,
		Description:       tpl.Description,
		OrganizationID:    input.OrganizationID,
		OrchestrationMode: "lead_agent",
	})
	if err != nil {
		return nil, fmt.Errorf("create board: %w", err)
	}

	slog.Info("team template: board created",
		"board_id", board.ID,
		"template", tpl.Name,
	)

	// Create agents from template roles.
	var leaderID *uuid.UUID
	agents := make([]dto.AgentOutput, 0, len(tpl.Agents))
	for _, role := range tpl.Agents {
		model := role.DefaultModel
		if override, ok := modelOverrides[role.Name]; ok {
			model = override
		}

		agent, err := s.agentSvc.Create(ctx, dto.CreateAgentInput{
			Name:      role.Name,
			Role:      role.Role,
			Backstory: role.Backstory,
			Model:     model,
			BoardID:   board.ID,
			GatewayID: input.GatewayID,
		})
		if err != nil {
			slog.Error("team template: failed to create agent",
				"role", role.Name,
				"board_id", board.ID,
				"error", err,
			)
			continue
		}

		agents = append(agents, *agent)

		if role.IsLeader {
			leaderID = &agent.ID
		}
	}

	// Set the leader on the board.
	if leaderID != nil {
		_, err := s.boardSvc.Update(ctx, board.ID, dto.UpdateBoardInput{
			LeadAgentID: leaderID,
		})
		if err != nil {
			slog.Error("team template: failed to set lead agent",
				"board_id", board.ID,
				"lead_agent_id", leaderID,
				"error", err,
			)
		}
	}

	slog.Info("team template: team created",
		"board_id", board.ID,
		"template", tpl.Name,
		"agents_created", len(agents),
	)

	return &dto.CreateTeamOutput{
		BoardID: board.ID,
		Agents:  agents,
	}, nil
}

func templateToOutput(t teamtemplate.Template) dto.TeamTemplateOutput {
	agents := make([]dto.AgentRoleOutput, len(t.Agents))
	for i, a := range t.Agents {
		agents[i] = dto.AgentRoleOutput{
			Name:         a.Name,
			Role:         a.Role,
			Backstory:    a.Backstory,
			DefaultModel: a.DefaultModel,
			IsLeader:     a.IsLeader,
		}
	}
	return dto.TeamTemplateOutput{
		Name:        t.Name,
		Description: t.Description,
		Agents:      agents,
	}
}

package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/gateway"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// Manager manages WebSocket connections to multiple OpenClaw gateways.
// It maintains a client per registered gateway and handles lifecycle
// operations such as connecting, disconnecting, and syncing agents.
type Manager struct {
	clients   map[uuid.UUID]*Client
	mu        sync.RWMutex
	entClient *generated.Client
	bus       *events.Bus
	logger    *slog.Logger
	identity  *DeviceIdentity
}

// NewManager creates a new gateway manager. If identityDir is non-empty,
// the manager loads or creates an Ed25519 device identity from that directory
// for authenticating with gateways in device mode.
func NewManager(entClient *generated.Client, bus *events.Bus, identityDir string, logger *slog.Logger) *Manager {
	if logger == nil {
		logger = slog.Default()
	}

	var identity *DeviceIdentity
	if identityDir != "" {
		var err error
		identity, err = LoadOrCreateIdentity(identityDir)
		if err != nil {
			logger.Error("failed to load device identity, falling back to control_ui mode",
				"identity_dir", identityDir,
				"error", err,
			)
		}
	}

	return &Manager{
		clients:   make(map[uuid.UUID]*Client),
		entClient: entClient,
		bus:       bus,
		logger:    logger.With("component", "gateway-manager"),
		identity:  identity,
	}
}

// Start loads all gateways from the database and connects to each one.
// It runs as a blocking operation typically called from a goroutine.
func (m *Manager) Start(ctx context.Context) error {
	// Load all gateways regardless of status; we attempt connection to all of them.
	gateways, err := m.entClient.Gateway.Query().All(ctx)
	if err != nil {
		return fmt.Errorf("gateway manager: query gateways: %w", err)
	}

	m.logger.Info("starting gateway manager", "gateway_count", len(gateways))

	for _, gw := range gateways {
		if gw.AuthToken == "" {
			m.logger.Warn("skipping gateway without auth token", "gateway_id", gw.ID, "name", gw.Name)
			continue
		}
		if err := m.ConnectGateway(ctx, gw.ID); err != nil {
			m.logger.Error("failed to connect to gateway on startup",
				"gateway_id", gw.ID,
				"name", gw.Name,
				"error", err,
			)
			// Continue with other gateways; don't fail the whole manager.
		}
	}

	// Block until context is cancelled.
	<-ctx.Done()
	m.logger.Info("gateway manager shutting down")
	m.closeAll()
	return nil
}

// ConnectGateway establishes a connection to the specified gateway.
func (m *Manager) ConnectGateway(ctx context.Context, gatewayID uuid.UUID) error {
	// Load gateway from DB.
	gw, err := m.entClient.Gateway.Get(ctx, gatewayID)
	if err != nil {
		if generated.IsNotFound(err) {
			return fmt.Errorf("gateway %s not found", gatewayID)
		}
		return fmt.Errorf("gateway manager: get gateway %s: %w", gatewayID, err)
	}

	if gw.AuthToken == "" {
		return fmt.Errorf("gateway %s has no auth token configured", gatewayID)
	}

	// Close any existing connection for this gateway.
	m.mu.Lock()
	if existing, ok := m.clients[gatewayID]; ok {
		existing.Close()
		delete(m.clients, gatewayID)
	}
	m.mu.Unlock()

	// Create and connect the client. Pass the device identity for non-localhost auth.
	client := NewClient(gw.URL, gw.AuthToken, m.identity, m.logger)

	if err := client.Connect(ctx); err != nil {
		// Update gateway status to disconnected.
		_, _ = m.entClient.Gateway.UpdateOneID(gatewayID).
			SetStatus(gateway.StatusDisconnected).
			Save(ctx)
		return fmt.Errorf("gateway manager: connect to %s: %w", gatewayID, err)
	}

	// Update gateway status to connected.
	_, _ = m.entClient.Gateway.UpdateOneID(gatewayID).
		SetStatus(gateway.StatusConnected).
		SetLastConnectedAt(time.Now()).
		Save(ctx)

	m.mu.Lock()
	m.clients[gatewayID] = client
	m.mu.Unlock()

	// Start event forwarding goroutine.
	go m.ForwardEvents(ctx, gatewayID)

	m.logger.Info("gateway connected", "gateway_id", gatewayID, "name", gw.Name)
	return nil
}

// DisconnectGateway closes the connection to a specific gateway.
func (m *Manager) DisconnectGateway(gatewayID uuid.UUID) error {
	m.mu.Lock()
	client, ok := m.clients[gatewayID]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("gateway %s not connected", gatewayID)
	}
	delete(m.clients, gatewayID)
	m.mu.Unlock()

	if err := client.Close(); err != nil {
		return fmt.Errorf("gateway manager: close %s: %w", gatewayID, err)
	}

	// Update status in DB.
	ctx := context.Background()
	_, _ = m.entClient.Gateway.UpdateOneID(gatewayID).
		SetStatus(gateway.StatusDisconnected).
		Save(ctx)

	m.logger.Info("gateway disconnected", "gateway_id", gatewayID)
	return nil
}

// ProvisionAgentParams are the parameters for creating an agent on a gateway.
type ProvisionAgentParams struct {
	Name      string `json:"name"`
	Model     string `json:"model,omitempty"`
	Workspace string `json:"workspace,omitempty"`
}

// ProvisionAgent creates an agent on the OpenClaw gateway via RPC.
func (m *Manager) ProvisionAgent(ctx context.Context, gatewayID uuid.UUID, params ProvisionAgentParams) error {
	client, err := m.GetClient(gatewayID)
	if err != nil {
		return fmt.Errorf("provision agent: %w", err)
	}

	_, err = client.Call(ctx, "agents.add", params)
	if err != nil {
		m.logger.Warn("agents.add RPC failed (may not be supported)",
			"gateway_id", gatewayID,
			"agent_name", params.Name,
			"error", err,
		)
		return fmt.Errorf("provision agent %q: %w", params.Name, err)
	}

	m.logger.Info("agent provisioned on gateway",
		"gateway_id", gatewayID,
		"agent_name", params.Name,
		"model", params.Model,
	)
	return nil
}

// ConnectedGatewayIDs returns the IDs of all currently connected gateways.
func (m *Manager) ConnectedGatewayIDs() []uuid.UUID {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ids := make([]uuid.UUID, 0, len(m.clients))
	for id, c := range m.clients {
		if c.connected.Load() {
			ids = append(ids, id)
		}
	}
	return ids
}

// GetClient returns the WebSocket client for a given gateway.
func (m *Manager) GetClient(gatewayID uuid.UUID) (*Client, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, ok := m.clients[gatewayID]
	if !ok {
		return nil, fmt.Errorf("gateway %s not connected", gatewayID)
	}
	return client, nil
}

// ForwardEvents reads events from the gateway client and publishes them
// to NATS with subject pattern: mc.gateway.{gatewayID}.{eventType}
func (m *Manager) ForwardEvents(ctx context.Context, gatewayID uuid.UUID) {
	m.mu.RLock()
	client, ok := m.clients[gatewayID]
	m.mu.RUnlock()
	if !ok {
		return
	}

	m.logger.Info("starting event forwarder", "gateway_id", gatewayID)

	for {
		select {
		case <-ctx.Done():
			m.logger.Info("event forwarder stopping", "gateway_id", gatewayID)
			return
		case event, ok := <-client.Events():
			if !ok {
				m.logger.Info("event channel closed", "gateway_id", gatewayID)
				return
			}

			subject := fmt.Sprintf("mc.gateway.%s.%s", gatewayID, event.Type)

			payload, err := json.Marshal(map[string]interface{}{
				"gateway_id": gatewayID.String(),
				"event_type": event.Type,
				"data":       event.Data,
			})
			if err != nil {
				m.logger.Error("failed to marshal gateway event", "error", err, "event_type", event.Type)
				continue
			}

			if err := m.bus.Publish(ctx, subject, payload); err != nil {
				m.logger.Error("failed to publish gateway event to NATS",
					"subject", subject,
					"error", err,
				)
			} else {
				m.logger.Debug("forwarded gateway event to NATS", "subject", subject)
			}
		}
	}
}

// closeAll disconnects all gateway clients.
func (m *Manager) closeAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, client := range m.clients {
		if err := client.Close(); err != nil {
			m.logger.Error("error closing gateway client", "gateway_id", id, "error", err)
		}
		delete(m.clients, id)
	}
}

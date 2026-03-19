package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateGatewayInput is the payload for creating a gateway.
type CreateGatewayInput struct {
	Name             string    `json:"name" minLength:"1" maxLength:"255" doc:"Display name of the gateway"`
	URL              string    `json:"url" minLength:"1" maxLength:"2048" doc:"WebSocket connection URL (e.g., ws://host:port)"`
	AuthToken        string    `json:"auth_token" minLength:"1" maxLength:"512" doc:"Authentication token for the gateway"`
	AllowInsecureTLS bool      `json:"allow_insecure_tls,omitempty" doc:"Whether to allow insecure TLS connections"`
	OrganizationID   uuid.UUID `json:"organization_id" format:"uuid" doc:"Owning organization"`
}

// UpdateGatewayInput is the payload for partially updating a gateway.
type UpdateGatewayInput struct {
	Name             *string `json:"name,omitempty" minLength:"1" maxLength:"255" doc:"Display name"`
	URL              *string `json:"url,omitempty" minLength:"1" maxLength:"2048" doc:"Connection URL"`
	AuthToken        *string `json:"auth_token,omitempty" minLength:"1" maxLength:"512" doc:"Auth token"`
	AllowInsecureTLS *bool   `json:"allow_insecure_tls,omitempty" doc:"Allow insecure TLS"`
}

// GatewayOutput is the API response for a gateway.
type GatewayOutput struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"`
	URL              string     `json:"url"`
	Status           string     `json:"status"`
	AllowInsecureTLS bool       `json:"allow_insecure_tls"`
	AgentCount       int        `json:"agent_count"`
	OrganizationID   uuid.UUID  `json:"organization_id"`
	LastConnectedAt  *time.Time `json:"last_connected_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// TestConnectionOutput is the response for testing a gateway connection.
type TestConnectionOutput struct {
	Status    string `json:"status" doc:"Connection status: connected or failed"`
	Message   string `json:"message" doc:"Human-readable status message"`
	LatencyMs int64  `json:"latency_ms" doc:"Connection latency in milliseconds"`
}

// SyncOutput is the response for a gateway agent sync operation.
type SyncOutput struct {
	AgentsSynced  int `json:"agents_synced"`
	AgentsAdded   int `json:"agents_added"`
	AgentsUpdated int `json:"agents_updated"`
	AgentsOffline int `json:"agents_offline"`
}

// ListGatewaysOptions extends ListOptions with gateway-specific filters.
type ListGatewaysOptions struct {
	ListOptions
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Status         string     `json:"status,omitempty"`
}

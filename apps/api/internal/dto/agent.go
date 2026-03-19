package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateAgentInput is the payload for creating an agent.
type CreateAgentInput struct {
	Name      string     `json:"name" minLength:"1" maxLength:"255" doc:"Agent display name"`
	Role      string     `json:"role" minLength:"1" maxLength:"128" doc:"Agent role (e.g., lead, developer)"`
	Backstory string     `json:"backstory,omitempty" maxLength:"8192" doc:"Agent backstory"`
	Goal      string     `json:"goal,omitempty" maxLength:"4096" doc:"Agent goal"`
	BoardID   uuid.UUID  `json:"board_id" format:"uuid" doc:"Board to assign the agent to"`
	GatewayID *uuid.UUID `json:"gateway_id,omitempty" format:"uuid" doc:"Optional gateway"`
}

// UpdateAgentInput is the payload for partially updating an agent.
type UpdateAgentInput struct {
	Name      *string `json:"name,omitempty" minLength:"1" maxLength:"255" doc:"Agent display name"`
	Role      *string `json:"role,omitempty" minLength:"1" maxLength:"128" doc:"Agent role"`
	Backstory *string `json:"backstory,omitempty" maxLength:"8192" doc:"Agent backstory"`
	Goal      *string `json:"goal,omitempty" maxLength:"4096" doc:"Agent goal"`
	Status    *string `json:"status,omitempty" enum:"online,offline,degraded,provisioning" doc:"Agent status"`
}

// AgentOutput is the API response for an agent.
type AgentOutput struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	Role            string     `json:"role"`
	Status          string     `json:"status"`
	Backstory       string     `json:"backstory,omitempty"`
	Goal            string     `json:"goal,omitempty"`
	BoardID         uuid.UUID  `json:"board_id"`
	GatewayID       *uuid.UUID `json:"gateway_id,omitempty"`
	CurrentTask     *string    `json:"current_task,omitempty"`
	LastHeartbeatAt *time.Time `json:"last_heartbeat_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// ListAgentsOptions extends ListOptions with agent-specific filters.
type ListAgentsOptions struct {
	ListOptions
	BoardID        *uuid.UUID `json:"board_id,omitempty"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Status         string     `json:"status,omitempty"`
}

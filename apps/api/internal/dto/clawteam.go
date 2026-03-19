package dto

import "github.com/google/uuid"

// AgentRoleOutput describes an agent role within a team template.
type AgentRoleOutput struct {
	Name         string `json:"name" doc:"Role name (e.g., lead-reviewer)"`
	Role         string `json:"role" doc:"Role type (e.g., leader, reviewer)"`
	Backstory    string `json:"backstory,omitempty" doc:"System prompt / backstory"`
	DefaultModel string `json:"default_model" doc:"Suggested model for this role"`
	IsLeader     bool   `json:"is_leader" doc:"Whether this is the team leader"`
}

// TeamTemplateOutput is the API response for a team template.
type TeamTemplateOutput struct {
	Name        string            `json:"name" doc:"Template name"`
	Description string            `json:"description" doc:"Template description"`
	Agents      []AgentRoleOutput `json:"agents" doc:"Agent roles in the team"`
}

// AgentModelOverride allows overriding the default model for a specific role.
type AgentModelOverride struct {
	RoleName string `json:"role_name" doc:"Role name to override"`
	Model    string `json:"model" doc:"Model to use instead of default"`
}

// CreateTeamInput is the payload for creating a team from a template.
type CreateTeamInput struct {
	TemplateName   string               `json:"template_name" minLength:"1" doc:"Template to use"`
	BoardName      string               `json:"board_name" minLength:"1" maxLength:"255" doc:"Name for the new board"`
	OrganizationID uuid.UUID            `json:"organization_id" format:"uuid" doc:"Organization to create the board in"`
	GatewayID      *uuid.UUID           `json:"gateway_id,omitempty" format:"uuid" doc:"Gateway for agent provisioning"`
	ModelOverrides []AgentModelOverride  `json:"model_overrides,omitempty" doc:"Per-role model overrides"`
}

// CreateTeamOutput is the response after creating a team.
type CreateTeamOutput struct {
	BoardID  uuid.UUID     `json:"board_id" doc:"Created board ID"`
	Agents   []AgentOutput `json:"agents" doc:"Created agents"`
}

// AvailableModelOutput is a model that can be assigned to agents.
type AvailableModelOutput struct {
	Key         string `json:"key" doc:"Model identifier (e.g., anthropic/claude-sonnet-4-6)"`
	Name        string `json:"name" doc:"Human-readable model name"`
	Provider    string `json:"provider" doc:"Provider name"`
	Tier        string `json:"tier" doc:"Cost tier: premium, standard, economy"`
	ContextSize int    `json:"context_size" doc:"Maximum context window size"`
}

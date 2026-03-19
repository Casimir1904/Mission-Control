package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateBoardInput is the payload for creating a board.
type CreateBoardInput struct {
	Name           string     `json:"name" minLength:"1" maxLength:"255" doc:"Board name"`
	Description    string     `json:"description,omitempty" maxLength:"4096" doc:"Board description"`
	MaxAgents      int        `json:"max_agents,omitempty" minimum:"1" doc:"Max agents allowed"`
	OrganizationID uuid.UUID  `json:"organization_id" format:"uuid" doc:"Owning organization"`
	BoardGroupID   *uuid.UUID `json:"board_group_id,omitempty" format:"uuid" doc:"Optional board group"`
}

// UpdateBoardInput is the payload for partially updating a board.
type UpdateBoardInput struct {
	Name        *string `json:"name,omitempty" minLength:"1" maxLength:"255" doc:"Board name"`
	Description *string `json:"description,omitempty" maxLength:"4096" doc:"Board description"`
	MaxAgents   *int    `json:"max_agents,omitempty" minimum:"1" doc:"Max agents allowed"`
}

// BoardOutput is the API response for a board.
type BoardOutput struct {
	ID             uuid.UUID    `json:"id"`
	Name           string       `json:"name"`
	Description    string       `json:"description,omitempty"`
	Status         string       `json:"status"`
	MaxAgents      int          `json:"max_agents"`
	OrganizationID uuid.UUID    `json:"organization_id"`
	BoardGroupID   *uuid.UUID   `json:"board_group_id,omitempty"`
	AgentCount     int          `json:"agent_count,omitempty"`
	TaskCounts     *TaskCounts  `json:"task_counts,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

// TaskCounts holds aggregated task counts by status.
type TaskCounts struct {
	Backlog    int `json:"backlog"`
	Todo       int `json:"todo"`
	InProgress int `json:"in_progress"`
	Review     int `json:"review"`
	Done       int `json:"done"`
	Blocked    int `json:"blocked"`
	Total      int `json:"total"`
}

// ListBoardsOptions extends ListOptions with board-specific filters.
type ListBoardsOptions struct {
	ListOptions
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Status         string     `json:"status,omitempty"`
}

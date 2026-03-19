package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateTaskInput is the payload for creating a task.
type CreateTaskInput struct {
	Title          string     `json:"title" minLength:"1" maxLength:"512" doc:"Task title"`
	Description    string     `json:"description,omitempty" maxLength:"16384" doc:"Task description"`
	Priority       string     `json:"priority,omitempty" enum:"low,medium,high,critical" doc:"Task priority"`
	BoardID        uuid.UUID  `json:"board_id" format:"uuid" doc:"Board this task belongs to"`
	AssignedAgentID *uuid.UUID `json:"assigned_agent_id,omitempty" format:"uuid" doc:"Agent to assign"`
}

// UpdateTaskInput is the payload for partially updating a task.
type UpdateTaskInput struct {
	Title           *string    `json:"title,omitempty" minLength:"1" maxLength:"512" doc:"Task title"`
	Description     *string    `json:"description,omitempty" maxLength:"16384" doc:"Task description"`
	Priority        *string    `json:"priority,omitempty" enum:"low,medium,high,critical" doc:"Task priority"`
	AssignedAgentID *uuid.UUID `json:"assigned_agent_id,omitempty" format:"uuid" doc:"Agent to assign"`
}

// TaskOutput is the API response for a task.
type TaskOutput struct {
	ID              uuid.UUID      `json:"id"`
	Title           string         `json:"title"`
	Description     string         `json:"description,omitempty"`
	Status          string         `json:"status"`
	Priority        string         `json:"priority"`
	BoardID         uuid.UUID      `json:"board_id"`
	AssignedAgentID *uuid.UUID     `json:"assigned_agent_id,omitempty"`
	Dependencies    []uuid.UUID    `json:"dependencies,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// TransitionInput is the payload for transitioning a task status.
type TransitionInput struct {
	Status string `json:"status" doc:"Target status to transition to"`
}

// AddDependencyInput is the payload for adding a task dependency.
type AddDependencyInput struct {
	DependsOnID uuid.UUID `json:"depends_on_id" format:"uuid" doc:"ID of the task this depends on"`
}

// ListTasksOptions extends ListOptions with task-specific filters.
type ListTasksOptions struct {
	ListOptions
	BoardID        *uuid.UUID `json:"board_id,omitempty"`
	Status         string     `json:"status,omitempty"`
	Priority       string     `json:"priority,omitempty"`
	AssignedAgentID *uuid.UUID `json:"assigned_agent_id,omitempty"`
}

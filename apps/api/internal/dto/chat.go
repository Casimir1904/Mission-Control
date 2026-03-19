package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateSessionInput is the payload for creating a chat session.
type CreateSessionInput struct {
	AgentID      uuid.UUID  `json:"agent_id" format:"uuid" doc:"Agent to chat with"`
	TaskID       *uuid.UUID `json:"task_id,omitempty" format:"uuid" doc:"Optional task context"`
	SystemPrompt string     `json:"system_prompt,omitempty" maxLength:"16384" doc:"Optional system prompt override"`
}

// CreateSessionOutput is the response after creating a chat session.
type CreateSessionOutput struct {
	SessionKey string    `json:"session_key"`
	AgentID    uuid.UUID `json:"agent_id"`
	AgentName  string    `json:"agent_name"`
	TaskID     *uuid.UUID `json:"task_id,omitempty"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

// SendMessageInput is the payload for sending a chat message.
type SendMessageInput struct {
	Content string `json:"content" minLength:"1" maxLength:"32768" doc:"Message content"`
}

// ChatMessageOutput is the API response for a chat message.
type ChatMessageOutput struct {
	ID         uuid.UUID      `json:"id"`
	SessionKey string         `json:"session_key"`
	Role       string         `json:"role"`
	Content    string         `json:"content"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	AgentName  string         `json:"agent_name,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

// SessionOutput is the API response for a chat session.
type SessionOutput struct {
	SessionKey   string     `json:"session_key"`
	BoardID      uuid.UUID  `json:"board_id"`
	AgentID      uuid.UUID  `json:"agent_id"`
	AgentName    string     `json:"agent_name"`
	TaskID       *uuid.UUID `json:"task_id,omitempty"`
	Status       string     `json:"status"`
	MessageCount int        `json:"message_count"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// ListSessionsOptions extends ListOptions with session-specific filters.
type ListSessionsOptions struct {
	ListOptions
	BoardID *uuid.UUID `json:"board_id,omitempty"`
	Status  string     `json:"status,omitempty"`
}

// DispatchOutput is the response for a task dispatch operation.
type DispatchOutput struct {
	TaskID     uuid.UUID `json:"task_id"`
	SessionKey string    `json:"session_key"`
	AgentID    uuid.UUID `json:"agent_id"`
	AgentName  string    `json:"agent_name"`
	Status     string    `json:"status"`
}

// DispatchStatusOutput is the response for dispatch status queries.
type DispatchStatusOutput struct {
	TaskID     uuid.UUID  `json:"task_id"`
	SessionKey string     `json:"session_key,omitempty"`
	AgentID    *uuid.UUID `json:"agent_id,omitempty"`
	AgentName  string     `json:"agent_name,omitempty"`
	AgentState string     `json:"agent_state,omitempty"`
	Status     string     `json:"status"`
}

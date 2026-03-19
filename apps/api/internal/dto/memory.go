package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateMemoryInput is the payload for creating a new board memory entry.
type CreateMemoryInput struct {
	Content    string  `json:"content" minLength:"1" doc:"The memory content text" required:"true"`
	Category   string  `json:"category,omitempty" maxLength:"128" doc:"Category for organizing memory entries"`
	Importance float64 `json:"importance,omitempty" minimum:"0" maximum:"1" doc:"Importance score between 0 and 1 (default 0.5)"`
	Scope      string  `json:"scope,omitempty" enum:"agent,board,group" doc:"Visibility scope (default board)"`
}

// UpdateMemoryInput is the payload for updating an existing board memory entry.
type UpdateMemoryInput struct {
	Content    *string  `json:"content,omitempty" minLength:"1" doc:"Updated memory content"`
	Category   *string  `json:"category,omitempty" maxLength:"128" doc:"Updated category"`
	Importance *float64 `json:"importance,omitempty" minimum:"0" maximum:"1" doc:"Updated importance score"`
}

// MemoryOutput is the API response for a board memory entry.
type MemoryOutput struct {
	ID         uuid.UUID `json:"id"`
	BoardID    uuid.UUID `json:"board_id"`
	Content    string    `json:"content"`
	Category   string    `json:"category,omitempty"`
	Importance float64   `json:"importance"`
	Scope      string    `json:"scope"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ListMemoryOptions extends ListOptions with memory-specific filters.
type ListMemoryOptions struct {
	ListOptions
	BoardID     uuid.UUID `json:"board_id"`
	Category    string    `json:"category,omitempty"`
	Scope       string    `json:"scope,omitempty"`
	SearchQuery string    `json:"search_query,omitempty"`
}

package dto

import (
	"time"

	"github.com/google/uuid"
)

// ActivityEventOutput is the API response for an activity event.
type ActivityEventOutput struct {
	ID             uuid.UUID      `json:"id"`
	EventType      string         `json:"event_type"`
	EntityType     string         `json:"entity_type"`
	EntityID       uuid.UUID      `json:"entity_id"`
	Payload        map[string]any `json:"payload,omitempty"`
	OrganizationID uuid.UUID      `json:"organization_id"`
	UserID         *uuid.UUID     `json:"user_id,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
}

// ListActivityOptions extends ListOptions with activity-specific filters.
type ListActivityOptions struct {
	ListOptions
	BoardID    *uuid.UUID `json:"board_id,omitempty"`
	EntityType string     `json:"entity_type,omitempty"`
}

package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateTagInput is the payload for creating a tag.
type CreateTagInput struct {
	Name           string    `json:"name" minLength:"1" maxLength:"128" doc:"Tag name"`
	Color          string    `json:"color,omitempty" maxLength:"32" doc:"Color hex code or CSS name"`
	OrganizationID uuid.UUID `json:"organization_id" format:"uuid" doc:"Organization that owns this tag"`
}

// TagOutput is the API response for a tag.
type TagOutput struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Color          string    `json:"color,omitempty"`
	OrganizationID uuid.UUID `json:"organization_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateOrganizationInput is the payload for creating an organization.
type CreateOrganizationInput struct {
	Name        string `json:"name" minLength:"1" maxLength:"255" doc:"Display name"`
	Slug        string `json:"slug" minLength:"1" maxLength:"128" doc:"URL-friendly identifier"`
	Description string `json:"description,omitempty" maxLength:"2048" doc:"Optional description"`
}

// UpdateOrganizationInput is the payload for partially updating an organization.
type UpdateOrganizationInput struct {
	Name        *string `json:"name,omitempty" minLength:"1" maxLength:"255" doc:"Display name"`
	Description *string `json:"description,omitempty" maxLength:"2048" doc:"Description"`
}

// OrganizationOutput is the API response for an organization.
type OrganizationOutput struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ListOrganizationsOptions extends ListOptions with organization-specific filters.
type ListOrganizationsOptions struct {
	ListOptions
}

// AddMemberInput is the payload for adding a member to an organization.
type AddMemberInput struct {
	UserID uuid.UUID `json:"user_id" format:"uuid" doc:"User ID to add"`
	Role   string    `json:"role" enum:"owner,admin,member" doc:"Role within the organization"`
}

// OrgMemberOutput is the API response for an organization member.
type OrgMemberOutput struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Email     string    `json:"email"`
	Name      string    `json:"display_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

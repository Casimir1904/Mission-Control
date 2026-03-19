package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateDeliverableInput is the payload for creating a deliverable on a task.
type CreateDeliverableInput struct {
	Type     string `json:"type" enum:"file,link,text" doc:"Deliverable type"`
	Name     string `json:"name" minLength:"1" maxLength:"512" doc:"Filename, title, or label"`
	Content  string `json:"content" minLength:"1" doc:"File content, URL, or text output"`
	MimeType string `json:"mime_type,omitempty" maxLength:"255" doc:"MIME type (e.g., text/plain)"`
}

// DeliverableOutput is the API response for a deliverable.
type DeliverableOutput struct {
	ID        uuid.UUID `json:"id"`
	TaskID    uuid.UUID `json:"task_id"`
	Type      string    `json:"type"`
	Name      string    `json:"name"`
	Content   string    `json:"content"`
	MimeType  string    `json:"mime_type,omitempty"`
	SizeBytes *int      `json:"size_bytes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// DeliverableListItem is a compact representation for list endpoints.
// Content is truncated to avoid large payloads in listings.
type DeliverableListItem struct {
	ID             uuid.UUID `json:"id"`
	TaskID         uuid.UUID `json:"task_id"`
	Type           string    `json:"type"`
	Name           string    `json:"name"`
	ContentPreview string    `json:"content_preview,omitempty"`
	MimeType       string    `json:"mime_type,omitempty"`
	SizeBytes      *int      `json:"size_bytes,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

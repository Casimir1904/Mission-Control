package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateApprovalInput is the payload for creating a new approval.
type CreateApprovalInput struct {
	TaskID      uuid.UUID `json:"task_id" format:"uuid" doc:"Task to create an approval for"`
	Description string    `json:"description,omitempty" maxLength:"4096" doc:"Description of what to approve"`
}

// ReviewApprovalInput is the payload for reviewing (approving or rejecting) an approval.
type ReviewApprovalInput struct {
	Status       string             `json:"status" enum:"approved,rejected" doc:"Approval decision"`
	Comment      string             `json:"comment,omitempty" maxLength:"4096" doc:"Reviewer comment"`
	Confidence   *float64           `json:"confidence,omitempty" minimum:"0" maximum:"1" doc:"Confidence score (0-1)"`
	RubricScores map[string]float64 `json:"rubric_scores,omitempty" doc:"Structured rubric scores"`
}

// ApprovalOutput is the API response for an approval.
type ApprovalOutput struct {
	ID           uuid.UUID      `json:"id"`
	TaskID       uuid.UUID      `json:"task_id"`
	Status       string         `json:"status"`
	Confidence   *float64       `json:"confidence,omitempty"`
	RubricScores map[string]any `json:"rubric_scores,omitempty"`
	Comment      string         `json:"comment,omitempty"`
	ReviewerID   *uuid.UUID     `json:"reviewer_id,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// ListApprovalsOptions extends ListOptions with approval-specific filters.
type ListApprovalsOptions struct {
	ListOptions
	BoardID *uuid.UUID `json:"board_id,omitempty"`
	Status  string     `json:"status,omitempty"`
}

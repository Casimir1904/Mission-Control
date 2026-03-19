package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/approval"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// ApprovalService defines the interface for approval operations.
type ApprovalService interface {
	Create(ctx context.Context, input dto.CreateApprovalInput) (*dto.ApprovalOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.ApprovalOutput, error)
	List(ctx context.Context, opts dto.ListApprovalsOptions) (*dto.PaginatedResponse[dto.ApprovalOutput], error)
	Review(ctx context.Context, id uuid.UUID, input dto.ReviewApprovalInput) (*dto.ApprovalOutput, error)
	ListByTask(ctx context.Context, taskID uuid.UUID) ([]dto.ApprovalOutput, error)
	CountPending(ctx context.Context) (int, error)
}

type approvalService struct {
	client  *generated.Client
	bus     *events.Bus
	taskSvc TaskService
}

// NewApprovalService creates a new ApprovalService backed by the Ent client.
func NewApprovalService(client *generated.Client, bus *events.Bus, taskSvc TaskService) ApprovalService {
	return &approvalService{client: client, bus: bus, taskSvc: taskSvc}
}

func (s *approvalService) Create(ctx context.Context, input dto.CreateApprovalInput) (*dto.ApprovalOutput, error) {
	// Verify the task exists and is in "review" status.
	t, err := s.client.Task.Get(ctx, input.TaskID)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("task not found")
		}
		return nil, fmt.Errorf("service.ApprovalService.Create task check: %w", err)
	}

	if t.Status != task.StatusReview {
		return nil, apperror.NewConflict(
			fmt.Sprintf("task must be in 'review' status to create an approval, current status is %q", t.Status),
		)
	}

	builder := s.client.Approval.Create().
		SetTaskID(input.TaskID)

	if input.Description != "" {
		builder.SetComment(input.Description)
	}

	a, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ApprovalService.Create: %w", err)
	}

	slog.Info("approval created", "id", a.ID, "task_id", input.TaskID)

	// Publish NATS event.
	s.publishEvent(ctx, "mc.approval.submitted", map[string]any{
		"approval_id": a.ID.String(),
		"task_id":     input.TaskID.String(),
		"board_id":    t.BoardID.String(),
	})

	return approvalToOutput(a), nil
}

func (s *approvalService) Get(ctx context.Context, id uuid.UUID) (*dto.ApprovalOutput, error) {
	a, err := s.client.Approval.Get(ctx, id)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("approval not found")
		}
		return nil, fmt.Errorf("service.ApprovalService.Get: %w", err)
	}
	return approvalToOutput(a), nil
}

func (s *approvalService) List(ctx context.Context, opts dto.ListApprovalsOptions) (*dto.PaginatedResponse[dto.ApprovalOutput], error) {
	query := s.client.Approval.Query().
		Order(generated.Desc(approval.FieldCreatedAt))

	if opts.BoardID != nil {
		query = query.Where(approval.HasTaskWith(task.BoardID(*opts.BoardID)))
	}
	if opts.Status != "" {
		query = query.Where(approval.StatusEQ(approval.Status(opts.Status)))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ApprovalService.List count: %w", err)
	}

	approvals, err := query.
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ApprovalService.List: %w", err)
	}

	items := make([]dto.ApprovalOutput, len(approvals))
	for i, a := range approvals {
		items[i] = *approvalToOutput(a)
	}

	return &dto.PaginatedResponse[dto.ApprovalOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *approvalService) Review(ctx context.Context, id uuid.UUID, input dto.ReviewApprovalInput) (*dto.ApprovalOutput, error) {
	// Validate the input status.
	if input.Status != "approved" && input.Status != "rejected" {
		return nil, apperror.NewValidation("status must be 'approved' or 'rejected'")
	}

	// Load the existing approval.
	a, err := s.client.Approval.Query().
		Where(approval.ID(id)).
		WithTask().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("approval not found")
		}
		return nil, fmt.Errorf("service.ApprovalService.Review load: %w", err)
	}

	// Verify the approval is still pending.
	if a.Status != approval.StatusPending {
		return nil, apperror.NewConflict(
			fmt.Sprintf("approval has already been reviewed (status: %q)", a.Status),
		)
	}

	// Update the approval.
	builder := s.client.Approval.UpdateOneID(id).
		SetStatus(approval.Status(input.Status))

	if input.Comment != "" {
		builder.SetComment(input.Comment)
	}
	if input.Confidence != nil {
		builder.SetConfidence(*input.Confidence)
	}
	if input.RubricScores != nil {
		// Convert map[string]float64 to map[string]any for the JSON field.
		scores := make(map[string]any, len(input.RubricScores))
		for k, v := range input.RubricScores {
			scores[k] = v
		}
		builder.SetRubricScores(scores)
	}

	updated, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ApprovalService.Review update: %w", err)
	}

	slog.Info("approval reviewed", "id", id, "status", input.Status)

	// Auto-transition the task based on the review decision.
	// This is critical business logic: approved -> "approved", rejected -> "rejected".
	taskEntity := a.Edges.Task
	if taskEntity != nil {
		var targetStatus string
		if input.Status == "approved" {
			targetStatus = "approved"
		} else {
			targetStatus = "rejected"
		}

		_, transErr := s.taskSvc.Transition(ctx, taskEntity.ID, targetStatus)
		if transErr != nil {
			slog.Error("failed to auto-transition task after approval review",
				"task_id", taskEntity.ID,
				"target_status", targetStatus,
				"error", transErr,
			)
			// We don't fail the review if the task transition fails --
			// the approval itself was recorded successfully.
		} else {
			slog.Info("task auto-transitioned after approval",
				"task_id", taskEntity.ID,
				"status", targetStatus,
			)
		}
	}

	// Publish NATS event.
	boardID := ""
	if taskEntity != nil {
		boardID = taskEntity.BoardID.String()
	}
	s.publishEvent(ctx, "mc.approval.reviewed", map[string]any{
		"approval_id": id.String(),
		"task_id":     a.TaskID.String(),
		"board_id":    boardID,
		"status":      input.Status,
	})

	return approvalToOutput(updated), nil
}

func (s *approvalService) ListByTask(ctx context.Context, taskID uuid.UUID) ([]dto.ApprovalOutput, error) {
	approvals, err := s.client.Approval.Query().
		Where(approval.TaskID(taskID)).
		Order(generated.Desc(approval.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ApprovalService.ListByTask: %w", err)
	}

	out := make([]dto.ApprovalOutput, len(approvals))
	for i, a := range approvals {
		out[i] = *approvalToOutput(a)
	}
	return out, nil
}

func (s *approvalService) CountPending(ctx context.Context) (int, error) {
	count, err := s.client.Approval.Query().
		Where(approval.StatusEQ(approval.StatusPending)).
		Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("service.ApprovalService.CountPending: %w", err)
	}
	return count, nil
}

func (s *approvalService) publishEvent(ctx context.Context, subject string, payload map[string]any) {
	if s.bus == nil || !s.bus.IsConnected() {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("failed to marshal approval event", "error", err)
		return
	}

	if err := s.bus.Publish(ctx, subject, data); err != nil {
		slog.Error("failed to publish approval event", "error", err, "subject", subject)
	}
}

func approvalToOutput(a *generated.Approval) *dto.ApprovalOutput {
	out := &dto.ApprovalOutput{
		ID:           a.ID,
		TaskID:       a.TaskID,
		Status:       string(a.Status),
		RubricScores: a.RubricScores,
		Comment:      a.Comment,
		ReviewerID:   a.ReviewerID,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
	}

	// Only set confidence if it was stored (non-zero).
	if a.Confidence != 0 {
		c := a.Confidence
		out.Confidence = &c
	}

	return out
}

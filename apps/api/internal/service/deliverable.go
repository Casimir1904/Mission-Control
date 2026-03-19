package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/deliverable"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
)

// DeliverableService defines the interface for task deliverable operations.
type DeliverableService interface {
	Create(ctx context.Context, taskID uuid.UUID, input dto.CreateDeliverableInput) (*dto.DeliverableOutput, error)
	ListByTask(ctx context.Context, taskID uuid.UUID) ([]dto.DeliverableListItem, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.DeliverableOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type deliverableService struct {
	client *generated.Client
}

// NewDeliverableService creates a new DeliverableService backed by the Ent client.
func NewDeliverableService(client *generated.Client) DeliverableService {
	return &deliverableService{client: client}
}

func (s *deliverableService) Create(ctx context.Context, taskID uuid.UUID, input dto.CreateDeliverableInput) (*dto.DeliverableOutput, error) {
	// Verify the task exists.
	exists, err := s.client.Task.Query().Where(task.ID(taskID)).Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.DeliverableService.Create task check: %w", err)
	}
	if !exists {
		return nil, apperror.NewNotFound("task not found")
	}

	sizeBytes := len([]byte(input.Content))

	builder := s.client.Deliverable.Create().
		SetTaskID(taskID).
		SetType(deliverable.Type(input.Type)).
		SetName(input.Name).
		SetContent(input.Content).
		SetSizeBytes(sizeBytes)

	if input.MimeType != "" {
		builder.SetMimeType(input.MimeType)
	}

	d, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.DeliverableService.Create: %w", err)
	}

	slog.Info("deliverable created", "id", d.ID, "task_id", taskID, "type", input.Type, "name", input.Name)
	return s.toOutput(d), nil
}

func (s *deliverableService) ListByTask(ctx context.Context, taskID uuid.UUID) ([]dto.DeliverableListItem, error) {
	// Verify the task exists.
	exists, err := s.client.Task.Query().Where(task.ID(taskID)).Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.DeliverableService.ListByTask task check: %w", err)
	}
	if !exists {
		return nil, apperror.NewNotFound("task not found")
	}

	deliverables, err := s.client.Deliverable.Query().
		Where(deliverable.TaskID(taskID)).
		Order(generated.Desc(deliverable.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.DeliverableService.ListByTask: %w", err)
	}

	items := make([]dto.DeliverableListItem, len(deliverables))
	for i, d := range deliverables {
		items[i] = s.toListItem(d)
	}

	return items, nil
}

func (s *deliverableService) Get(ctx context.Context, id uuid.UUID) (*dto.DeliverableOutput, error) {
	d, err := s.client.Deliverable.Query().
		Where(deliverable.ID(id)).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("deliverable not found")
		}
		return nil, fmt.Errorf("service.DeliverableService.Get: %w", err)
	}
	return s.toOutput(d), nil
}

func (s *deliverableService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Deliverable.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("deliverable not found")
		}
		return fmt.Errorf("service.DeliverableService.Delete: %w", err)
	}
	slog.Info("deliverable deleted", "id", id)
	return nil
}

func (s *deliverableService) toOutput(d *generated.Deliverable) *dto.DeliverableOutput {
	out := &dto.DeliverableOutput{
		ID:        d.ID,
		TaskID:    d.TaskID,
		Type:      d.Type.String(),
		Name:      d.Name,
		Content:   d.Content,
		MimeType:  d.MimeType,
		SizeBytes: d.SizeBytes,
		CreatedAt: d.CreatedAt,
	}
	return out
}

func (s *deliverableService) toListItem(d *generated.Deliverable) dto.DeliverableListItem {
	preview := d.Content
	if len(preview) > 256 {
		preview = preview[:256] + "..."
	}

	return dto.DeliverableListItem{
		ID:             d.ID,
		TaskID:         d.TaskID,
		Type:           d.Type.String(),
		Name:           d.Name,
		ContentPreview: preview,
		MimeType:       d.MimeType,
		SizeBytes:      d.SizeBytes,
		CreatedAt:      d.CreatedAt,
	}
}

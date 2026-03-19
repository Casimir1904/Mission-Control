package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/activityevent"
)

// ActivityService defines the interface for activity event operations.
type ActivityService interface {
	// Record persists a new activity event.
	Record(ctx context.Context, eventType, entityType string, entityID, orgID uuid.UUID, payload map[string]any) error
	// List returns paginated activity events with optional filters.
	List(ctx context.Context, opts dto.ListActivityOptions) (*dto.PaginatedResponse[dto.ActivityEventOutput], error)
	// ListRecent returns the last N activity events for the dashboard.
	ListRecent(ctx context.Context, limit int) ([]dto.ActivityEventOutput, error)
}

type activityService struct {
	client *generated.Client
}

// NewActivityService creates a new ActivityService backed by the Ent client.
func NewActivityService(client *generated.Client) ActivityService {
	return &activityService{client: client}
}

func (s *activityService) Record(ctx context.Context, eventType, entityType string, entityID, orgID uuid.UUID, payload map[string]any) error {
	_, err := s.client.ActivityEvent.Create().
		SetEventType(eventType).
		SetEntityType(entityType).
		SetEntityID(entityID).
		SetOrganizationID(orgID).
		SetPayload(payload).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("service.ActivityService.Record: %w", err)
	}

	slog.Debug("activity event recorded", "event_type", eventType, "entity_type", entityType, "entity_id", entityID)
	return nil
}

func (s *activityService) List(ctx context.Context, opts dto.ListActivityOptions) (*dto.PaginatedResponse[dto.ActivityEventOutput], error) {
	query := s.client.ActivityEvent.Query().
		Order(generated.Desc(activityevent.FieldCreatedAt))

	if opts.EntityType != "" {
		query = query.Where(activityevent.EntityTypeEQ(opts.EntityType))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ActivityService.List count: %w", err)
	}

	events, err := query.
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ActivityService.List: %w", err)
	}

	items := make([]dto.ActivityEventOutput, len(events))
	for i, e := range events {
		items[i] = activityEventToOutput(e)
	}

	return &dto.PaginatedResponse[dto.ActivityEventOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *activityService) ListRecent(ctx context.Context, limit int) ([]dto.ActivityEventOutput, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	events, err := s.client.ActivityEvent.Query().
		Order(generated.Desc(activityevent.FieldCreatedAt)).
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ActivityService.ListRecent: %w", err)
	}

	out := make([]dto.ActivityEventOutput, len(events))
	for i, e := range events {
		out[i] = activityEventToOutput(e)
	}
	return out, nil
}

func activityEventToOutput(e *generated.ActivityEvent) dto.ActivityEventOutput {
	return dto.ActivityEventOutput{
		ID:             e.ID,
		EventType:      e.EventType,
		EntityType:     e.EntityType,
		EntityID:       e.EntityID,
		Payload:        e.Payload,
		OrganizationID: e.OrganizationID,
		UserID:         e.UserID,
		CreatedAt:      e.CreatedAt,
	}
}

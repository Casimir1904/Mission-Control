package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/tag"
)

// TagService defines the interface for tag operations.
type TagService interface {
	Create(ctx context.Context, input dto.CreateTagInput) (*dto.TagOutput, error)
	List(ctx context.Context, orgID uuid.UUID) ([]dto.TagOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type tagService struct {
	client *generated.Client
}

// NewTagService creates a new TagService backed by the Ent client.
func NewTagService(client *generated.Client) TagService {
	return &tagService{client: client}
}

func (s *tagService) Create(ctx context.Context, input dto.CreateTagInput) (*dto.TagOutput, error) {
	builder := s.client.Tag.Create().
		SetName(input.Name).
		SetOrganizationID(input.OrganizationID)

	if input.Color != "" {
		builder.SetColor(input.Color)
	}

	t, err := builder.Save(ctx)
	if err != nil {
		if generated.IsConstraintError(err) {
			return nil, apperror.NewConflict("tag already exists in this organization")
		}
		return nil, fmt.Errorf("service.TagService.Create: %w", err)
	}

	slog.Info("tag created", "id", t.ID, "name", input.Name)
	return tagToOutput(t), nil
}

func (s *tagService) List(ctx context.Context, orgID uuid.UUID) ([]dto.TagOutput, error) {
	tags, err := s.client.Tag.Query().
		Where(tag.OrganizationID(orgID)).
		Order(generated.Asc(tag.FieldName)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TagService.List: %w", err)
	}

	out := make([]dto.TagOutput, len(tags))
	for i, t := range tags {
		out[i] = *tagToOutput(t)
	}
	return out, nil
}

func (s *tagService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Tag.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("tag not found")
		}
		return fmt.Errorf("service.TagService.Delete: %w", err)
	}
	slog.Info("tag deleted", "id", id)
	return nil
}

func tagToOutput(t *generated.Tag) *dto.TagOutput {
	return &dto.TagOutput{
		ID:             t.ID,
		Name:           t.Name,
		Color:          t.Color,
		OrganizationID: t.OrganizationID,
		CreatedAt:      t.CreatedAt,
		UpdatedAt:      t.UpdatedAt,
	}
}

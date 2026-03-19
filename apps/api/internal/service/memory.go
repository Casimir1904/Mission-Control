package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"entgo.io/ent/dialect/sql"
	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/boardmemory"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/predicate"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// MemoryService defines the interface for board memory operations.
type MemoryService interface {
	Create(ctx context.Context, boardID uuid.UUID, input dto.CreateMemoryInput) (*dto.MemoryOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.MemoryOutput, error)
	List(ctx context.Context, opts dto.ListMemoryOptions) (*dto.PaginatedResponse[dto.MemoryOutput], error)
	Update(ctx context.Context, id uuid.UUID, input dto.UpdateMemoryInput) (*dto.MemoryOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, boardID uuid.UUID, query string) ([]dto.MemoryOutput, error)
}

type memoryService struct {
	client *generated.Client
	bus    *events.Bus
}

// NewMemoryService creates a new MemoryService backed by the Ent client.
func NewMemoryService(client *generated.Client, bus *events.Bus) MemoryService {
	return &memoryService{client: client, bus: bus}
}

func (s *memoryService) Create(ctx context.Context, boardID uuid.UUID, input dto.CreateMemoryInput) (*dto.MemoryOutput, error) {
	// Validate the content field.
	if input.Content == "" {
		return nil, apperror.NewValidation("content is required")
	}

	builder := s.client.BoardMemory.Create().
		SetBoardID(boardID).
		SetContent(input.Content)

	if input.Category != "" {
		builder.SetCategory(input.Category)
	}
	if input.Importance > 0 {
		builder.SetImportance(input.Importance)
	}
	if input.Scope != "" {
		builder.SetScope(boardmemory.Scope(input.Scope))
	}

	m, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.MemoryService.Create: %w", err)
	}

	slog.Info("board memory created", "id", m.ID, "board_id", boardID)

	// Publish NATS event.
	s.publishEvent(ctx, "mc.memory.created", map[string]any{
		"memory_id": m.ID.String(),
		"board_id":  boardID.String(),
	})

	return memoryToOutput(m), nil
}

func (s *memoryService) Get(ctx context.Context, id uuid.UUID) (*dto.MemoryOutput, error) {
	m, err := s.client.BoardMemory.Get(ctx, id)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("memory entry not found")
		}
		return nil, fmt.Errorf("service.MemoryService.Get: %w", err)
	}
	return memoryToOutput(m), nil
}

func (s *memoryService) List(ctx context.Context, opts dto.ListMemoryOptions) (*dto.PaginatedResponse[dto.MemoryOutput], error) {
	query := s.client.BoardMemory.Query().
		Where(boardmemory.BoardID(opts.BoardID)).
		Order(generated.Desc(boardmemory.FieldCreatedAt))

	if opts.Category != "" {
		query = query.Where(boardmemory.CategoryEQ(opts.Category))
	}
	if opts.Scope != "" {
		query = query.Where(boardmemory.ScopeEQ(boardmemory.Scope(opts.Scope)))
	}

	// If a search query is provided, apply PostgreSQL full-text search.
	if opts.SearchQuery != "" {
		query = query.Where(predicate.BoardMemory(func(s *sql.Selector) {
			s.Where(sql.ExprP(
				"to_tsvector('english', content) @@ plainto_tsquery('english', $1)",
				opts.SearchQuery,
			))
		}))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.MemoryService.List count: %w", err)
	}

	memories, err := query.
		Offset(opts.Offset()).
		Limit(opts.Limit()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.MemoryService.List: %w", err)
	}

	items := make([]dto.MemoryOutput, len(memories))
	for i, m := range memories {
		items[i] = *memoryToOutput(m)
	}

	return &dto.PaginatedResponse[dto.MemoryOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *memoryService) Update(ctx context.Context, id uuid.UUID, input dto.UpdateMemoryInput) (*dto.MemoryOutput, error) {
	builder := s.client.BoardMemory.UpdateOneID(id)

	if input.Content != nil {
		if *input.Content == "" {
			return nil, apperror.NewValidation("content cannot be empty")
		}
		builder.SetContent(*input.Content)
	}
	if input.Category != nil {
		builder.SetCategory(*input.Category)
	}
	if input.Importance != nil {
		builder.SetImportance(*input.Importance)
	}

	m, err := builder.Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("memory entry not found")
		}
		return nil, fmt.Errorf("service.MemoryService.Update: %w", err)
	}

	slog.Info("board memory updated", "id", id)

	// Publish NATS event.
	s.publishEvent(ctx, "mc.memory.updated", map[string]any{
		"memory_id": id.String(),
		"board_id":  m.BoardID.String(),
	})

	return memoryToOutput(m), nil
}

func (s *memoryService) Delete(ctx context.Context, id uuid.UUID) error {
	// Fetch first to get board_id for the event.
	m, err := s.client.BoardMemory.Get(ctx, id)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("memory entry not found")
		}
		return fmt.Errorf("service.MemoryService.Delete fetch: %w", err)
	}

	if err := s.client.BoardMemory.DeleteOneID(id).Exec(ctx); err != nil {
		return fmt.Errorf("service.MemoryService.Delete: %w", err)
	}

	slog.Info("board memory deleted", "id", id)

	// Publish NATS event.
	s.publishEvent(ctx, "mc.memory.deleted", map[string]any{
		"memory_id": id.String(),
		"board_id":  m.BoardID.String(),
	})

	return nil
}

func (s *memoryService) Search(ctx context.Context, boardID uuid.UUID, query string) ([]dto.MemoryOutput, error) {
	if query == "" {
		return nil, apperror.NewValidation("search query is required")
	}

	memories, err := s.client.BoardMemory.Query().
		Where(
			boardmemory.BoardID(boardID),
			predicate.BoardMemory(func(sel *sql.Selector) {
				sel.Where(sql.ExprP(
					"to_tsvector('english', content) @@ plainto_tsquery('english', $1)",
					query,
				))
			}),
		).
		Order(generated.Desc(boardmemory.FieldCreatedAt)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.MemoryService.Search: %w", err)
	}

	items := make([]dto.MemoryOutput, len(memories))
	for i, m := range memories {
		items[i] = *memoryToOutput(m)
	}
	return items, nil
}

func (s *memoryService) publishEvent(ctx context.Context, subject string, payload map[string]any) {
	if s.bus == nil || !s.bus.IsConnected() {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("failed to marshal memory event", "error", err)
		return
	}

	if err := s.bus.Publish(ctx, subject, data); err != nil {
		slog.Error("failed to publish memory event", "error", err, "subject", subject)
	}
}

func memoryToOutput(m *generated.BoardMemory) *dto.MemoryOutput {
	return &dto.MemoryOutput{
		ID:         m.ID,
		BoardID:    m.BoardID,
		Content:    m.Content,
		Category:   m.Category,
		Importance: m.Importance,
		Scope:      string(m.Scope),
		CreatedAt:  m.CreatedAt,
		UpdatedAt:  m.UpdatedAt,
	}
}

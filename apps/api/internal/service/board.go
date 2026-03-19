package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/board"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
)

// BoardService defines the interface for board operations.
type BoardService interface {
	Create(ctx context.Context, input dto.CreateBoardInput) (*dto.BoardOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.BoardOutput, error)
	List(ctx context.Context, opts dto.ListBoardsOptions) (*dto.PaginatedResponse[dto.BoardOutput], error)
	Update(ctx context.Context, id uuid.UUID, input dto.UpdateBoardInput) (*dto.BoardOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Archive(ctx context.Context, id uuid.UUID) (*dto.BoardOutput, error)
}

type boardService struct {
	client *generated.Client
}

// NewBoardService creates a new BoardService backed by the Ent client.
func NewBoardService(client *generated.Client) BoardService {
	return &boardService{client: client}
}

func (s *boardService) Create(ctx context.Context, input dto.CreateBoardInput) (*dto.BoardOutput, error) {
	builder := s.client.Board.Create().
		SetName(input.Name).
		SetOrganizationID(input.OrganizationID)

	if input.Description != "" {
		builder.SetDescription(input.Description)
	}
	if input.MaxAgents > 0 {
		builder.SetMaxAgents(input.MaxAgents)
	}
	if input.BoardGroupID != nil {
		builder.SetBoardGroupID(*input.BoardGroupID)
	}
	if input.LeadAgentID != nil {
		builder.SetLeadAgentID(*input.LeadAgentID)
	}
	if input.OrchestrationMode != "" {
		builder.SetOrchestrationMode(board.OrchestrationMode(input.OrchestrationMode))
	}

	b, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.BoardService.Create: %w", err)
	}

	slog.Info("board created", "id", b.ID, "name", input.Name)
	return s.boardToOutput(ctx, b)
}

func (s *boardService) Get(ctx context.Context, id uuid.UUID) (*dto.BoardOutput, error) {
	b, err := s.client.Board.Query().
		Where(board.ID(id)).
		WithAgents().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("board not found")
		}
		return nil, fmt.Errorf("service.BoardService.Get: %w", err)
	}
	return s.boardToOutput(ctx, b)
}

func (s *boardService) List(ctx context.Context, opts dto.ListBoardsOptions) (*dto.PaginatedResponse[dto.BoardOutput], error) {
	query := s.client.Board.Query().
		Order(generated.Desc(board.FieldCreatedAt))

	if opts.OrganizationID != nil {
		query = query.Where(board.OrganizationID(*opts.OrganizationID))
	}
	if opts.Status != "" {
		query = query.Where(board.StatusEQ(board.Status(opts.Status)))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.BoardService.List count: %w", err)
	}

	boards, err := query.
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.BoardService.List: %w", err)
	}

	items := make([]dto.BoardOutput, len(boards))
	for i, b := range boards {
		out, err := s.boardToOutput(ctx, b)
		if err != nil {
			return nil, err
		}
		items[i] = *out
	}

	return &dto.PaginatedResponse[dto.BoardOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *boardService) Update(ctx context.Context, id uuid.UUID, input dto.UpdateBoardInput) (*dto.BoardOutput, error) {
	builder := s.client.Board.UpdateOneID(id)

	if input.Name != nil {
		builder.SetName(*input.Name)
	}
	if input.Description != nil {
		builder.SetDescription(*input.Description)
	}
	if input.MaxAgents != nil {
		builder.SetMaxAgents(*input.MaxAgents)
	}
	if input.LeadAgentID != nil {
		builder.SetLeadAgentID(*input.LeadAgentID)
	}
	if input.OrchestrationMode != nil {
		builder.SetOrchestrationMode(board.OrchestrationMode(*input.OrchestrationMode))
	}

	b, err := builder.Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("board not found")
		}
		return nil, fmt.Errorf("service.BoardService.Update: %w", err)
	}

	slog.Info("board updated", "id", id)
	return s.boardToOutput(ctx, b)
}

func (s *boardService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Board.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("board not found")
		}
		return fmt.Errorf("service.BoardService.Delete: %w", err)
	}
	slog.Info("board deleted", "id", id)
	return nil
}

func (s *boardService) Archive(ctx context.Context, id uuid.UUID) (*dto.BoardOutput, error) {
	b, err := s.client.Board.UpdateOneID(id).
		SetStatus(board.StatusArchived).
		Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("board not found")
		}
		return nil, fmt.Errorf("service.BoardService.Archive: %w", err)
	}

	slog.Info("board archived", "id", id)
	return s.boardToOutput(ctx, b)
}

func (s *boardService) boardToOutput(ctx context.Context, b *generated.Board) (*dto.BoardOutput, error) {
	out := &dto.BoardOutput{
		ID:                b.ID,
		Name:              b.Name,
		Description:       b.Description,
		Status:            string(b.Status),
		MaxAgents:         b.MaxAgents,
		OrganizationID:    b.OrganizationID,
		BoardGroupID:      b.BoardGroupID,
		LeadAgentID:       b.LeadAgentID,
		OrchestrationMode: string(b.OrchestrationMode),
		CreatedAt:         b.CreatedAt,
		UpdatedAt:         b.UpdatedAt,
	}

	// Agent count from eager-loaded edges or a separate query.
	if b.Edges.Agents != nil {
		out.AgentCount = len(b.Edges.Agents)
	} else {
		count, err := b.QueryAgents().Count(ctx)
		if err == nil {
			out.AgentCount = count
		}
	}

	// Aggregate task counts by status.
	counts, err := s.getTaskCounts(ctx, b.ID)
	if err == nil {
		out.TaskCounts = counts
	}

	return out, nil
}

func (s *boardService) getTaskCounts(ctx context.Context, boardID uuid.UUID) (*dto.TaskCounts, error) {
	tc := &dto.TaskCounts{}

	statuses := []task.Status{
		task.StatusBacklog,
		task.StatusTodo,
		task.StatusInProgress,
		task.StatusReview,
		task.StatusDone,
		task.StatusBlocked,
	}

	for _, status := range statuses {
		count, err := s.client.Task.Query().
			Where(task.BoardID(boardID), task.StatusEQ(status)).
			Count(ctx)
		if err != nil {
			return nil, fmt.Errorf("service.BoardService.getTaskCounts: %w", err)
		}

		switch status {
		case task.StatusBacklog:
			tc.Backlog = count
		case task.StatusTodo:
			tc.Todo = count
		case task.StatusInProgress:
			tc.InProgress = count
		case task.StatusReview:
			tc.Review = count
		case task.StatusDone:
			tc.Done = count
		case task.StatusBlocked:
			tc.Blocked = count
		}
		tc.Total += count
	}

	return tc, nil
}

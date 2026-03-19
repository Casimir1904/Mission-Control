package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/agent"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/board"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
)

// AgentService defines the interface for agent operations.
type AgentService interface {
	Create(ctx context.Context, input dto.CreateAgentInput) (*dto.AgentOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.AgentOutput, error)
	List(ctx context.Context, opts dto.ListAgentsOptions) (*dto.PaginatedResponse[dto.AgentOutput], error)
	Update(ctx context.Context, id uuid.UUID, input dto.UpdateAgentInput) (*dto.AgentOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AssignToBoard(ctx context.Context, agentID, boardID uuid.UUID) (*dto.AgentOutput, error)
}

type agentService struct {
	client *generated.Client
}

// NewAgentService creates a new AgentService backed by the Ent client.
func NewAgentService(client *generated.Client) AgentService {
	return &agentService{client: client}
}

func (s *agentService) Create(ctx context.Context, input dto.CreateAgentInput) (*dto.AgentOutput, error) {
	// Validate the board exists and check agent limits.
	b, err := s.client.Board.Get(ctx, input.BoardID)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewValidation("board not found")
		}
		return nil, fmt.Errorf("service.AgentService.Create board check: %w", err)
	}

	agentCount, err := s.client.Agent.Query().
		Where(agent.BoardID(input.BoardID)).
		Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.AgentService.Create count: %w", err)
	}
	if agentCount >= b.MaxAgents {
		return nil, apperror.NewConflict(
			fmt.Sprintf("board has reached max agent limit of %d", b.MaxAgents),
		)
	}

	builder := s.client.Agent.Create().
		SetName(input.Name).
		SetRole(input.Role).
		SetBoardID(input.BoardID)

	if input.Backstory != "" {
		builder.SetBackstory(input.Backstory)
	}
	if input.Goal != "" {
		builder.SetGoal(input.Goal)
	}
	if input.GatewayID != nil {
		builder.SetGatewayID(*input.GatewayID)
	}

	a, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.AgentService.Create: %w", err)
	}

	slog.Info("agent created", "id", a.ID, "board_id", input.BoardID)
	return s.agentToOutput(ctx, a), nil
}

func (s *agentService) Get(ctx context.Context, id uuid.UUID) (*dto.AgentOutput, error) {
	a, err := s.client.Agent.Query().
		Where(agent.ID(id)).
		WithTasks(func(q *generated.TaskQuery) {
			q.Where(task.StatusEQ(task.StatusInProgress)).Limit(1)
		}).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("agent not found")
		}
		return nil, fmt.Errorf("service.AgentService.Get: %w", err)
	}
	return s.agentToOutput(ctx, a), nil
}

func (s *agentService) List(ctx context.Context, opts dto.ListAgentsOptions) (*dto.PaginatedResponse[dto.AgentOutput], error) {
	query := s.client.Agent.Query().
		Order(generated.Desc(agent.FieldCreatedAt))

	if opts.BoardID != nil {
		query = query.Where(agent.BoardID(*opts.BoardID))
	}
	if opts.OrganizationID != nil {
		query = query.Where(agent.HasBoardWith(board.OrganizationID(*opts.OrganizationID)))
	}
	if opts.Status != "" {
		query = query.Where(agent.StatusEQ(agent.Status(opts.Status)))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.AgentService.List count: %w", err)
	}

	agents, err := query.
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.AgentService.List: %w", err)
	}

	items := make([]dto.AgentOutput, len(agents))
	for i, a := range agents {
		items[i] = *s.agentToOutput(ctx, a)
	}

	return &dto.PaginatedResponse[dto.AgentOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *agentService) Update(ctx context.Context, id uuid.UUID, input dto.UpdateAgentInput) (*dto.AgentOutput, error) {
	builder := s.client.Agent.UpdateOneID(id)

	if input.Name != nil {
		builder.SetName(*input.Name)
	}
	if input.Role != nil {
		builder.SetRole(*input.Role)
	}
	if input.Backstory != nil {
		builder.SetBackstory(*input.Backstory)
	}
	if input.Goal != nil {
		builder.SetGoal(*input.Goal)
	}
	if input.Status != nil {
		builder.SetStatus(agent.Status(*input.Status))
	}

	a, err := builder.Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("agent not found")
		}
		return nil, fmt.Errorf("service.AgentService.Update: %w", err)
	}

	slog.Info("agent updated", "id", id)
	return s.agentToOutput(ctx, a), nil
}

func (s *agentService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Agent.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("agent not found")
		}
		return fmt.Errorf("service.AgentService.Delete: %w", err)
	}
	slog.Info("agent deleted", "id", id)
	return nil
}

func (s *agentService) AssignToBoard(ctx context.Context, agentID, boardID uuid.UUID) (*dto.AgentOutput, error) {
	// Verify the target board exists.
	_, err := s.client.Board.Get(ctx, boardID)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("target board not found")
		}
		return nil, fmt.Errorf("service.AgentService.AssignToBoard board check: %w", err)
	}

	a, err := s.client.Agent.UpdateOneID(agentID).
		SetBoardID(boardID).
		Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("agent not found")
		}
		return nil, fmt.Errorf("service.AgentService.AssignToBoard: %w", err)
	}

	slog.Info("agent assigned to board", "agent_id", agentID, "board_id", boardID)
	return s.agentToOutput(ctx, a), nil
}

func (s *agentService) agentToOutput(_ context.Context, a *generated.Agent) *dto.AgentOutput {
	out := &dto.AgentOutput{
		ID:              a.ID,
		Name:            a.Name,
		Role:            a.Role,
		Status:          string(a.Status),
		Backstory:       a.Backstory,
		Goal:            a.Goal,
		BoardID:         a.BoardID,
		GatewayID:       a.GatewayID,
		LastHeartbeatAt: a.LastHeartbeatAt,
		CreatedAt:       a.CreatedAt,
		UpdatedAt:       a.UpdatedAt,
	}

	// If tasks were eager-loaded, show the current in-progress task.
	if a.Edges.Tasks != nil && len(a.Edges.Tasks) > 0 {
		title := a.Edges.Tasks[0].Title
		out.CurrentTask = &title
	}

	return out
}

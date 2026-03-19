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
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// TaskService defines the interface for task operations.
type TaskService interface {
	Create(ctx context.Context, input dto.CreateTaskInput) (*dto.TaskOutput, error)
	Get(ctx context.Context, id uuid.UUID) (*dto.TaskOutput, error)
	List(ctx context.Context, opts dto.ListTasksOptions) (*dto.PaginatedResponse[dto.TaskOutput], error)
	Update(ctx context.Context, id uuid.UUID, input dto.UpdateTaskInput) (*dto.TaskOutput, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Transition(ctx context.Context, id uuid.UUID, newStatus string) (*dto.TaskOutput, error)
	AddDependency(ctx context.Context, taskID, dependsOnID uuid.UUID) error
	RemoveDependency(ctx context.Context, taskID, dependsOnID uuid.UUID) error
}

type taskService struct {
	client *generated.Client
	bus    *events.Bus
}

// NewTaskService creates a new TaskService backed by the Ent client.
func NewTaskService(client *generated.Client, bus *events.Bus) TaskService {
	return &taskService{client: client, bus: bus}
}

func (s *taskService) Create(ctx context.Context, input dto.CreateTaskInput) (*dto.TaskOutput, error) {
	builder := s.client.Task.Create().
		SetTitle(input.Title).
		SetBoardID(input.BoardID)

	if input.Description != "" {
		builder.SetDescription(input.Description)
	}
	if input.Priority != "" {
		builder.SetPriority(task.Priority(input.Priority))
	}
	if input.AssignedAgentID != nil {
		builder.SetAssignedAgentID(*input.AssignedAgentID)
	}

	t, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TaskService.Create: %w", err)
	}

	slog.Info("task created", "id", t.ID, "board_id", input.BoardID)
	return s.taskToOutput(ctx, t)
}

func (s *taskService) Get(ctx context.Context, id uuid.UUID) (*dto.TaskOutput, error) {
	t, err := s.client.Task.Query().
		Where(task.ID(id)).
		WithDependencies().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("task not found")
		}
		return nil, fmt.Errorf("service.TaskService.Get: %w", err)
	}
	return s.taskToOutput(ctx, t)
}

func (s *taskService) List(ctx context.Context, opts dto.ListTasksOptions) (*dto.PaginatedResponse[dto.TaskOutput], error) {
	query := s.client.Task.Query().
		Order(generated.Desc(task.FieldCreatedAt))

	if opts.BoardID != nil {
		query = query.Where(task.BoardID(*opts.BoardID))
	}
	if opts.Status != "" {
		query = query.Where(task.StatusEQ(task.Status(opts.Status)))
	}
	if opts.Priority != "" {
		query = query.Where(task.PriorityEQ(task.Priority(opts.Priority)))
	}
	if opts.AssignedAgentID != nil {
		query = query.Where(task.AssignedAgentID(*opts.AssignedAgentID))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TaskService.List count: %w", err)
	}

	tasks, err := query.
		WithDependencies().
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TaskService.List: %w", err)
	}

	items := make([]dto.TaskOutput, len(tasks))
	for i, t := range tasks {
		out, err := s.taskToOutput(ctx, t)
		if err != nil {
			return nil, err
		}
		items[i] = *out
	}

	return &dto.PaginatedResponse[dto.TaskOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *taskService) Update(ctx context.Context, id uuid.UUID, input dto.UpdateTaskInput) (*dto.TaskOutput, error) {
	builder := s.client.Task.UpdateOneID(id)

	if input.Title != nil {
		builder.SetTitle(*input.Title)
	}
	if input.Description != nil {
		builder.SetDescription(*input.Description)
	}
	if input.Priority != nil {
		builder.SetPriority(task.Priority(*input.Priority))
	}
	if input.AssignedAgentID != nil {
		builder.SetAssignedAgentID(*input.AssignedAgentID)
	}

	t, err := builder.Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("task not found")
		}
		return nil, fmt.Errorf("service.TaskService.Update: %w", err)
	}

	slog.Info("task updated", "id", id)
	return s.taskToOutput(ctx, t)
}

func (s *taskService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Task.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("task not found")
		}
		return fmt.Errorf("service.TaskService.Delete: %w", err)
	}
	slog.Info("task deleted", "id", id)
	return nil
}

func (s *taskService) Transition(ctx context.Context, id uuid.UUID, newStatus string) (*dto.TaskOutput, error) {
	if !IsValidStatus(newStatus) {
		return nil, apperror.NewValidation(fmt.Sprintf("invalid status %q", newStatus))
	}

	// Load the current task with dependencies.
	t, err := s.client.Task.Query().
		Where(task.ID(id)).
		WithDependencies().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("task not found")
		}
		return nil, fmt.Errorf("service.TaskService.Transition load: %w", err)
	}

	from := TaskStatus(t.Status.String())
	to := TaskStatus(newStatus)

	// Validate the state machine transition.
	if appErr := ValidateTransition(from, to); appErr != nil {
		return nil, appErr
	}

	// If transitioning to in_progress, check for unresolved blocking dependencies.
	if to == TaskStatusInProgress {
		if err := s.checkDependenciesResolved(ctx, t); err != nil {
			return nil, err
		}
	}

	// Perform the update.
	updated, err := s.client.Task.UpdateOneID(id).
		SetStatus(task.Status(newStatus)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.TaskService.Transition: %w", err)
	}

	// Publish NATS event.
	s.publishTransitionEvent(ctx, updated, string(from), newStatus)

	slog.Info("task transitioned", "id", id, "from", from, "to", to)
	return s.taskToOutput(ctx, updated)
}

func (s *taskService) AddDependency(ctx context.Context, taskID, dependsOnID uuid.UUID) error {
	if taskID == dependsOnID {
		return apperror.NewValidation("a task cannot depend on itself")
	}

	// Verify both tasks exist.
	exists, err := s.client.Task.Query().Where(task.ID(dependsOnID)).Exist(ctx)
	if err != nil {
		return fmt.Errorf("service.TaskService.AddDependency check: %w", err)
	}
	if !exists {
		return apperror.NewNotFound("dependency task not found")
	}

	_, err = s.client.Task.UpdateOneID(taskID).
		AddDependencyIDs(dependsOnID).
		Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("task not found")
		}
		return fmt.Errorf("service.TaskService.AddDependency: %w", err)
	}

	slog.Info("task dependency added", "task_id", taskID, "depends_on", dependsOnID)
	return nil
}

func (s *taskService) RemoveDependency(ctx context.Context, taskID, dependsOnID uuid.UUID) error {
	_, err := s.client.Task.UpdateOneID(taskID).
		RemoveDependencyIDs(dependsOnID).
		Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("task not found")
		}
		return fmt.Errorf("service.TaskService.RemoveDependency: %w", err)
	}

	slog.Info("task dependency removed", "task_id", taskID, "depends_on", dependsOnID)
	return nil
}

// checkDependenciesResolved verifies no dependency is in a non-terminal status.
func (s *taskService) checkDependenciesResolved(ctx context.Context, t *generated.Task) error {
	deps := t.Edges.Dependencies
	if deps == nil {
		// Reload dependencies if not eagerly loaded.
		var err error
		deps, err = t.QueryDependencies().All(ctx)
		if err != nil {
			return fmt.Errorf("service.TaskService.checkDependenciesResolved: %w", err)
		}
	}

	for _, dep := range deps {
		if dep.Status != task.StatusDone && dep.Status != task.StatusApproved {
			return apperror.NewConflict(
				fmt.Sprintf("cannot move to in_progress: dependency %s is in status %q", dep.ID, dep.Status),
			)
		}
	}
	return nil
}

// publishTransitionEvent publishes a task status transition event to NATS.
func (s *taskService) publishTransitionEvent(ctx context.Context, t *generated.Task, fromStatus, toStatus string) {
	if s.bus == nil || !s.bus.IsConnected() {
		return
	}

	payload := map[string]any{
		"task_id":     t.ID.String(),
		"board_id":    t.BoardID.String(),
		"from_status": fromStatus,
		"to_status":   toStatus,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("failed to marshal transition event", "error", err)
		return
	}

	subject := fmt.Sprintf("mc.task.%s.transition", t.ID.String())
	if err := s.bus.Publish(ctx, subject, data); err != nil {
		slog.Error("failed to publish transition event", "error", err, "subject", subject)
	}
}

func (s *taskService) taskToOutput(_ context.Context, t *generated.Task) (*dto.TaskOutput, error) {
	out := &dto.TaskOutput{
		ID:              t.ID,
		Title:           t.Title,
		Description:     t.Description,
		Status:          t.Status.String(),
		Priority:        t.Priority.String(),
		BoardID:         t.BoardID,
		AssignedAgentID: t.AssignedAgentID,
		CreatedAt:       t.CreatedAt,
		UpdatedAt:       t.UpdatedAt,
	}

	if t.Edges.Dependencies != nil {
		depIDs := make([]uuid.UUID, len(t.Edges.Dependencies))
		for i, dep := range t.Edges.Dependencies {
			depIDs[i] = dep.ID
		}
		out.Dependencies = depIDs
	}

	return out, nil
}

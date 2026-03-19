package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type CreateTaskRequest struct {
	Body dto.CreateTaskInput
}

type CreateTaskResponse struct {
	Body dto.TaskOutput
}

type GetTaskRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Task ID"`
}

type GetTaskResponse struct {
	Body dto.TaskOutput
}

type ListTasksRequest struct {
	PaginationParams
	BoardID         string `query:"board_id" required:"false" doc:"Filter by board (UUID)"`
	Status          string `query:"status" required:"false" enum:"backlog,todo,in_progress,review,approved,rejected,done,blocked" doc:"Filter by status"`
	Priority        string `query:"priority" required:"false" enum:"low,medium,high,critical" doc:"Filter by priority"`
	AssignedAgentID string `query:"assigned_agent_id" required:"false" doc:"Filter by assigned agent (UUID)"`
}

type ListTasksResponse struct {
	Body dto.PaginatedResponse[dto.TaskOutput]
}

type UpdateTaskRequest struct {
	ID   uuid.UUID           `path:"id" format:"uuid" doc:"Task ID"`
	Body dto.UpdateTaskInput
}

type UpdateTaskResponse struct {
	Body dto.TaskOutput
}

type DeleteTaskRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Task ID"`
}

type TransitionTaskRequest struct {
	ID   uuid.UUID          `path:"id" format:"uuid" doc:"Task ID"`
	Body dto.TransitionInput
}

type TransitionTaskResponse struct {
	Body dto.TaskOutput
}

type AddDependencyRequest struct {
	ID   uuid.UUID              `path:"id" format:"uuid" doc:"Task ID"`
	Body dto.AddDependencyInput
}

type RemoveDependencyRequest struct {
	ID    uuid.UUID `path:"id" format:"uuid" doc:"Task ID"`
	DepID uuid.UUID `path:"depId" format:"uuid" doc:"Dependency task ID"`
}

// registerTaskRoutes registers all task endpoints on the Huma API.
func registerTaskRoutes(api huma.API, taskSvc service.TaskService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-task",
		Method:        http.MethodPost,
		Path:          "/tasks",
		Summary:       "Create task",
		Description:   "Creates a new task on a board.",
		Tags:          []string{"tasks"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateTaskRequest) (*CreateTaskResponse, error) {
		slog.Info("creating task", "title", input.Body.Title, "board_id", input.Body.BoardID)
		task, err := taskSvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateTaskResponse{Body: *task}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-task",
		Method:      http.MethodGet,
		Path:        "/tasks/{id}",
		Summary:     "Get task",
		Description: "Retrieves a task by ID with dependencies and approval status.",
		Tags:        []string{"tasks"},
	}, func(ctx context.Context, input *GetTaskRequest) (*GetTaskResponse, error) {
		task, err := taskSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetTaskResponse{Body: *task}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-tasks",
		Method:      http.MethodGet,
		Path:        "/tasks",
		Summary:     "List tasks",
		Description: "Lists tasks with optional filters and pagination.",
		Tags:        []string{"tasks"},
	}, func(ctx context.Context, input *ListTasksRequest) (*ListTasksResponse, error) {
		opts := dto.ListTasksOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			Status:      input.Status,
			Priority:    input.Priority,
		}
		if input.BoardID != "" {
			parsed, err := uuid.Parse(input.BoardID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid board_id: must be a valid UUID")
			}
			opts.BoardID = &parsed
		}
		if input.AssignedAgentID != "" {
			parsed, err := uuid.Parse(input.AssignedAgentID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid assigned_agent_id: must be a valid UUID")
			}
			opts.AssignedAgentID = &parsed
		}
		result, err := taskSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListTasksResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-task",
		Method:      http.MethodPatch,
		Path:        "/tasks/{id}",
		Summary:     "Update task",
		Description: "Partially updates a task.",
		Tags:        []string{"tasks"},
	}, func(ctx context.Context, input *UpdateTaskRequest) (*UpdateTaskResponse, error) {
		slog.Info("updating task", "id", input.ID)
		task, err := taskSvc.Update(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &UpdateTaskResponse{Body: *task}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-task",
		Method:        http.MethodDelete,
		Path:          "/tasks/{id}",
		Summary:       "Delete task",
		Description:   "Deletes a task by ID.",
		Tags:          []string{"tasks"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteTaskRequest) (*struct{}, error) {
		slog.Info("deleting task", "id", input.ID)
		if err := taskSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "transition-task",
		Method:      http.MethodPost,
		Path:        "/tasks/{id}/transition",
		Summary:     "Transition task status",
		Description: "Validates and executes a task status transition per the state machine.",
		Tags:        []string{"tasks"},
	}, func(ctx context.Context, input *TransitionTaskRequest) (*TransitionTaskResponse, error) {
		slog.Info("transitioning task", "id", input.ID, "target", input.Body.Status)
		task, err := taskSvc.Transition(ctx, input.ID, input.Body.Status)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &TransitionTaskResponse{Body: *task}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "add-task-dependency",
		Method:        http.MethodPost,
		Path:          "/tasks/{id}/dependencies",
		Summary:       "Add task dependency",
		Description:   "Adds a dependency between two tasks.",
		Tags:          []string{"tasks"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *AddDependencyRequest) (*struct{}, error) {
		slog.Info("adding task dependency", "task_id", input.ID, "depends_on", input.Body.DependsOnID)
		if err := taskSvc.AddDependency(ctx, input.ID, input.Body.DependsOnID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "remove-task-dependency",
		Method:        http.MethodDelete,
		Path:          "/tasks/{id}/dependencies/{depId}",
		Summary:       "Remove task dependency",
		Description:   "Removes a dependency between two tasks.",
		Tags:          []string{"tasks"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *RemoveDependencyRequest) (*struct{}, error) {
		slog.Info("removing task dependency", "task_id", input.ID, "dep_id", input.DepID)
		if err := taskSvc.RemoveDependency(ctx, input.ID, input.DepID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

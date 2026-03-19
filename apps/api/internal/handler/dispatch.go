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

type DispatchTaskRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Task ID"`
}

type DispatchTaskResponse struct {
	Body dto.DispatchOutput
}

type GetDispatchStatusRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Task ID"`
}

type GetDispatchStatusResponse struct {
	Body dto.DispatchStatusOutput
}

// registerDispatchRoutes registers task dispatch endpoints on the Huma API.
func registerDispatchRoutes(api huma.API, dispatchSvc service.DispatchService) {
	huma.Register(api, huma.Operation{
		OperationID: "dispatch-task",
		Method:      http.MethodPost,
		Path:        "/tasks/{id}/dispatch",
		Summary:     "Dispatch task to agent",
		Description: "Manually dispatches a task to its assigned agent. Creates a chat session with a task-specific system prompt and sends the initial message to start the agent working.",
		Tags:        []string{"dispatch"},
	}, func(ctx context.Context, input *DispatchTaskRequest) (*DispatchTaskResponse, error) {
		slog.Info("dispatching task", "task_id", input.ID)
		result, err := dispatchSvc.DispatchTask(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &DispatchTaskResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-dispatch-status",
		Method:      http.MethodGet,
		Path:        "/tasks/{id}/dispatch",
		Summary:     "Get dispatch status",
		Description: "Returns the dispatch status for a task, including the active session key and agent state.",
		Tags:        []string{"dispatch"},
	}, func(ctx context.Context, input *GetDispatchStatusRequest) (*GetDispatchStatusResponse, error) {
		result, err := dispatchSvc.GetDispatchStatus(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetDispatchStatusResponse{Body: *result}, nil
	})
}

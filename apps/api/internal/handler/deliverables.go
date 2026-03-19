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

type CreateDeliverableRequest struct {
	TaskID uuid.UUID                  `path:"taskId" format:"uuid" doc:"Task ID"`
	Body   dto.CreateDeliverableInput
}

type CreateDeliverableResponse struct {
	Body dto.DeliverableOutput
}

type ListDeliverablesRequest struct {
	TaskID uuid.UUID `path:"taskId" format:"uuid" doc:"Task ID"`
}

type ListDeliverablesResponse struct {
	Body []dto.DeliverableListItem
}

type GetDeliverableRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Deliverable ID"`
}

type GetDeliverableResponse struct {
	Body dto.DeliverableOutput
}

type DeleteDeliverableRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Deliverable ID"`
}

// registerDeliverableRoutes registers all deliverable endpoints on the Huma API.
func registerDeliverableRoutes(api huma.API, deliverableSvc service.DeliverableService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-deliverable",
		Method:        http.MethodPost,
		Path:          "/tasks/{taskId}/deliverables",
		Summary:       "Create deliverable",
		Description:   "Creates a new deliverable (file, link, or text) on a task.",
		Tags:          []string{"deliverables"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateDeliverableRequest) (*CreateDeliverableResponse, error) {
		slog.Info("creating deliverable", "task_id", input.TaskID, "type", input.Body.Type, "name", input.Body.Name)
		deliverable, err := deliverableSvc.Create(ctx, input.TaskID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateDeliverableResponse{Body: *deliverable}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-deliverables",
		Method:      http.MethodGet,
		Path:        "/tasks/{taskId}/deliverables",
		Summary:     "List deliverables",
		Description: "Lists all deliverables for a task with truncated content previews.",
		Tags:        []string{"deliverables"},
	}, func(ctx context.Context, input *ListDeliverablesRequest) (*ListDeliverablesResponse, error) {
		items, err := deliverableSvc.ListByTask(ctx, input.TaskID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListDeliverablesResponse{Body: items}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-deliverable",
		Method:      http.MethodGet,
		Path:        "/deliverables/{id}",
		Summary:     "Get deliverable",
		Description: "Retrieves full deliverable content by ID.",
		Tags:        []string{"deliverables"},
	}, func(ctx context.Context, input *GetDeliverableRequest) (*GetDeliverableResponse, error) {
		deliverable, err := deliverableSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetDeliverableResponse{Body: *deliverable}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-deliverable",
		Method:        http.MethodDelete,
		Path:          "/deliverables/{id}",
		Summary:       "Delete deliverable",
		Description:   "Deletes a deliverable by ID.",
		Tags:          []string{"deliverables"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteDeliverableRequest) (*struct{}, error) {
		slog.Info("deleting deliverable", "id", input.ID)
		if err := deliverableSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

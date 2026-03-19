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

type CreateMemoryRequest struct {
	BoardID uuid.UUID          `path:"boardId" format:"uuid" doc:"Board ID"`
	Body    dto.CreateMemoryInput
}

type CreateMemoryResponse struct {
	Body dto.MemoryOutput
}

type GetMemoryRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Memory entry ID"`
}

type GetMemoryResponse struct {
	Body dto.MemoryOutput
}

type ListMemoryRequest struct {
	PaginationParams
	BoardID  uuid.UUID `path:"boardId" format:"uuid" doc:"Board ID"`
	Category string    `query:"category" required:"false" doc:"Filter by category"`
	Scope    string    `query:"scope" required:"false" enum:"agent,board,group" doc:"Filter by scope"`
	Search   string    `query:"search" required:"false" doc:"Full-text search query"`
}

type ListMemoryResponse struct {
	Body dto.PaginatedResponse[dto.MemoryOutput]
}

type UpdateMemoryRequest struct {
	ID   uuid.UUID            `path:"id" format:"uuid" doc:"Memory entry ID"`
	Body dto.UpdateMemoryInput
}

type UpdateMemoryResponse struct {
	Body dto.MemoryOutput
}

type DeleteMemoryRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Memory entry ID"`
}

// registerMemoryRoutes registers all board memory endpoints on the Huma API.
func registerMemoryRoutes(api huma.API, memorySvc service.MemoryService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-memory",
		Method:        http.MethodPost,
		Path:          "/boards/{boardId}/memory",
		Summary:       "Create memory entry",
		Description:   "Creates a new memory entry for a board.",
		Tags:          []string{"memory"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateMemoryRequest) (*CreateMemoryResponse, error) {
		slog.Info("creating board memory", "board_id", input.BoardID)
		mem, err := memorySvc.Create(ctx, input.BoardID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateMemoryResponse{Body: *mem}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-memory",
		Method:      http.MethodGet,
		Path:        "/boards/{boardId}/memory",
		Summary:     "List memory entries",
		Description: "Lists memory entries for a board with optional filters, search, and pagination.",
		Tags:        []string{"memory"},
	}, func(ctx context.Context, input *ListMemoryRequest) (*ListMemoryResponse, error) {
		opts := dto.ListMemoryOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			BoardID:     input.BoardID,
			Category:    input.Category,
			Scope:       input.Scope,
			SearchQuery: input.Search,
		}
		result, err := memorySvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListMemoryResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-memory",
		Method:      http.MethodGet,
		Path:        "/memory/{id}",
		Summary:     "Get memory entry",
		Description: "Retrieves a memory entry by ID.",
		Tags:        []string{"memory"},
	}, func(ctx context.Context, input *GetMemoryRequest) (*GetMemoryResponse, error) {
		mem, err := memorySvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetMemoryResponse{Body: *mem}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-memory",
		Method:      http.MethodPatch,
		Path:        "/memory/{id}",
		Summary:     "Update memory entry",
		Description: "Updates a memory entry's content, category, or importance.",
		Tags:        []string{"memory"},
	}, func(ctx context.Context, input *UpdateMemoryRequest) (*UpdateMemoryResponse, error) {
		slog.Info("updating board memory", "id", input.ID)
		mem, err := memorySvc.Update(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &UpdateMemoryResponse{Body: *mem}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-memory",
		Method:        http.MethodDelete,
		Path:          "/memory/{id}",
		Summary:       "Delete memory entry",
		Description:   "Deletes a memory entry by ID.",
		Tags:          []string{"memory"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteMemoryRequest) (*struct{}, error) {
		slog.Info("deleting board memory", "id", input.ID)
		if err := memorySvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

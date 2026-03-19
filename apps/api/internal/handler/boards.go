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

type CreateBoardRequest struct {
	Body dto.CreateBoardInput
}

type CreateBoardResponse struct {
	Body dto.BoardOutput
}

type GetBoardRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Board ID"`
}

type GetBoardResponse struct {
	Body dto.BoardOutput
}

type ListBoardsRequest struct {
	PaginationParams
	OrganizationID string `query:"organization_id" required:"false" doc:"Filter by organization (UUID)"`
	Status         string `query:"status" required:"false" enum:"active,archived" doc:"Filter by status"`
}

type ListBoardsResponse struct {
	Body dto.PaginatedResponse[dto.BoardOutput]
}

type UpdateBoardRequest struct {
	ID   uuid.UUID            `path:"id" format:"uuid" doc:"Board ID"`
	Body dto.UpdateBoardInput
}

type UpdateBoardResponse struct {
	Body dto.BoardOutput
}

type DeleteBoardRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Board ID"`
}

type ArchiveBoardRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Board ID"`
}

type ArchiveBoardResponse struct {
	Body dto.BoardOutput
}

// registerBoardRoutes registers all board endpoints on the Huma API.
func registerBoardRoutes(api huma.API, boardSvc service.BoardService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-board",
		Method:        http.MethodPost,
		Path:          "/boards",
		Summary:       "Create board",
		Description:   "Creates a new board within an organization.",
		Tags:          []string{"boards"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateBoardRequest) (*CreateBoardResponse, error) {
		slog.Info("creating board", "name", input.Body.Name)
		board, err := boardSvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateBoardResponse{Body: *board}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-board",
		Method:      http.MethodGet,
		Path:        "/boards/{id}",
		Summary:     "Get board",
		Description: "Retrieves a board by ID with agent count and task counts.",
		Tags:        []string{"boards"},
	}, func(ctx context.Context, input *GetBoardRequest) (*GetBoardResponse, error) {
		board, err := boardSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetBoardResponse{Body: *board}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-boards",
		Method:      http.MethodGet,
		Path:        "/boards",
		Summary:     "List boards",
		Description: "Lists boards with optional filters and pagination.",
		Tags:        []string{"boards"},
	}, func(ctx context.Context, input *ListBoardsRequest) (*ListBoardsResponse, error) {
		opts := dto.ListBoardsOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			Status:      input.Status,
		}
		if input.OrganizationID != "" {
			parsed, err := uuid.Parse(input.OrganizationID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid organization_id: must be a valid UUID")
			}
			opts.OrganizationID = &parsed
		}
		result, err := boardSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListBoardsResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-board",
		Method:      http.MethodPatch,
		Path:        "/boards/{id}",
		Summary:     "Update board",
		Description: "Partially updates a board.",
		Tags:        []string{"boards"},
	}, func(ctx context.Context, input *UpdateBoardRequest) (*UpdateBoardResponse, error) {
		slog.Info("updating board", "id", input.ID)
		board, err := boardSvc.Update(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &UpdateBoardResponse{Body: *board}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-board",
		Method:        http.MethodDelete,
		Path:          "/boards/{id}",
		Summary:       "Delete board",
		Description:   "Deletes a board by ID.",
		Tags:          []string{"boards"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteBoardRequest) (*struct{}, error) {
		slog.Info("deleting board", "id", input.ID)
		if err := boardSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "archive-board",
		Method:      http.MethodPost,
		Path:        "/boards/{id}/archive",
		Summary:     "Archive board",
		Description: "Sets the board status to archived.",
		Tags:        []string{"boards"},
	}, func(ctx context.Context, input *ArchiveBoardRequest) (*ArchiveBoardResponse, error) {
		slog.Info("archiving board", "id", input.ID)
		board, err := boardSvc.Archive(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ArchiveBoardResponse{Body: *board}, nil
	})
}

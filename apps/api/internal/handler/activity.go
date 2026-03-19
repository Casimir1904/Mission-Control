package handler

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type ListActivityRequest struct {
	PaginationParams
	BoardID    string `query:"board_id" required:"false" doc:"Filter by board (UUID)"`
	EntityType string `query:"entity_type" required:"false" doc:"Filter by entity type (e.g., task, agent, approval)"`
}

type ListActivityResponse struct {
	Body dto.PaginatedResponse[dto.ActivityEventOutput]
}

// registerActivityRoutes registers all activity endpoints on the Huma API.
func registerActivityRoutes(api huma.API, activitySvc service.ActivityService) {
	huma.Register(api, huma.Operation{
		OperationID: "list-activity",
		Method:      http.MethodGet,
		Path:        "/activity",
		Summary:     "List activity events",
		Description: "Lists activity events with optional filters and pagination.",
		Tags:        []string{"activity"},
	}, func(ctx context.Context, input *ListActivityRequest) (*ListActivityResponse, error) {
		opts := dto.ListActivityOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			EntityType:  input.EntityType,
		}
		if input.BoardID != "" {
			parsed, err := uuid.Parse(input.BoardID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid board_id: must be a valid UUID")
			}
			opts.BoardID = &parsed
		}
		result, err := activitySvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListActivityResponse{Body: *result}, nil
	})
}

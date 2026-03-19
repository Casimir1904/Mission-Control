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

type CreateTagRequest struct {
	Body dto.CreateTagInput
}

type CreateTagResponse struct {
	Body dto.TagOutput
}

type ListTagsRequest struct {
	OrganizationID string `query:"organization_id" doc:"Organization to list tags for (UUID)"`
}

type ListTagsResponse struct {
	Body []dto.TagOutput
}

type DeleteTagRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Tag ID"`
}

// registerTagRoutes registers all tag endpoints on the Huma API.
func registerTagRoutes(api huma.API, tagSvc service.TagService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-tag",
		Method:        http.MethodPost,
		Path:          "/tags",
		Summary:       "Create tag",
		Description:   "Creates a new tag within an organization.",
		Tags:          []string{"tags"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateTagRequest) (*CreateTagResponse, error) {
		slog.Info("creating tag", "name", input.Body.Name)
		tag, err := tagSvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateTagResponse{Body: *tag}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-tags",
		Method:      http.MethodGet,
		Path:        "/tags",
		Summary:     "List tags",
		Description: "Lists all tags in the specified organization.",
		Tags:        []string{"tags"},
	}, func(ctx context.Context, input *ListTagsRequest) (*ListTagsResponse, error) {
		orgID, err := uuid.Parse(input.OrganizationID)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid organization_id: must be a valid UUID")
		}
		tags, err := tagSvc.List(ctx, orgID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListTagsResponse{Body: tags}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-tag",
		Method:        http.MethodDelete,
		Path:          "/tags/{id}",
		Summary:       "Delete tag",
		Description:   "Deletes a tag by ID.",
		Tags:          []string{"tags"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteTagRequest) (*struct{}, error) {
		slog.Info("deleting tag", "id", input.ID)
		if err := tagSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

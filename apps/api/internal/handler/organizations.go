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

type CreateOrgRequest struct {
	Body dto.CreateOrganizationInput
}

type CreateOrgResponse struct {
	Body dto.OrganizationOutput
}

type GetOrgRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Organization ID"`
}

type GetOrgResponse struct {
	Body dto.OrganizationOutput
}

type ListOrgsRequest struct {
	PaginationParams
}

type ListOrgsResponse struct {
	Body dto.PaginatedResponse[dto.OrganizationOutput]
}

type UpdateOrgRequest struct {
	ID   uuid.UUID                    `path:"id" format:"uuid" doc:"Organization ID"`
	Body dto.UpdateOrganizationInput
}

type UpdateOrgResponse struct {
	Body dto.OrganizationOutput
}

type DeleteOrgRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Organization ID"`
}

type AddMemberRequest struct {
	ID   uuid.UUID          `path:"id" format:"uuid" doc:"Organization ID"`
	Body dto.AddMemberInput
}

type AddMemberResponse struct {
	Body dto.OrgMemberOutput
}

type ListMembersRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Organization ID"`
}

type ListMembersResponse struct {
	Body []dto.OrgMemberOutput
}

type RemoveMemberRequest struct {
	ID     uuid.UUID `path:"id" format:"uuid" doc:"Organization ID"`
	UserID uuid.UUID `path:"userId" format:"uuid" doc:"User ID to remove"`
}

// registerOrganizationRoutes registers all organization endpoints on the Huma API.
func registerOrganizationRoutes(api huma.API, orgSvc service.OrgService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-organization",
		Method:        http.MethodPost,
		Path:          "/organizations",
		Summary:       "Create organization",
		Description:   "Creates a new organization.",
		Tags:          []string{"organizations"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateOrgRequest) (*CreateOrgResponse, error) {
		slog.Info("creating organization", "name", input.Body.Name)
		org, err := orgSvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateOrgResponse{Body: *org}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-organization",
		Method:      http.MethodGet,
		Path:        "/organizations/{id}",
		Summary:     "Get organization",
		Description: "Retrieves an organization by ID.",
		Tags:        []string{"organizations"},
	}, func(ctx context.Context, input *GetOrgRequest) (*GetOrgResponse, error) {
		org, err := orgSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetOrgResponse{Body: *org}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-organizations",
		Method:      http.MethodGet,
		Path:        "/organizations",
		Summary:     "List organizations",
		Description: "Lists all organizations with pagination.",
		Tags:        []string{"organizations"},
	}, func(ctx context.Context, input *ListOrgsRequest) (*ListOrgsResponse, error) {
		opts := dto.ListOrganizationsOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
		}
		result, err := orgSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListOrgsResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-organization",
		Method:      http.MethodPatch,
		Path:        "/organizations/{id}",
		Summary:     "Update organization",
		Description: "Partially updates an organization.",
		Tags:        []string{"organizations"},
	}, func(ctx context.Context, input *UpdateOrgRequest) (*UpdateOrgResponse, error) {
		slog.Info("updating organization", "id", input.ID)
		org, err := orgSvc.Update(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &UpdateOrgResponse{Body: *org}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-organization",
		Method:        http.MethodDelete,
		Path:          "/organizations/{id}",
		Summary:       "Delete organization",
		Description:   "Deletes an organization by ID.",
		Tags:          []string{"organizations"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteOrgRequest) (*struct{}, error) {
		slog.Info("deleting organization", "id", input.ID)
		if err := orgSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-org-members",
		Method:      http.MethodGet,
		Path:        "/organizations/{id}/members",
		Summary:     "List organization members",
		Description: "Lists all members of an organization.",
		Tags:        []string{"organizations"},
	}, func(ctx context.Context, input *ListMembersRequest) (*ListMembersResponse, error) {
		members, err := orgSvc.ListMembers(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListMembersResponse{Body: members}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "add-org-member",
		Method:        http.MethodPost,
		Path:          "/organizations/{id}/members",
		Summary:       "Add organization member",
		Description:   "Adds a user as a member of the organization.",
		Tags:          []string{"organizations"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *AddMemberRequest) (*AddMemberResponse, error) {
		slog.Info("adding org member", "org_id", input.ID, "user_id", input.Body.UserID)
		member, err := orgSvc.AddMember(ctx, input.ID, input.Body.UserID, input.Body.Role)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &AddMemberResponse{Body: *member}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "remove-org-member",
		Method:        http.MethodDelete,
		Path:          "/organizations/{id}/members/{userId}",
		Summary:       "Remove organization member",
		Description:   "Removes a user from the organization.",
		Tags:          []string{"organizations"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *RemoveMemberRequest) (*struct{}, error) {
		slog.Info("removing org member", "org_id", input.ID, "user_id", input.UserID)
		if err := orgSvc.RemoveMember(ctx, input.ID, input.UserID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

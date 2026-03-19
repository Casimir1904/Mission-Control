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

type CreateApprovalRequest struct {
	Body dto.CreateApprovalInput
}

type CreateApprovalResponse struct {
	Body dto.ApprovalOutput
}

type GetApprovalRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Approval ID"`
}

type GetApprovalResponse struct {
	Body dto.ApprovalOutput
}

type ListApprovalsRequest struct {
	PaginationParams
	BoardID string `query:"board_id" required:"false" doc:"Filter by board (UUID)"`
	Status  string `query:"status" required:"false" enum:"pending,approved,rejected" doc:"Filter by status"`
}

type ListApprovalsResponse struct {
	Body dto.PaginatedResponse[dto.ApprovalOutput]
}

type ReviewApprovalRequest struct {
	ID   uuid.UUID                `path:"id" format:"uuid" doc:"Approval ID"`
	Body dto.ReviewApprovalInput
}

type ReviewApprovalResponse struct {
	Body dto.ApprovalOutput
}

// registerApprovalRoutes registers all approval endpoints on the Huma API.
func registerApprovalRoutes(api huma.API, approvalSvc service.ApprovalService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-approval",
		Method:        http.MethodPost,
		Path:          "/approvals",
		Summary:       "Create approval",
		Description:   "Creates a new approval for a task in review status.",
		Tags:          []string{"approvals"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateApprovalRequest) (*CreateApprovalResponse, error) {
		slog.Info("creating approval", "task_id", input.Body.TaskID)
		approval, err := approvalSvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateApprovalResponse{Body: *approval}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-approval",
		Method:      http.MethodGet,
		Path:        "/approvals/{id}",
		Summary:     "Get approval",
		Description: "Retrieves an approval by ID.",
		Tags:        []string{"approvals"},
	}, func(ctx context.Context, input *GetApprovalRequest) (*GetApprovalResponse, error) {
		approval, err := approvalSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetApprovalResponse{Body: *approval}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-approvals",
		Method:      http.MethodGet,
		Path:        "/approvals",
		Summary:     "List approvals",
		Description: "Lists approvals with optional filters and pagination.",
		Tags:        []string{"approvals"},
	}, func(ctx context.Context, input *ListApprovalsRequest) (*ListApprovalsResponse, error) {
		opts := dto.ListApprovalsOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			Status:      input.Status,
		}
		if input.BoardID != "" {
			parsed, err := uuid.Parse(input.BoardID)
			if err != nil {
				return nil, huma.Error400BadRequest("invalid board_id: must be a valid UUID")
			}
			opts.BoardID = &parsed
		}
		result, err := approvalSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListApprovalsResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "review-approval",
		Method:      http.MethodPost,
		Path:        "/approvals/{id}/review",
		Summary:     "Review approval",
		Description: "Approve or reject an approval. Automatically transitions the associated task.",
		Tags:        []string{"approvals"},
	}, func(ctx context.Context, input *ReviewApprovalRequest) (*ReviewApprovalResponse, error) {
		slog.Info("reviewing approval", "id", input.ID, "status", input.Body.Status)
		approval, err := approvalSvc.Review(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ReviewApprovalResponse{Body: *approval}, nil
	})
}

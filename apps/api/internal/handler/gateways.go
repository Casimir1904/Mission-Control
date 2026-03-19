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

type CreateGatewayRequest struct {
	Body dto.CreateGatewayInput
}

type CreateGatewayResponse struct {
	Body dto.GatewayOutput
}

type GetGatewayRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Gateway ID"`
}

type GetGatewayResponse struct {
	Body dto.GatewayOutput
}

type ListGatewaysRequest struct {
	PaginationParams
	OrganizationID string `query:"organization_id" required:"false" doc:"Filter by organization (UUID)"`
	Status         string `query:"status" required:"false" enum:"connected,disconnected" doc:"Filter by status"`
}

type ListGatewaysResponse struct {
	Body dto.PaginatedResponse[dto.GatewayOutput]
}

type UpdateGatewayRequest struct {
	ID   uuid.UUID             `path:"id" format:"uuid" doc:"Gateway ID"`
	Body dto.UpdateGatewayInput
}

type UpdateGatewayResponse struct {
	Body dto.GatewayOutput
}

type DeleteGatewayRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Gateway ID"`
}

type TestGatewayRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Gateway ID"`
}

type TestGatewayResponse struct {
	Body dto.TestConnectionOutput
}

type SyncGatewayRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Gateway ID"`
}

type SyncGatewayResponse struct {
	Body dto.SyncOutput
}

// registerGatewayRoutes registers all gateway endpoints on the Huma API.
func registerGatewayRoutes(api huma.API, gatewaySvc service.GatewayService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-gateway",
		Method:        http.MethodPost,
		Path:          "/gateways",
		Summary:       "Create gateway",
		Description:   "Creates a new OpenClaw gateway connection.",
		Tags:          []string{"gateways"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateGatewayRequest) (*CreateGatewayResponse, error) {
		slog.Info("creating gateway", "name", input.Body.Name)
		gw, err := gatewaySvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateGatewayResponse{Body: *gw}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-gateway",
		Method:      http.MethodGet,
		Path:        "/gateways/{id}",
		Summary:     "Get gateway",
		Description: "Retrieves a gateway by ID with agent count.",
		Tags:        []string{"gateways"},
	}, func(ctx context.Context, input *GetGatewayRequest) (*GetGatewayResponse, error) {
		gw, err := gatewaySvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetGatewayResponse{Body: *gw}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-gateways",
		Method:      http.MethodGet,
		Path:        "/gateways",
		Summary:     "List gateways",
		Description: "Lists gateways with optional filters and pagination.",
		Tags:        []string{"gateways"},
	}, func(ctx context.Context, input *ListGatewaysRequest) (*ListGatewaysResponse, error) {
		opts := dto.ListGatewaysOptions{
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
		result, err := gatewaySvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListGatewaysResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-gateway",
		Method:      http.MethodPatch,
		Path:        "/gateways/{id}",
		Summary:     "Update gateway",
		Description: "Partially updates a gateway.",
		Tags:        []string{"gateways"},
	}, func(ctx context.Context, input *UpdateGatewayRequest) (*UpdateGatewayResponse, error) {
		slog.Info("updating gateway", "id", input.ID)
		gw, err := gatewaySvc.Update(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &UpdateGatewayResponse{Body: *gw}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-gateway",
		Method:        http.MethodDelete,
		Path:          "/gateways/{id}",
		Summary:       "Delete gateway",
		Description:   "Deletes a gateway by ID and disconnects any active connection.",
		Tags:          []string{"gateways"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteGatewayRequest) (*struct{}, error) {
		slog.Info("deleting gateway", "id", input.ID)
		if err := gatewaySvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "test-gateway",
		Method:      http.MethodPost,
		Path:        "/gateways/{id}/test",
		Summary:     "Test gateway connection",
		Description: "Tests the connection to a gateway by performing a WebSocket handshake and health check.",
		Tags:        []string{"gateways"},
	}, func(ctx context.Context, input *TestGatewayRequest) (*TestGatewayResponse, error) {
		slog.Info("testing gateway connection", "id", input.ID)
		result, err := gatewaySvc.TestConnection(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &TestGatewayResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "sync-gateway",
		Method:      http.MethodPost,
		Path:        "/gateways/{id}/sync",
		Summary:     "Sync gateway agents",
		Description: "Triggers an agent sync from the OpenClaw gateway into Mission Control.",
		Tags:        []string{"gateways"},
	}, func(ctx context.Context, input *SyncGatewayRequest) (*SyncGatewayResponse, error) {
		slog.Info("syncing gateway agents", "id", input.ID)
		result, err := gatewaySvc.Sync(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &SyncGatewayResponse{Body: *result}, nil
	})
}

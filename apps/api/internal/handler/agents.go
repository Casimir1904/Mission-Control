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

type CreateAgentRequest struct {
	Body dto.CreateAgentInput
}

type CreateAgentResponse struct {
	Body dto.AgentOutput
}

type GetAgentRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Agent ID"`
}

type GetAgentResponse struct {
	Body dto.AgentOutput
}

type ListAgentsRequest struct {
	PaginationParams
	BoardID string `query:"board_id" required:"false" doc:"Filter by board (UUID)"`
	Status  string `query:"status" required:"false" enum:"online,offline,degraded,provisioning" doc:"Filter by status"`
}

type ListAgentsResponse struct {
	Body dto.PaginatedResponse[dto.AgentOutput]
}

type UpdateAgentRequest struct {
	ID   uuid.UUID            `path:"id" format:"uuid" doc:"Agent ID"`
	Body dto.UpdateAgentInput
}

type UpdateAgentResponse struct {
	Body dto.AgentOutput
}

type DeleteAgentRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Agent ID"`
}

// registerAgentRoutes registers all agent endpoints on the Huma API.
func registerAgentRoutes(api huma.API, agentSvc service.AgentService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-agent",
		Method:        http.MethodPost,
		Path:          "/agents",
		Summary:       "Create agent",
		Description:   "Creates a new agent and assigns it to a board.",
		Tags:          []string{"agents"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateAgentRequest) (*CreateAgentResponse, error) {
		slog.Info("creating agent", "name", input.Body.Name, "board_id", input.Body.BoardID)
		agent, err := agentSvc.Create(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateAgentResponse{Body: *agent}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-agent",
		Method:      http.MethodGet,
		Path:        "/agents/{id}",
		Summary:     "Get agent",
		Description: "Retrieves an agent by ID with current task and status.",
		Tags:        []string{"agents"},
	}, func(ctx context.Context, input *GetAgentRequest) (*GetAgentResponse, error) {
		agent, err := agentSvc.Get(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetAgentResponse{Body: *agent}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-agents",
		Method:      http.MethodGet,
		Path:        "/agents",
		Summary:     "List agents",
		Description: "Lists agents with optional filters and pagination.",
		Tags:        []string{"agents"},
	}, func(ctx context.Context, input *ListAgentsRequest) (*ListAgentsResponse, error) {
		opts := dto.ListAgentsOptions{
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
		result, err := agentSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListAgentsResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "update-agent",
		Method:      http.MethodPatch,
		Path:        "/agents/{id}",
		Summary:     "Update agent",
		Description: "Partially updates an agent.",
		Tags:        []string{"agents"},
	}, func(ctx context.Context, input *UpdateAgentRequest) (*UpdateAgentResponse, error) {
		slog.Info("updating agent", "id", input.ID)
		agent, err := agentSvc.Update(ctx, input.ID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &UpdateAgentResponse{Body: *agent}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-agent",
		Method:        http.MethodDelete,
		Path:          "/agents/{id}",
		Summary:       "Delete agent",
		Description:   "Deletes an agent by ID.",
		Tags:          []string{"agents"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteAgentRequest) (*struct{}, error) {
		slog.Info("deleting agent", "id", input.ID)
		if err := agentSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

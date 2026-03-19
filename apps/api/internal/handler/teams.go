package handler

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// --- Request / Response types for Huma ---

type ListTeamTemplatesResponse struct {
	Body []dto.TeamTemplateOutput
}

type GetTeamTemplateRequest struct {
	Name string `path:"name" doc:"Template name"`
}

type GetTeamTemplateResponse struct {
	Body dto.TeamTemplateOutput
}

type ListAvailableModelsResponse struct {
	Body []dto.AvailableModelOutput
}

type CreateTeamRequest struct {
	Body dto.CreateTeamInput
}

type CreateTeamResponse struct {
	Body dto.CreateTeamOutput
}

// registerTeamRoutes registers team template endpoints on the Huma API.
func registerTeamRoutes(api huma.API, svc service.TeamTemplateService) {
	huma.Register(api, huma.Operation{
		OperationID: "list-team-templates",
		Method:      http.MethodGet,
		Path:        "/teams/templates",
		Summary:     "List team templates",
		Description: "Lists available team templates with agent roles and default models.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *struct{}) (*ListTeamTemplatesResponse, error) {
		templates, err := svc.ListTemplates(ctx)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListTeamTemplatesResponse{Body: templates}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-available-models",
		Method:      http.MethodGet,
		Path:        "/teams/models",
		Summary:     "List available models",
		Description: "Lists models that can be assigned to agents when creating teams.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *struct{}) (*ListAvailableModelsResponse, error) {
		models, err := svc.ListModels(ctx)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListAvailableModelsResponse{Body: models}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-team-template",
		Method:      http.MethodGet,
		Path:        "/teams/templates/{name}",
		Summary:     "Get team template",
		Description: "Retrieves a team template by name with full agent role details.",
		Tags:        []string{"teams"},
	}, func(ctx context.Context, input *GetTeamTemplateRequest) (*GetTeamTemplateResponse, error) {
		tpl, err := svc.GetTemplate(ctx, input.Name)
		if err != nil {
			return nil, huma.Error404NotFound("template not found")
		}
		return &GetTeamTemplateResponse{Body: *tpl}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "create-team",
		Method:        http.MethodPost,
		Path:          "/teams/create",
		Summary:       "Create team from template",
		Description:   "Creates a board with agents from a team template. Sets up lead agent orchestration.",
		Tags:          []string{"teams"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateTeamRequest) (*CreateTeamResponse, error) {
		slog.Info("creating team from template", "template", input.Body.TemplateName, "board_name", input.Body.BoardName)
		result, err := svc.CreateTeam(ctx, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateTeamResponse{Body: *result}, nil
	})
}

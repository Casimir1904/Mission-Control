package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/teamtemplate"
)

// TeamTemplateService manages team templates and creates teams from them.
type TeamTemplateService interface {
	ListTemplates(ctx context.Context) ([]dto.TeamTemplateOutput, error)
	GetTemplate(ctx context.Context, name string) (*dto.TeamTemplateOutput, error)
	CreateTeam(ctx context.Context, input dto.CreateTeamInput) (*dto.CreateTeamOutput, error)
}

type teamTemplateService struct {
	boardSvc BoardService
	agentSvc AgentService
}

// NewTeamTemplateService creates a new TeamTemplateService.
func NewTeamTemplateService(boardSvc BoardService, agentSvc AgentService) TeamTemplateService {
	return &teamTemplateService{
		boardSvc: boardSvc,
		agentSvc: agentSvc,
	}
}

func (s *teamTemplateService) ListTemplates(ctx context.Context) ([]dto.TeamTemplateOutput, error) {
	templates := teamtemplate.Registry()
	out := make([]dto.TeamTemplateOutput, len(templates))
	for i, t := range templates {
		out[i] = templateToOutput(t)
	}
	return out, nil
}

func (s *teamTemplateService) GetTemplate(ctx context.Context, name string) (*dto.TeamTemplateOutput, error) {
	for _, t := range teamtemplate.Registry() {
		if t.Name == name {
			out := templateToOutput(t)
			return &out, nil
		}
	}
	return nil, fmt.Errorf("template %q not found", name)
}

func (s *teamTemplateService) CreateTeam(ctx context.Context, input dto.CreateTeamInput) (*dto.CreateTeamOutput, error) {
	// Find the template.
	var tpl *teamtemplate.Template
	for _, t := range teamtemplate.Registry() {
		if t.Name == input.TemplateName {
			tpl = &t
			break
		}
	}
	if tpl == nil {
		return nil, fmt.Errorf("template %q not found", input.TemplateName)
	}

	// Build model override map.
	modelOverrides := make(map[string]string, len(input.ModelOverrides))
	for _, o := range input.ModelOverrides {
		modelOverrides[o.RoleName] = o.Model
	}

	// Create the board.
	board, err := s.boardSvc.Create(ctx, dto.CreateBoardInput{
		Name:              input.BoardName,
		Description:       tpl.Description,
		OrganizationID:    input.OrganizationID,
		OrchestrationMode: "lead_agent",
	})
	if err != nil {
		return nil, fmt.Errorf("create board: %w", err)
	}

	slog.Info("team template: board created",
		"board_id", board.ID,
		"template", tpl.Name,
	)

	// Create agents from template roles.
	var leaderID *uuid.UUID
	agents := make([]dto.AgentOutput, 0, len(tpl.Agents))
	for _, role := range tpl.Agents {
		model := role.DefaultModel
		if override, ok := modelOverrides[role.Name]; ok {
			model = override
		}

		agent, err := s.agentSvc.Create(ctx, dto.CreateAgentInput{
			Name:      role.Name,
			Role:      role.Role,
			Backstory: role.Backstory,
			Model:     model,
			BoardID:   board.ID,
			GatewayID: input.GatewayID,
		})
		if err != nil {
			slog.Error("team template: failed to create agent",
				"role", role.Name,
				"board_id", board.ID,
				"error", err,
			)
			continue
		}

		agents = append(agents, *agent)

		if role.IsLeader {
			leaderID = &agent.ID
		}
	}

	// Set the leader on the board.
	if leaderID != nil {
		_, err := s.boardSvc.Update(ctx, board.ID, dto.UpdateBoardInput{
			LeadAgentID: leaderID,
		})
		if err != nil {
			slog.Error("team template: failed to set lead agent",
				"board_id", board.ID,
				"lead_agent_id", leaderID,
				"error", err,
			)
		}
	}

	slog.Info("team template: team created",
		"board_id", board.ID,
		"template", tpl.Name,
		"agents_created", len(agents),
	)

	return &dto.CreateTeamOutput{
		BoardID: board.ID,
		Agents:  agents,
	}, nil
}

func templateToOutput(t teamtemplate.Template) dto.TeamTemplateOutput {
	agents := make([]dto.AgentRoleOutput, len(t.Agents))
	for i, a := range t.Agents {
		agents[i] = dto.AgentRoleOutput{
			Name:         a.Name,
			Role:         a.Role,
			Backstory:    a.Backstory,
			DefaultModel: a.DefaultModel,
			IsLeader:     a.IsLeader,
		}
	}
	return dto.TeamTemplateOutput{
		Name:        t.Name,
		Description: t.Description,
		Agents:      agents,
	}
}

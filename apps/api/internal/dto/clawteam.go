package dto

import "time"

// TeamTemplateOutput is the API response for a ClawTeam team template.
type TeamTemplateOutput struct {
	Name        string   `json:"name" doc:"Template name"`
	Description string   `json:"description" doc:"Template description"`
	Roles       []string `json:"roles" doc:"Agent roles in the team"`
	AgentCount  int      `json:"agent_count" doc:"Number of agents in the team"`
}

// CreateTeamRunInput is the payload for starting a team run.
type CreateTeamRunInput struct {
	TeamName string `json:"team_name" minLength:"1" doc:"Team template name to use"`
	Task     string `json:"task" minLength:"1" doc:"Task description for the team"`
	BoardID  string `json:"board_id,omitempty" format:"uuid" doc:"Optional board to associate the run with"`
}

// TeamRunOutput is the API response for a team run.
type TeamRunOutput struct {
	ID        string          `json:"id" doc:"ClawTeam run ID"`
	TeamName  string          `json:"team_name" doc:"Team template used"`
	Task      string          `json:"task" doc:"Task description"`
	Status    string          `json:"status" doc:"Run status: pending, running, completed, failed"`
	SubTasks  []SubTaskOutput `json:"sub_tasks,omitempty" doc:"Sub-tasks within the run"`
	Result    string          `json:"result,omitempty" doc:"Final result of the run"`
	BoardID   string          `json:"board_id,omitempty" doc:"Associated board ID"`
	StartedAt *time.Time      `json:"started_at,omitempty" doc:"When the run started"`
	EndedAt   *time.Time      `json:"ended_at,omitempty" doc:"When the run ended"`
}

// SubTaskOutput is a sub-task within a team run.
type SubTaskOutput struct {
	ID        string   `json:"id" doc:"Sub-task ID"`
	Title     string   `json:"title" doc:"Sub-task title"`
	Agent     string   `json:"agent" doc:"Agent handling this sub-task"`
	Status    string   `json:"status" doc:"Sub-task status"`
	DependsOn []string `json:"depends_on,omitempty" doc:"IDs of sub-tasks this depends on"`
	Result    string   `json:"result,omitempty" doc:"Sub-task result"`
}

// ListTeamRunsOptions extends ListOptions with team run filters.
type ListTeamRunsOptions struct {
	ListOptions
	Status   string `json:"status,omitempty"`
	TeamName string `json:"team_name,omitempty"`
}

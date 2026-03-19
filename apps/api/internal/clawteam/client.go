package clawteam

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"time"
)

// Client communicates with ClawTeam via SSH+CLI for commands and HTTP for
// the read-only board dashboard API.
type Client struct {
	sshHost    string // e.g. "openclaw@192.168.1.162"
	boardURL   string // e.g. "http://192.168.1.162:8080"
	httpClient *http.Client
}

// NewClient creates a new ClawTeam client.
// sshHost is used for CLI commands (e.g., "openclaw@192.168.1.162").
// boardURL is the ClawTeam board serve URL for read-only status.
func NewClient(sshHost, boardURL string) *Client {
	return &Client{
		sshHost: sshHost,
		boardURL: boardURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// TemplateListItem is returned by `clawteam --json template list`.
type TemplateListItem struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Source      string `json:"source"`
}

// TemplateDetail is returned by `clawteam --json template show <name>`.
type TemplateDetail struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Leader      TemplateAgent   `json:"leader"`
	Agents      []TemplateAgent `json:"agents"`
	Tasks       []TemplateTask  `json:"tasks"`
}

// TemplateAgent is a role in a team template.
type TemplateAgent struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// TemplateTask is a pre-defined task in a team template.
type TemplateTask struct {
	Subject string `json:"subject"`
	Owner   string `json:"owner"`
}

// TeamTemplate is the unified template view exposed to the service layer.
type TeamTemplate struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Roles       []string `json:"roles"`
	AgentCount  int      `json:"agent_count"`
}

// OverviewTeam is one entry from the board dashboard /api/overview endpoint.
type OverviewTeam struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	Leader          string `json:"leader"`
	Members         int    `json:"members"`
	Tasks           int    `json:"tasks"`
	PendingMessages int    `json:"pendingMessages"`
}

// CLITask is a task as returned by `clawteam --json task list <team>`.
type CLITask struct {
	ID        string   `json:"id"`
	Subject   string   `json:"subject"`
	Status    string   `json:"status"`
	Owner     string   `json:"owner"`
	Blocks    []string `json:"blocks"`
	BlockedBy []string `json:"blockedBy"`
}

// CLITeamStatus is returned by `clawteam --json team status <team>`.
type CLITeamStatus struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Members     []struct {
		Name      string `json:"name"`
		AgentType string `json:"agentType"`
	} `json:"members"`
}

// TeamRun represents a running or completed team for the service layer.
type TeamRun struct {
	ID        string     `json:"id"`
	TeamName  string     `json:"team_name"`
	Task      string     `json:"task"`
	Status    string     `json:"status"`
	SubTasks  []SubTask  `json:"sub_tasks,omitempty"`
	Result    string     `json:"result,omitempty"`
	StartedAt *time.Time `json:"started_at,omitempty"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
}

// SubTask represents a sub-task within a team run.
type SubTask struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Agent     string   `json:"agent"`
	Status    string   `json:"status"`
	DependsOn []string `json:"depends_on,omitempty"`
	Result    string   `json:"result,omitempty"`
}

// CreateRunRequest is the payload to start a new team run.
type CreateRunRequest struct {
	TeamName string `json:"team_name"`
	Task     string `json:"task"`
}

// ListTemplates fetches available team templates via CLI.
func (c *Client) ListTemplates(ctx context.Context) ([]TeamTemplate, error) {
	var items []TemplateListItem
	if err := c.sshJSON(ctx, &items, "clawteam", "--json", "template", "list"); err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}

	templates := make([]TeamTemplate, 0, len(items))
	for _, item := range items {
		// Get detail for each template to extract roles.
		var detail TemplateDetail
		if err := c.sshJSON(ctx, &detail, "clawteam", "--json", "template", "show", item.Name); err != nil {
			// If detail fails, include basic info.
			templates = append(templates, TeamTemplate{
				Name:        item.Name,
				Description: item.Description,
			})
			continue
		}

		roles := make([]string, 0, len(detail.Agents)+1)
		roles = append(roles, detail.Leader.Name)
		for _, a := range detail.Agents {
			roles = append(roles, a.Name)
		}

		templates = append(templates, TeamTemplate{
			Name:        item.Name,
			Description: item.Description,
			Roles:       roles,
			AgentCount:  len(detail.Agents) + 1, // agents + leader
		})
	}

	return templates, nil
}

// CreateRun launches a team from a template using `clawteam launch`.
func (c *Client) CreateRun(ctx context.Context, req CreateRunRequest) (*TeamRun, error) {
	// Launch the team via CLI. The launch command creates the team and
	// spawns all agents in tmux.
	args := []string{
		"source", "~/clawteam-env/bin/activate", "&&",
		"clawteam", "launch", req.TeamName,
		"-g", req.Task,
		"--command", "openclaw",
	}
	out, err := c.ssh(ctx, args...)
	if err != nil {
		return nil, fmt.Errorf("launch team: %w: %s", err, string(out))
	}

	// After launch, discover the team to build a TeamRun.
	var teams []struct {
		Name string `json:"name"`
	}
	if err := c.sshJSON(ctx, &teams, "clawteam", "--json", "team", "discover"); err != nil {
		return nil, fmt.Errorf("discover teams after launch: %w", err)
	}

	// Find the newly created team (likely the latest one matching the template).
	teamName := req.TeamName
	for _, t := range teams {
		// ClawTeam may name teams like "code-review" or "code-review-1".
		if t.Name == req.TeamName || len(t.Name) > len(req.TeamName) && t.Name[:len(req.TeamName)] == req.TeamName {
			teamName = t.Name
		}
	}

	now := time.Now()
	return &TeamRun{
		ID:        teamName,
		TeamName:  req.TeamName,
		Task:      req.Task,
		Status:    "running",
		StartedAt: &now,
	}, nil
}

// GetRun fetches team status by combining team status and task list.
func (c *Client) GetRun(ctx context.Context, id string) (*TeamRun, error) {
	// Get team status.
	var teamStatus CLITeamStatus
	if err := c.sshJSON(ctx, &teamStatus, "clawteam", "--json", "team", "status", id); err != nil {
		return nil, fmt.Errorf("team status: %w", err)
	}

	// Get task list for the team.
	var tasks []CLITask
	if err := c.sshJSON(ctx, &tasks, "clawteam", "--json", "task", "list", id); err != nil {
		// Tasks may not exist yet, don't fail.
		tasks = nil
	}

	// Build sub-tasks from the task list.
	subTasks := make([]SubTask, len(tasks))
	for i, t := range tasks {
		subTasks[i] = SubTask{
			ID:        t.ID,
			Title:     t.Subject,
			Agent:     t.Owner,
			Status:    t.Status,
			DependsOn: t.BlockedBy,
		}
	}

	// Determine overall status from task statuses.
	status := deriveTeamStatus(tasks)

	return &TeamRun{
		ID:       id,
		TeamName: id,
		Task:     teamStatus.Description,
		Status:   status,
		SubTasks: subTasks,
	}, nil
}

// ListRuns fetches all active teams. Uses the board dashboard overview API
// for a lightweight summary, then enriches with task details via CLI.
func (c *Client) ListRuns(ctx context.Context) ([]TeamRun, error) {
	// First try the board dashboard overview API for a fast summary.
	if c.boardURL != "" {
		var overview []OverviewTeam
		if err := c.httpGet(ctx, "/api/overview", &overview); err == nil && len(overview) > 0 {
			runs := make([]TeamRun, len(overview))
			for i, o := range overview {
				// Fetch tasks for each team to get sub-task details.
				var tasks []CLITask
				_ = c.sshJSON(ctx, &tasks, "clawteam", "--json", "task", "list", o.Name)

				subTasks := make([]SubTask, len(tasks))
				for j, t := range tasks {
					subTasks[j] = SubTask{
						ID:        t.ID,
						Title:     t.Subject,
						Agent:     t.Owner,
						Status:    t.Status,
						DependsOn: t.BlockedBy,
					}
				}

				runs[i] = TeamRun{
					ID:       o.Name,
					TeamName: o.Name,
					Task:     o.Description,
					Status:   deriveTeamStatus(tasks),
					SubTasks: subTasks,
				}
			}
			return runs, nil
		}
	}

	// Fallback to CLI team discover.
	var teams []struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.sshJSON(ctx, &teams, "clawteam", "--json", "team", "discover"); err != nil {
		return nil, fmt.Errorf("discover teams: %w", err)
	}

	runs := make([]TeamRun, len(teams))
	for i, t := range teams {
		runs[i] = TeamRun{
			ID:       t.Name,
			TeamName: t.Name,
			Task:     t.Description,
			Status:   "running",
		}
	}
	return runs, nil
}

// deriveTeamStatus determines overall team status from task statuses.
func deriveTeamStatus(tasks []CLITask) string {
	if len(tasks) == 0 {
		return "pending"
	}
	allDone := true
	anyFailed := false
	for _, t := range tasks {
		if t.Status == "failed" || t.Status == "error" {
			anyFailed = true
		}
		if t.Status != "completed" && t.Status != "done" {
			allDone = false
		}
	}
	if anyFailed {
		return "failed"
	}
	if allDone {
		return "completed"
	}
	return "running"
}

// CancelRun cleans up a team (pipes "y" for confirmation).
func (c *Client) CancelRun(ctx context.Context, id string) error {
	// Use a single shell command string for proper piping.
	cmd := exec.CommandContext(ctx, "ssh",
		"-o", "StrictHostKeyChecking=no",
		"-o", "ConnectTimeout=10",
		c.sshHost,
		fmt.Sprintf("source ~/clawteam-env/bin/activate && echo y | clawteam team cleanup %s", id),
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("cleanup team: %w: %s", err, string(out))
	}
	return nil
}

// ssh runs a command on the remote host via SSH.
func (c *Client) ssh(ctx context.Context, args ...string) ([]byte, error) {
	// Build the remote command as a single shell string.
	remoteCmd := ""
	for i, a := range args {
		if i > 0 {
			remoteCmd += " "
		}
		remoteCmd += a
	}

	cmd := exec.CommandContext(ctx, "ssh",
		"-o", "StrictHostKeyChecking=no",
		"-o", "ConnectTimeout=10",
		c.sshHost,
		remoteCmd,
	)
	return cmd.CombinedOutput()
}

// sshJSON runs a command via SSH and decodes the JSON output.
func (c *Client) sshJSON(ctx context.Context, out interface{}, args ...string) error {
	// Wrap in activation of the clawteam venv.
	remoteCmd := "source ~/clawteam-env/bin/activate &&"
	for _, a := range args {
		remoteCmd += " " + a
	}

	cmd := exec.CommandContext(ctx, "ssh",
		"-o", "StrictHostKeyChecking=no",
		"-o", "ConnectTimeout=10",
		c.sshHost,
		remoteCmd,
	)
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return fmt.Errorf("ssh command failed: %w: %s", err, string(exitErr.Stderr))
		}
		return fmt.Errorf("ssh command failed: %w", err)
	}

	if err := json.Unmarshal(output, out); err != nil {
		return fmt.Errorf("decode JSON: %w (raw: %s)", err, string(output))
	}
	return nil
}

// httpGet makes a GET request to the board dashboard.
func (c *Client) httpGet(ctx context.Context, path string, out interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.boardURL+path, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("status %d: %s", resp.StatusCode, string(body))
	}

	return json.NewDecoder(resp.Body).Decode(out)
}

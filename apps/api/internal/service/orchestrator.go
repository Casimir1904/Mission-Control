package service

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/agent"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/board"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// OrchestratorService handles lead agent task planning and response processing.
type OrchestratorService interface {
	PlanTask(ctx context.Context, taskID uuid.UUID) error
	HandleLeadResponse(ctx context.Context, sessionKey, message string) error
}

// OrchestratorFunc is a function type used as a hook to trigger orchestration
// after task creation, avoiding circular dependencies.
type OrchestratorFunc func(ctx context.Context, taskID uuid.UUID) error

type orchestratorService struct {
	client      *generated.Client
	bus         *events.Bus
	chatSvc     ChatService
	taskSvc     TaskService
	dispatchSvc DispatchService
}

// NewOrchestratorService creates a new OrchestratorService.
func NewOrchestratorService(
	client *generated.Client,
	bus *events.Bus,
	chatSvc ChatService,
	taskSvc TaskService,
	dispatchSvc DispatchService,
) OrchestratorService {
	return &orchestratorService{
		client:      client,
		bus:         bus,
		chatSvc:     chatSvc,
		taskSvc:     taskSvc,
		dispatchSvc: dispatchSvc,
	}
}

// PlanTask is triggered after task creation on a board with a lead agent.
// It creates a chat session with the lead agent and sends a system prompt
// describing the task, the board, and the available agents.
func (s *orchestratorService) PlanTask(ctx context.Context, taskID uuid.UUID) error {
	// Load the task with its board.
	t, err := s.client.Task.Query().
		Where(task.ID(taskID)).
		WithBoard().
		Only(ctx)
	if err != nil {
		return fmt.Errorf("orchestrator.PlanTask task lookup: %w", err)
	}

	b := t.Edges.Board
	if b == nil {
		return fmt.Errorf("orchestrator.PlanTask: task has no board")
	}

	// Check if the board has a lead agent assigned.
	if b.LeadAgentID == nil {
		// No lead agent; nothing to orchestrate.
		return nil
	}

	leadAgentID := *b.LeadAgentID

	// Verify the lead agent exists and belongs to this board.
	leadAgent, err := s.client.Agent.Query().
		Where(agent.ID(leadAgentID), agent.BoardID(b.ID)).
		Only(ctx)
	if err != nil {
		return fmt.Errorf("orchestrator.PlanTask lead agent lookup: %w", err)
	}

	// Load all agents on this board for the system prompt.
	agents, err := s.client.Agent.Query().
		Where(agent.BoardID(b.ID)).
		All(ctx)
	if err != nil {
		return fmt.Errorf("orchestrator.PlanTask agents lookup: %w", err)
	}

	// Build the lead agent system prompt.
	systemPrompt := buildLeadAgentPrompt(b, t, agents, leadAgent)

	// Create a chat session with the lead agent for this task.
	sessionInput := dto.CreateSessionInput{
		AgentID:      leadAgentID,
		TaskID:       &taskID,
		SystemPrompt: systemPrompt,
	}

	session, err := s.chatSvc.CreateSession(ctx, b.ID, sessionInput)
	if err != nil {
		return fmt.Errorf("orchestrator.PlanTask create session: %w", err)
	}

	// Send the initial instruction message.
	initialMessage := fmt.Sprintf(
		"A new task has been created: \"%s\"\n\n"+
			"Please analyze this task and decide how to proceed. You can:\n"+
			"1. Ask the user clarifying questions\n"+
			"2. Break it into sub-tasks and assign them to available agents using the ASSIGN format\n"+
			"3. Assign it directly to the best agent\n\n"+
			"Use the format ASSIGN: agent_name -> task_title to make assignments.",
		t.Title,
	)

	_, sendErr := s.chatSvc.SendMessage(ctx, session.SessionKey, dto.SendMessageInput{
		Content: initialMessage,
	})
	if sendErr != nil {
		slog.Warn("orchestrator: initial message send failed, session still created",
			"task_id", taskID,
			"session_key", session.SessionKey,
			"error", sendErr,
		)
	}

	slog.Info("orchestrator: task planning initiated",
		"task_id", taskID,
		"board_id", b.ID,
		"lead_agent", leadAgent.Name,
		"session_key", session.SessionKey,
	)

	return nil
}

// HandleLeadResponse is called when the lead agent responds via chat.
// It parses the response for task assignments and creates/dispatches sub-tasks.
func (s *orchestratorService) HandleLeadResponse(ctx context.Context, sessionKey, message string) error {
	// Look up the session to get task and board context.
	session, err := s.chatSvc.GetSessionByKey(ctx, sessionKey)
	if err != nil {
		return fmt.Errorf("orchestrator.HandleLeadResponse session lookup: %w", err)
	}

	// Only process if this session is associated with a task.
	if session.TaskID == nil {
		return nil
	}

	// Get the board to verify it has a lead agent.
	b, err := s.client.Board.Query().
		Where(board.ID(session.BoardID)).
		Only(ctx)
	if err != nil {
		return fmt.Errorf("orchestrator.HandleLeadResponse board lookup: %w", err)
	}

	// Only process responses from sessions involving the lead agent.
	if b.LeadAgentID == nil || session.AgentID != *b.LeadAgentID {
		return nil
	}

	// Parse the response for ASSIGN directives.
	assignments := parseAssignments(message)
	if len(assignments) == 0 {
		// No assignments found; lead agent might be asking questions or providing info.
		slog.Debug("orchestrator: no assignments found in lead response",
			"session_key", sessionKey,
		)
		return nil
	}

	// Load available agents on this board for name matching.
	agents, err := s.client.Agent.Query().
		Where(agent.BoardID(session.BoardID)).
		All(ctx)
	if err != nil {
		return fmt.Errorf("orchestrator.HandleLeadResponse agents lookup: %w", err)
	}

	agentMap := make(map[string]*generated.Agent, len(agents))
	for _, a := range agents {
		agentMap[strings.ToLower(a.Name)] = a
	}

	// Get the parent task for context.
	parentTask, err := s.taskSvc.Get(ctx, *session.TaskID)
	if err != nil {
		return fmt.Errorf("orchestrator.HandleLeadResponse parent task lookup: %w", err)
	}

	createdCount := 0
	for _, assign := range assignments {
		targetAgent, ok := agentMap[strings.ToLower(assign.AgentName)]
		if !ok {
			slog.Warn("orchestrator: agent not found for assignment",
				"agent_name", assign.AgentName,
				"task_title", assign.TaskTitle,
			)
			continue
		}

		// Create the sub-task.
		createInput := dto.CreateTaskInput{
			Title:           assign.TaskTitle,
			Description:     fmt.Sprintf("Sub-task of: %s\n\nAssigned by lead agent.", parentTask.Title),
			Priority:        parentTask.Priority,
			BoardID:         session.BoardID,
			AssignedAgentID: &targetAgent.ID,
		}

		newTask, err := s.taskSvc.Create(ctx, createInput)
		if err != nil {
			slog.Error("orchestrator: failed to create sub-task",
				"error", err,
				"agent_name", assign.AgentName,
				"task_title", assign.TaskTitle,
			)
			continue
		}

		// Add dependency: sub-task is a dependency of the parent task.
		if depErr := s.taskSvc.AddDependency(ctx, *session.TaskID, newTask.ID); depErr != nil {
			slog.Warn("orchestrator: failed to add dependency",
				"parent_task_id", session.TaskID,
				"sub_task_id", newTask.ID,
				"error", depErr,
			)
		}

		// Auto-dispatch the sub-task by transitioning to in_progress.
		// The task service's auto-dispatch hook will handle the gateway dispatch.
		if _, transErr := s.taskSvc.Transition(ctx, newTask.ID, "in_progress"); transErr != nil {
			slog.Warn("orchestrator: failed to auto-dispatch sub-task",
				"sub_task_id", newTask.ID,
				"error", transErr,
			)
		}

		createdCount++
		slog.Info("orchestrator: sub-task created and dispatched",
			"sub_task_id", newTask.ID,
			"agent_name", targetAgent.Name,
			"task_title", assign.TaskTitle,
		)
	}

	slog.Info("orchestrator: lead response processed",
		"session_key", sessionKey,
		"assignments_found", len(assignments),
		"tasks_created", createdCount,
	)

	return nil
}

// assignment represents a parsed task assignment from the lead agent's response.
type assignment struct {
	AgentName string
	TaskTitle string
}

// assignPattern matches "ASSIGN: agent_name -> task_title" directives.
var assignPattern = regexp.MustCompile(`(?mi)^ASSIGN:\s*(.+?)\s*->\s*(.+?)\s*$`)

// parseAssignments extracts ASSIGN directives from a lead agent's response.
func parseAssignments(message string) []assignment {
	matches := assignPattern.FindAllStringSubmatch(message, -1)
	assignments := make([]assignment, 0, len(matches))

	for _, match := range matches {
		if len(match) == 3 {
			agentName := strings.TrimSpace(match[1])
			taskTitle := strings.TrimSpace(match[2])
			if agentName != "" && taskTitle != "" {
				assignments = append(assignments, assignment{
					AgentName: agentName,
					TaskTitle: taskTitle,
				})
			}
		}
	}

	return assignments
}

// buildLeadAgentPrompt constructs the system prompt for the lead agent orchestrator.
func buildLeadAgentPrompt(b *generated.Board, t *generated.Task, agents []*generated.Agent, lead *generated.Agent) string {
	var sb strings.Builder

	sb.WriteString("You are the LEAD AGENT for this board. Your role is to analyze incoming tasks, ")
	sb.WriteString("plan their execution, and delegate work to the available agents on your team.\n\n")

	// Board context.
	sb.WriteString("## Board\n")
	sb.WriteString(fmt.Sprintf("- Name: %s\n", b.Name))
	if b.Description != "" {
		sb.WriteString(fmt.Sprintf("- Description: %s\n", b.Description))
	}
	sb.WriteString("\n")

	// Available agents.
	sb.WriteString("## Available Agents\n")
	for _, a := range agents {
		if a.ID == lead.ID {
			continue // Skip the lead agent itself from the team list.
		}
		sb.WriteString(fmt.Sprintf("- **%s** (Role: %s)", a.Name, a.Role))
		if a.Goal != "" {
			sb.WriteString(fmt.Sprintf(" - Goal: %s", a.Goal))
		}
		sb.WriteString("\n")
	}
	if len(agents) <= 1 {
		sb.WriteString("- (No other agents available on this board)\n")
	}
	sb.WriteString("\n")

	// Task details.
	sb.WriteString("## New Task\n")
	sb.WriteString(fmt.Sprintf("- Title: %s\n", t.Title))
	if t.Description != "" {
		sb.WriteString(fmt.Sprintf("- Description: %s\n", t.Description))
	}
	sb.WriteString(fmt.Sprintf("- Priority: %s\n", t.Priority.String()))
	sb.WriteString("\n")

	// Instructions.
	sb.WriteString("## Instructions\n")
	sb.WriteString("Analyze this task and choose one of the following actions:\n\n")
	sb.WriteString("1. **Ask clarifying questions** if the task is ambiguous or lacks detail.\n")
	sb.WriteString("2. **Break it into sub-tasks** and assign each to the best-suited agent.\n")
	sb.WriteString("3. **Assign it directly** to a single agent if it does not need decomposition.\n\n")
	sb.WriteString("To assign tasks, use this exact format (one per line):\n")
	sb.WriteString("```\n")
	sb.WriteString("ASSIGN: agent_name -> task title or description\n")
	sb.WriteString("```\n\n")
	sb.WriteString("You may include multiple ASSIGN lines in a single response.\n")
	sb.WriteString("If you need more information, simply ask -- your message will be visible to the user.\n")

	return sb.String()
}

package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/chatsession"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/task"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// DispatchService defines the interface for task dispatch operations.
type DispatchService interface {
	DispatchTask(ctx context.Context, taskID uuid.UUID) (*dto.DispatchOutput, error)
	GetDispatchStatus(ctx context.Context, taskID uuid.UUID) (*dto.DispatchStatusOutput, error)
}

type dispatchService struct {
	client  *generated.Client
	bus     *events.Bus
	chatSvc ChatService
}

// NewDispatchService creates a new DispatchService.
func NewDispatchService(client *generated.Client, bus *events.Bus, chatSvc ChatService) DispatchService {
	return &dispatchService{
		client:  client,
		bus:     bus,
		chatSvc: chatSvc,
	}
}

func (s *dispatchService) DispatchTask(ctx context.Context, taskID uuid.UUID) (*dto.DispatchOutput, error) {
	// Load the task with its assigned agent.
	t, err := s.client.Task.Query().
		Where(task.ID(taskID)).
		WithAssignedAgent().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("task not found")
		}
		return nil, fmt.Errorf("service.DispatchService.DispatchTask task lookup: %w", err)
	}

	// Validate the task has an assigned agent.
	if t.Edges.AssignedAgent == nil {
		return nil, apperror.NewValidation("no agent assigned to this task")
	}

	agent := t.Edges.AssignedAgent

	// Validate the agent has a gateway.
	if agent.GatewayID == nil {
		return nil, apperror.NewValidation(fmt.Sprintf("agent %q has no gateway assigned", agent.Name))
	}

	// Check for an existing active session for this task (idempotency).
	existingSession, err := s.client.ChatSession.Query().
		Where(
			chatsession.TaskID(taskID),
			chatsession.StatusEQ(chatsession.StatusActive),
		).
		Only(ctx)
	if err == nil {
		// Already dispatched; return existing session info.
		return &dto.DispatchOutput{
			TaskID:     taskID,
			SessionKey: existingSession.SessionKey,
			AgentID:    agent.ID,
			AgentName:  agent.Name,
			Status:     "already_dispatched",
		}, nil
	}
	if !generated.IsNotFound(err) {
		return nil, fmt.Errorf("service.DispatchService.DispatchTask check existing: %w", err)
	}

	// Build the system prompt for the task.
	systemPrompt := buildTaskSystemPrompt(t)

	// Create a chat session via the chat service.
	sessionInput := dto.CreateSessionInput{
		AgentID:      agent.ID,
		TaskID:       &taskID,
		SystemPrompt: systemPrompt,
	}

	session, err := s.chatSvc.CreateSession(ctx, t.BoardID, sessionInput)
	if err != nil {
		return nil, fmt.Errorf("service.DispatchService.DispatchTask create session: %w", err)
	}

	// Send the initial message to start the agent working.
	initialMessage := fmt.Sprintf("Please begin working on this task: %s", t.Title)
	if t.Description != "" {
		initialMessage += fmt.Sprintf("\n\nTask details:\n%s", t.Description)
	}

	_, sendErr := s.chatSvc.SendMessage(ctx, session.SessionKey, dto.SendMessageInput{
		Content: initialMessage,
	})
	if sendErr != nil {
		slog.Warn("dispatch: initial message send failed, session still created",
			"task_id", taskID,
			"session_key", session.SessionKey,
			"error", sendErr,
		)
	}

	// Publish dispatch event to NATS.
	s.publishDispatchEvent(ctx, t, agent.ID, agent.Name, session.SessionKey)

	slog.Info("task dispatched",
		"task_id", taskID,
		"agent_id", agent.ID,
		"agent_name", agent.Name,
		"session_key", session.SessionKey,
	)

	return &dto.DispatchOutput{
		TaskID:     taskID,
		SessionKey: session.SessionKey,
		AgentID:    agent.ID,
		AgentName:  agent.Name,
		Status:     "dispatched",
	}, nil
}

func (s *dispatchService) GetDispatchStatus(ctx context.Context, taskID uuid.UUID) (*dto.DispatchStatusOutput, error) {
	// Load the task.
	t, err := s.client.Task.Query().
		Where(task.ID(taskID)).
		WithAssignedAgent().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("task not found")
		}
		return nil, fmt.Errorf("service.DispatchService.GetDispatchStatus task lookup: %w", err)
	}

	output := &dto.DispatchStatusOutput{
		TaskID: taskID,
		Status: "not_dispatched",
	}

	if t.Edges.AssignedAgent != nil {
		output.AgentID = &t.Edges.AssignedAgent.ID
		output.AgentName = t.Edges.AssignedAgent.Name
	}

	// Look for an active or completed session for this task.
	session, err := s.client.ChatSession.Query().
		Where(chatsession.TaskID(taskID)).
		Order(generated.Desc(chatsession.FieldCreatedAt)).
		First(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return output, nil
		}
		return nil, fmt.Errorf("service.DispatchService.GetDispatchStatus session lookup: %w", err)
	}

	output.SessionKey = session.SessionKey
	output.Status = string(session.Status)

	return output, nil
}

// buildTaskSystemPrompt creates a system prompt for an agent working on a task.
func buildTaskSystemPrompt(t *generated.Task) string {
	prompt := fmt.Sprintf("You are working on task: %s\n", t.Title)

	if t.Description != "" {
		prompt += fmt.Sprintf("\nDescription: %s\n", t.Description)
	}

	prompt += fmt.Sprintf("\nPriority: %s\n", t.Priority.String())
	prompt += "\nPlease complete this task and report your progress."

	return prompt
}

// publishDispatchEvent publishes a task.dispatched event to NATS.
func (s *dispatchService) publishDispatchEvent(ctx context.Context, t *generated.Task, agentID uuid.UUID, agentName, sessionKey string) {
	if s.bus == nil || !s.bus.IsConnected() {
		return
	}

	payload := map[string]any{
		"task_id":     t.ID.String(),
		"board_id":    t.BoardID.String(),
		"agent_id":    agentID.String(),
		"agent_name":  agentName,
		"session_key": sessionKey,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("failed to marshal dispatch event", "error", err)
		return
	}

	subject := fmt.Sprintf("mc.task.%s.dispatched", t.ID.String())
	if err := s.bus.Publish(ctx, subject, data); err != nil {
		slog.Error("failed to publish dispatch event", "error", err, "subject", subject)
	}
}

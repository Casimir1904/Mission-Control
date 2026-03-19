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
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/agent"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/chatmessage"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/chatsession"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
	gwclient "github.com/Casimir1904/Mission-Control/apps/api/internal/gateway"
)

// ChatService defines the interface for chat operations.
type ChatService interface {
	CreateSession(ctx context.Context, boardID uuid.UUID, input dto.CreateSessionInput) (*dto.CreateSessionOutput, error)
	SendMessage(ctx context.Context, sessionKey string, input dto.SendMessageInput) (*dto.ChatMessageOutput, error)
	GetHistory(ctx context.Context, sessionKey string, limit int) ([]dto.ChatMessageOutput, error)
	ListSessions(ctx context.Context, boardID uuid.UUID, opts dto.ListSessionsOptions) (*dto.PaginatedResponse[dto.SessionOutput], error)
	AbortGeneration(ctx context.Context, sessionKey string) error
	EndSession(ctx context.Context, sessionKey string) error

	// PersistAssistantMessage is called by the event listener to save incoming agent messages.
	PersistAssistantMessage(ctx context.Context, sessionKey, content string, metadata map[string]any) (*dto.ChatMessageOutput, error)

	// GetSessionByKey returns session info for a given session key.
	GetSessionByKey(ctx context.Context, sessionKey string) (*dto.SessionOutput, error)
}

type chatService struct {
	client  *generated.Client
	bus     *events.Bus
	manager *gwclient.Manager
}

// NewChatService creates a new ChatService.
func NewChatService(client *generated.Client, bus *events.Bus, manager *gwclient.Manager) ChatService {
	return &chatService{
		client:  client,
		bus:     bus,
		manager: manager,
	}
}

func (s *chatService) CreateSession(ctx context.Context, boardID uuid.UUID, input dto.CreateSessionInput) (*dto.CreateSessionOutput, error) {
	// Validate the agent exists and belongs to this board.
	a, err := s.client.Agent.Query().
		Where(agent.ID(input.AgentID), agent.BoardID(boardID)).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewValidation("agent not found on this board")
		}
		return nil, fmt.Errorf("service.ChatService.CreateSession agent lookup: %w", err)
	}

	// Check if the agent has a gateway assigned.
	if a.GatewayID == nil {
		return nil, apperror.NewValidation("agent has no gateway assigned")
	}

	// Check for existing active session for this task (idempotency).
	if input.TaskID != nil {
		existingSession, err := s.client.ChatSession.Query().
			Where(
				chatsession.TaskID(*input.TaskID),
				chatsession.StatusEQ(chatsession.StatusActive),
			).
			Only(ctx)
		if err == nil {
			// Return existing session instead of creating a duplicate.
			return &dto.CreateSessionOutput{
				SessionKey: existingSession.SessionKey,
				AgentID:    existingSession.AgentID,
				AgentName:  a.Name,
				TaskID:     existingSession.TaskID,
				Status:     string(existingSession.Status),
				CreatedAt:  existingSession.CreatedAt,
			}, nil
		}
		if !generated.IsNotFound(err) {
			return nil, fmt.Errorf("service.ChatService.CreateSession check existing: %w", err)
		}
	}

	// Get the gateway client.
	gwClient, err := s.manager.GetClient(*a.GatewayID)
	if err != nil {
		return nil, apperror.NewGatewayError(fmt.Sprintf("gateway not connected for agent %s: %v", a.Name, err))
	}

	// Call sessions.create on the gateway.
	params := map[string]interface{}{
		"agentId": a.ID.String(),
	}
	if input.SystemPrompt != "" {
		params["options"] = map[string]interface{}{
			"systemPrompt": input.SystemPrompt,
		}
	}

	result, err := gwClient.Call(ctx, "sessions.create", params)
	if err != nil {
		return nil, apperror.NewGatewayError(fmt.Sprintf("failed to create session: %v", err))
	}

	// Parse the session key from the response.
	var sessionResp struct {
		SessionKey string `json:"sessionKey"`
	}
	if err := json.Unmarshal(result, &sessionResp); err != nil {
		return nil, fmt.Errorf("service.ChatService.CreateSession parse response: %w", err)
	}

	if sessionResp.SessionKey == "" {
		return nil, apperror.NewGatewayError("gateway returned empty session key")
	}

	// Persist the session in the database.
	builder := s.client.ChatSession.Create().
		SetSessionKey(sessionResp.SessionKey).
		SetBoardID(boardID).
		SetAgentID(input.AgentID).
		SetStatus(chatsession.StatusActive)

	if input.TaskID != nil {
		builder.SetTaskID(*input.TaskID)
	}
	if input.SystemPrompt != "" {
		builder.SetSystemPrompt(input.SystemPrompt)
	}

	session, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.CreateSession save: %w", err)
	}

	slog.Info("chat session created",
		"session_key", session.SessionKey,
		"board_id", boardID,
		"agent_id", input.AgentID,
		"agent_name", a.Name,
	)

	// Publish NATS event.
	s.publishChatEvent(ctx, boardID, "session.created", map[string]any{
		"session_key": session.SessionKey,
		"agent_id":    input.AgentID.String(),
		"agent_name":  a.Name,
		"board_id":    boardID.String(),
	})

	return &dto.CreateSessionOutput{
		SessionKey: session.SessionKey,
		AgentID:    input.AgentID,
		AgentName:  a.Name,
		TaskID:     session.TaskID,
		Status:     string(session.Status),
		CreatedAt:  session.CreatedAt,
	}, nil
}

func (s *chatService) SendMessage(ctx context.Context, sessionKey string, input dto.SendMessageInput) (*dto.ChatMessageOutput, error) {
	// Look up the session.
	session, err := s.client.ChatSession.Query().
		Where(chatsession.SessionKey(sessionKey)).
		WithAgent().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("chat session not found")
		}
		return nil, fmt.Errorf("service.ChatService.SendMessage session lookup: %w", err)
	}

	if session.Status != chatsession.StatusActive {
		return nil, apperror.NewConflict("chat session is not active")
	}

	// Persist the user message in the database.
	msg, err := s.client.ChatMessage.Create().
		SetSessionKey(sessionKey).
		SetBoardID(session.BoardID).
		SetRole(chatmessage.RoleUser).
		SetContent(input.Content).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.SendMessage persist: %w", err)
	}

	// Get the gateway client for the agent.
	if session.Edges.Agent == nil || session.Edges.Agent.GatewayID == nil {
		return nil, apperror.NewGatewayError("agent has no gateway connection")
	}

	gwClient, err := s.manager.GetClient(*session.Edges.Agent.GatewayID)
	if err != nil {
		return nil, apperror.NewGatewayError(fmt.Sprintf("gateway not connected: %v", err))
	}

	// Call chat.send on the gateway. The response will come via events.
	idempotencyKey := msg.ID.String()
	params := map[string]interface{}{
		"sessionKey":     sessionKey,
		"message":        input.Content,
		"deliver":        true,
		"idempotencyKey": idempotencyKey,
	}

	if _, err := gwClient.Call(ctx, "chat.send", params); err != nil {
		slog.Warn("chat.send RPC failed, message persisted locally",
			"session_key", sessionKey,
			"error", err,
		)
		// Don't return error; message is persisted. Agent response will
		// come through when gateway reconnects or the user retries.
	}

	// Publish the user message to NATS for real-time WebSocket delivery.
	s.publishChatEvent(ctx, session.BoardID, "chat.message", map[string]any{
		"session_key": sessionKey,
		"message_id":  msg.ID.String(),
		"board_id":    session.BoardID.String(),
		"role":        "user",
		"content":     input.Content,
	})

	slog.Info("chat message sent", "session_key", sessionKey, "message_id", msg.ID)

	return &dto.ChatMessageOutput{
		ID:         msg.ID,
		SessionKey: sessionKey,
		Role:       string(msg.Role),
		Content:    msg.Content,
		CreatedAt:  msg.CreatedAt,
	}, nil
}

func (s *chatService) GetHistory(ctx context.Context, sessionKey string, limit int) ([]dto.ChatMessageOutput, error) {
	// Verify session exists.
	exists, err := s.client.ChatSession.Query().
		Where(chatsession.SessionKey(sessionKey)).
		Exist(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.GetHistory check session: %w", err)
	}
	if !exists {
		return nil, apperror.NewNotFound("chat session not found")
	}

	if limit <= 0 || limit > 200 {
		limit = 50
	}

	messages, err := s.client.ChatMessage.Query().
		Where(chatmessage.SessionKey(sessionKey)).
		WithAgent().
		Order(generated.Asc(chatmessage.FieldCreatedAt)).
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.GetHistory: %w", err)
	}

	outputs := make([]dto.ChatMessageOutput, len(messages))
	for i, msg := range messages {
		outputs[i] = dto.ChatMessageOutput{
			ID:         msg.ID,
			SessionKey: msg.SessionKey,
			Role:       string(msg.Role),
			Content:    msg.Content,
			Metadata:   msg.Metadata,
			CreatedAt:  msg.CreatedAt,
		}
		if msg.Edges.Agent != nil {
			outputs[i].AgentName = msg.Edges.Agent.Name
		}
	}

	return outputs, nil
}

func (s *chatService) ListSessions(ctx context.Context, boardID uuid.UUID, opts dto.ListSessionsOptions) (*dto.PaginatedResponse[dto.SessionOutput], error) {
	query := s.client.ChatSession.Query().
		Where(chatsession.BoardID(boardID)).
		Order(generated.Desc(chatsession.FieldCreatedAt))

	if opts.Status != "" {
		query = query.Where(chatsession.StatusEQ(chatsession.Status(opts.Status)))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.ListSessions count: %w", err)
	}

	sessions, err := query.
		WithAgent().
		Limit(opts.Limit()).
		Offset(opts.Offset()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.ListSessions: %w", err)
	}

	items := make([]dto.SessionOutput, len(sessions))
	for i, sess := range sessions {
		items[i] = s.sessionToOutput(ctx, sess)
	}

	return &dto.PaginatedResponse[dto.SessionOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *chatService) AbortGeneration(ctx context.Context, sessionKey string) error {
	// Look up the session and its gateway.
	session, err := s.client.ChatSession.Query().
		Where(chatsession.SessionKey(sessionKey)).
		WithAgent().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("chat session not found")
		}
		return fmt.Errorf("service.ChatService.AbortGeneration lookup: %w", err)
	}

	if session.Status != chatsession.StatusActive {
		return apperror.NewConflict("chat session is not active")
	}

	if session.Edges.Agent == nil || session.Edges.Agent.GatewayID == nil {
		return apperror.NewGatewayError("agent has no gateway connection")
	}

	gwClient, err := s.manager.GetClient(*session.Edges.Agent.GatewayID)
	if err != nil {
		return apperror.NewGatewayError(fmt.Sprintf("gateway not connected: %v", err))
	}

	params := map[string]interface{}{
		"sessionKey": sessionKey,
	}

	if _, err := gwClient.Call(ctx, "chat.abort", params); err != nil {
		return apperror.NewGatewayError(fmt.Sprintf("failed to abort generation: %v", err))
	}

	slog.Info("chat generation aborted", "session_key", sessionKey)
	return nil
}

func (s *chatService) EndSession(ctx context.Context, sessionKey string) error {
	session, err := s.client.ChatSession.Query().
		Where(chatsession.SessionKey(sessionKey)).
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("chat session not found")
		}
		return fmt.Errorf("service.ChatService.EndSession lookup: %w", err)
	}

	_, err = s.client.ChatSession.UpdateOneID(session.ID).
		SetStatus(chatsession.StatusCompleted).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("service.ChatService.EndSession update: %w", err)
	}

	s.publishChatEvent(ctx, session.BoardID, "session.ended", map[string]any{
		"session_key": sessionKey,
		"board_id":    session.BoardID.String(),
	})

	slog.Info("chat session ended", "session_key", sessionKey)
	return nil
}

func (s *chatService) PersistAssistantMessage(ctx context.Context, sessionKey, content string, metadata map[string]any) (*dto.ChatMessageOutput, error) {
	// Look up the session to get the agent and board info.
	session, err := s.client.ChatSession.Query().
		Where(chatsession.SessionKey(sessionKey)).
		WithAgent().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("chat session not found for incoming message")
		}
		return nil, fmt.Errorf("service.ChatService.PersistAssistantMessage lookup: %w", err)
	}

	builder := s.client.ChatMessage.Create().
		SetSessionKey(sessionKey).
		SetBoardID(session.BoardID).
		SetAgentID(session.AgentID).
		SetRole(chatmessage.RoleAssistant).
		SetContent(content)

	if session.TaskID != nil {
		builder.SetTaskID(*session.TaskID)
	}
	if metadata != nil {
		builder.SetMetadata(metadata)
	}

	msg, err := builder.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.ChatService.PersistAssistantMessage save: %w", err)
	}

	agentName := ""
	if session.Edges.Agent != nil {
		agentName = session.Edges.Agent.Name
	}

	slog.Debug("assistant message persisted",
		"session_key", sessionKey,
		"message_id", msg.ID,
		"agent_name", agentName,
	)

	return &dto.ChatMessageOutput{
		ID:         msg.ID,
		SessionKey: sessionKey,
		Role:       string(msg.Role),
		Content:    msg.Content,
		Metadata:   msg.Metadata,
		AgentName:  agentName,
		CreatedAt:  msg.CreatedAt,
	}, nil
}

func (s *chatService) GetSessionByKey(ctx context.Context, sessionKey string) (*dto.SessionOutput, error) {
	session, err := s.client.ChatSession.Query().
		Where(chatsession.SessionKey(sessionKey)).
		WithAgent().
		Only(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("chat session not found")
		}
		return nil, fmt.Errorf("service.ChatService.GetSessionByKey: %w", err)
	}

	out := s.sessionToOutput(ctx, session)
	return &out, nil
}

// sessionToOutput converts an ent ChatSession to a DTO.
func (s *chatService) sessionToOutput(_ context.Context, sess *generated.ChatSession) dto.SessionOutput {
	out := dto.SessionOutput{
		SessionKey: sess.SessionKey,
		BoardID:    sess.BoardID,
		AgentID:    sess.AgentID,
		TaskID:     sess.TaskID,
		Status:     string(sess.Status),
		CreatedAt:  sess.CreatedAt,
		UpdatedAt:  sess.UpdatedAt,
	}

	if sess.Edges.Agent != nil {
		out.AgentName = sess.Edges.Agent.Name
	}

	// Get message count.
	count, err := s.client.ChatMessage.Query().
		Where(chatmessage.SessionKey(sess.SessionKey)).
		Count(context.Background())
	if err == nil {
		out.MessageCount = count
	}

	return out
}

// publishChatEvent publishes a chat-related event to NATS.
func (s *chatService) publishChatEvent(ctx context.Context, boardID uuid.UUID, eventType string, payload map[string]any) {
	if s.bus == nil || !s.bus.IsConnected() {
		return
	}

	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("failed to marshal chat event", "error", err, "event_type", eventType)
		return
	}

	subject := fmt.Sprintf("mc.chat.%s.%s", boardID.String(), eventType)
	if err := s.bus.Publish(ctx, subject, data); err != nil {
		slog.Error("failed to publish chat event", "error", err, "subject", subject)
	}
}

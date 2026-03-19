package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/nats-io/nats.go"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/events"
)

// ChatEventListener subscribes to gateway chat events via NATS and persists
// assistant messages to the database, then re-publishes them for WebSocket delivery.
type ChatEventListener struct {
	bus             *events.Bus
	chatSvc         ChatService
	orchestratorSvc OrchestratorService
}

// NewChatEventListener creates a new listener for gateway chat events.
func NewChatEventListener(bus *events.Bus, chatSvc ChatService) *ChatEventListener {
	return &ChatEventListener{
		bus:     bus,
		chatSvc: chatSvc,
	}
}

// SetOrchestratorService sets the orchestrator for processing lead agent responses.
// This must be called after the OrchestratorService is initialized.
func (l *ChatEventListener) SetOrchestratorService(svc OrchestratorService) {
	l.orchestratorSvc = svc
}

// Run starts subscribing to gateway chat.message events. It blocks until the context is cancelled.
func (l *ChatEventListener) Run(ctx context.Context) {
	if l.bus == nil || !l.bus.IsConnected() {
		slog.Warn("chat event listener: NATS not connected, listener disabled")
		return
	}

	conn := l.bus.Conn()

	// Subscribe to all gateway chat.message events.
	// Subject pattern: mc.gateway.{gatewayID}.chat.message
	chatSub, err := conn.Subscribe("mc.gateway.*.chat.message", func(msg *nats.Msg) {
		l.handleChatMessage(ctx, msg)
	})
	if err != nil {
		slog.Error("chat event listener: failed to subscribe to chat.message", "error", err)
		return
	}

	// Subscribe to session.ended events for cleanup.
	sessionSub, err := conn.Subscribe("mc.gateway.*.session.ended", func(msg *nats.Msg) {
		l.handleSessionEnded(ctx, msg)
	})
	if err != nil {
		slog.Error("chat event listener: failed to subscribe to session.ended", "error", err)
		_ = chatSub.Unsubscribe()
		return
	}

	defer func() {
		if err := chatSub.Unsubscribe(); err != nil {
			slog.Error("chat event listener: unsubscribe chat error", "error", err)
		}
		if err := sessionSub.Unsubscribe(); err != nil {
			slog.Error("chat event listener: unsubscribe session error", "error", err)
		}
	}()

	slog.Info("chat event listener started",
		"subjects", []string{"mc.gateway.*.chat.message", "mc.gateway.*.session.ended"},
	)

	<-ctx.Done()
	slog.Info("chat event listener stopping")
}

// handleChatMessage processes incoming chat.message events from gateway forwarding.
func (l *ChatEventListener) handleChatMessage(ctx context.Context, msg *nats.Msg) {
	// Parse the gateway event envelope.
	var envelope struct {
		GatewayID string          `json:"gateway_id"`
		EventType string          `json:"event_type"`
		Data      json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(msg.Data, &envelope); err != nil {
		slog.Warn("chat event listener: failed to parse envelope",
			"subject", msg.Subject,
			"error", err,
		)
		return
	}

	// Parse the chat message data.
	var chatData struct {
		SessionKey string         `json:"sessionKey"`
		Role       string         `json:"role"`
		Content    string         `json:"content"`
		Metadata   map[string]any `json:"metadata"`
		Chunk      bool           `json:"chunk"`
		Final      bool           `json:"final"`
	}
	if err := json.Unmarshal(envelope.Data, &chatData); err != nil {
		slog.Warn("chat event listener: failed to parse chat data",
			"subject", msg.Subject,
			"error", err,
		)
		return
	}

	// Skip streaming chunks -- only persist complete messages or final chunks.
	if chatData.Chunk && !chatData.Final {
		l.forwardStreamChunk(ctx, chatData.SessionKey, chatData.Content, chatData.Metadata)
		return
	}

	// Only persist assistant messages (not echoes of user messages).
	if chatData.Role != "" && chatData.Role != "assistant" {
		return
	}

	if chatData.SessionKey == "" || chatData.Content == "" {
		slog.Debug("chat event listener: skipping empty message",
			"session_key", chatData.SessionKey,
		)
		return
	}

	// Persist the assistant message.
	output, err := l.chatSvc.PersistAssistantMessage(ctx, chatData.SessionKey, chatData.Content, chatData.Metadata)
	if err != nil {
		slog.Error("chat event listener: failed to persist assistant message",
			"session_key", chatData.SessionKey,
			"error", err,
		)
		return
	}

	// Re-publish to the board-specific chat topic for WebSocket delivery.
	l.publishToBoard(ctx, chatData.SessionKey, output)

	// Trigger lead agent orchestrator if configured.
	// This runs in a goroutine to avoid blocking message processing.
	if l.orchestratorSvc != nil {
		sessionKey := chatData.SessionKey
		content := chatData.Content
		go func() {
			if err := l.orchestratorSvc.HandleLeadResponse(context.Background(), sessionKey, content); err != nil {
				slog.Warn("orchestrator: failed to process lead response",
					"session_key", sessionKey,
					"error", err,
				)
			}
		}()
	}
}

// handleSessionEnded processes session.ended events from gateway forwarding.
func (l *ChatEventListener) handleSessionEnded(ctx context.Context, msg *nats.Msg) {
	var envelope struct {
		GatewayID string          `json:"gateway_id"`
		EventType string          `json:"event_type"`
		Data      json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(msg.Data, &envelope); err != nil {
		slog.Warn("chat event listener: failed to parse session.ended envelope",
			"subject", msg.Subject,
			"error", err,
		)
		return
	}

	var sessionData struct {
		SessionKey string `json:"sessionKey"`
	}
	if err := json.Unmarshal(envelope.Data, &sessionData); err != nil {
		slog.Warn("chat event listener: failed to parse session.ended data",
			"subject", msg.Subject,
			"error", err,
		)
		return
	}

	if sessionData.SessionKey == "" {
		return
	}

	if err := l.chatSvc.EndSession(ctx, sessionData.SessionKey); err != nil {
		// May already be ended; log but don't treat as fatal.
		if !strings.Contains(err.Error(), "not found") {
			slog.Warn("chat event listener: failed to end session",
				"session_key", sessionData.SessionKey,
				"error", err,
			)
		}
	}

	slog.Info("chat event listener: session ended via gateway event",
		"session_key", sessionData.SessionKey,
	)
}

// forwardStreamChunk publishes a streaming chunk to WebSocket without persisting.
func (l *ChatEventListener) forwardStreamChunk(ctx context.Context, sessionKey, content string, metadata map[string]any) {
	if l.bus == nil || !l.bus.IsConnected() {
		return
	}

	session, err := l.chatSvc.GetSessionByKey(ctx, sessionKey)
	if err != nil {
		return
	}

	payload := map[string]any{
		"session_key": sessionKey,
		"board_id":    session.BoardID.String(),
		"role":        "assistant",
		"content":     content,
		"chunk":       true,
		"metadata":    metadata,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	subject := "mc.chat." + session.BoardID.String() + ".stream"
	if pubErr := l.bus.Publish(ctx, subject, data); pubErr != nil {
		slog.Debug("chat event listener: failed to forward stream chunk",
			"session_key", sessionKey,
			"error", pubErr,
		)
	}
}

// publishToBoard re-publishes a persisted assistant message to the board's chat topic.
func (l *ChatEventListener) publishToBoard(ctx context.Context, sessionKey string, output *dto.ChatMessageOutput) {
	if l.bus == nil || !l.bus.IsConnected() || output == nil {
		return
	}

	session, err := l.chatSvc.GetSessionByKey(ctx, sessionKey)
	if err != nil {
		return
	}

	payload := map[string]any{
		"session_key": sessionKey,
		"message_id":  output.ID.String(),
		"board_id":    session.BoardID.String(),
		"role":        output.Role,
		"content":     output.Content,
		"agent_name":  output.AgentName,
		"metadata":    output.Metadata,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	subject := "mc.chat." + session.BoardID.String() + ".message"
	if pubErr := l.bus.Publish(ctx, subject, data); pubErr != nil {
		slog.Error("chat event listener: failed to publish to board",
			"session_key", sessionKey,
			"error", pubErr,
		)
	}
}

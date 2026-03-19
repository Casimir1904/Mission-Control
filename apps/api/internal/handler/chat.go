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

type CreateChatSessionRequest struct {
	BoardID uuid.UUID `path:"boardId" format:"uuid" doc:"Board ID"`
	Body    dto.CreateSessionInput
}

type CreateChatSessionResponse struct {
	Body dto.CreateSessionOutput
}

type SendChatMessageRequest struct {
	SessionKey string `path:"sessionKey" doc:"Session key"`
	Body       dto.SendMessageInput
}

type SendChatMessageResponse struct {
	Body dto.ChatMessageOutput
}

type GetChatHistoryRequest struct {
	SessionKey string `path:"sessionKey" doc:"Session key"`
	Limit      int    `query:"limit" minimum:"1" maximum:"200" default:"50" doc:"Max messages to return"`
}

type GetChatHistoryResponse struct {
	Body []dto.ChatMessageOutput
}

type ListChatSessionsRequest struct {
	PaginationParams
	BoardID uuid.UUID `path:"boardId" format:"uuid" doc:"Board ID"`
	Status  string    `query:"status" required:"false" enum:"active,completed,error" doc:"Filter by status"`
}

type ListChatSessionsResponse struct {
	Body dto.PaginatedResponse[dto.SessionOutput]
}

type AbortChatRequest struct {
	SessionKey string `path:"sessionKey" doc:"Session key"`
}

type EndChatSessionRequest struct {
	SessionKey string `path:"sessionKey" doc:"Session key"`
}

// registerChatRoutes registers all chat endpoints on the Huma API.
func registerChatRoutes(api huma.API, chatSvc service.ChatService) {
	huma.Register(api, huma.Operation{
		OperationID:   "create-chat-session",
		Method:        http.MethodPost,
		Path:          "/boards/{boardId}/chat/sessions",
		Summary:       "Create chat session",
		Description:   "Creates a new chat session with an agent on a board. If a task_id is provided and an active session already exists for that task, returns the existing session.",
		Tags:          []string{"chat"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *CreateChatSessionRequest) (*CreateChatSessionResponse, error) {
		slog.Info("creating chat session",
			"board_id", input.BoardID,
			"agent_id", input.Body.AgentID,
		)
		session, err := chatSvc.CreateSession(ctx, input.BoardID, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &CreateChatSessionResponse{Body: *session}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "send-chat-message",
		Method:        http.MethodPost,
		Path:          "/chat/sessions/{sessionKey}/messages",
		Summary:       "Send chat message",
		Description:   "Sends a message in an active chat session. The agent's response will arrive via WebSocket events.",
		Tags:          []string{"chat"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, input *SendChatMessageRequest) (*SendChatMessageResponse, error) {
		slog.Info("sending chat message", "session_key", input.SessionKey)
		msg, err := chatSvc.SendMessage(ctx, input.SessionKey, input.Body)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &SendChatMessageResponse{Body: *msg}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-chat-history",
		Method:      http.MethodGet,
		Path:        "/chat/sessions/{sessionKey}/messages",
		Summary:     "Get chat history",
		Description: "Returns the message history for a chat session, ordered chronologically.",
		Tags:        []string{"chat"},
	}, func(ctx context.Context, input *GetChatHistoryRequest) (*GetChatHistoryResponse, error) {
		messages, err := chatSvc.GetHistory(ctx, input.SessionKey, input.Limit)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetChatHistoryResponse{Body: messages}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-chat-sessions",
		Method:      http.MethodGet,
		Path:        "/boards/{boardId}/chat/sessions",
		Summary:     "List chat sessions",
		Description: "Lists chat sessions for a board with optional status filter and pagination.",
		Tags:        []string{"chat"},
	}, func(ctx context.Context, input *ListChatSessionsRequest) (*ListChatSessionsResponse, error) {
		opts := dto.ListSessionsOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			Status:      input.Status,
		}
		result, err := chatSvc.ListSessions(ctx, input.BoardID, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListChatSessionsResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "abort-chat-generation",
		Method:        http.MethodPost,
		Path:          "/chat/sessions/{sessionKey}/abort",
		Summary:       "Abort generation",
		Description:   "Aborts the current agent generation in a chat session.",
		Tags:          []string{"chat"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *AbortChatRequest) (*struct{}, error) {
		slog.Info("aborting chat generation", "session_key", input.SessionKey)
		if err := chatSvc.AbortGeneration(ctx, input.SessionKey); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "end-chat-session",
		Method:        http.MethodDelete,
		Path:          "/chat/sessions/{sessionKey}",
		Summary:       "End chat session",
		Description:   "Ends a chat session, marking it as completed.",
		Tags:          []string{"chat"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *EndChatSessionRequest) (*struct{}, error) {
		slog.Info("ending chat session", "session_key", input.SessionKey)
		if err := chatSvc.EndSession(ctx, input.SessionKey); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

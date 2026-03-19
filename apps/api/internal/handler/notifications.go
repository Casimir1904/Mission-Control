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

type ListNotificationsRequest struct {
	PaginationParams
	Read string `query:"read" required:"false" doc:"Filter by read status (true/false)"`
}

type ListNotificationsResponse struct {
	Body dto.PaginatedResponse[dto.NotificationOutput]
}

type GetUnreadCountResponse struct {
	Body dto.UnreadCountOutput
}

type MarkNotificationReadRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Notification ID"`
}

type MarkNotificationReadResponse struct {
	Body dto.NotificationOutput
}

type MarkAllNotificationsReadResponse struct {
	Body struct {
		Message string `json:"message"`
	}
}

type DeleteNotificationRequest struct {
	ID uuid.UUID `path:"id" format:"uuid" doc:"Notification ID"`
}

// registerNotificationRoutes registers all notification endpoints on the Huma API.
func registerNotificationRoutes(api huma.API, notifSvc service.NotificationService) {
	// Placeholder user ID until auth is wired in.
	placeholderUserID := uuid.MustParse("00000000-0000-0000-0000-000000000001")

	huma.Register(api, huma.Operation{
		OperationID: "list-notifications",
		Method:      http.MethodGet,
		Path:        "/notifications",
		Summary:     "List notifications",
		Description: "Lists notifications for the current user with optional read/unread filter.",
		Tags:        []string{"notifications"},
	}, func(ctx context.Context, input *ListNotificationsRequest) (*ListNotificationsResponse, error) {
		opts := dto.ListNotificationOptions{
			ListOptions: input.PaginationParams.ToListOptions(),
			UserID:      placeholderUserID,
		}
		if input.Read == "true" {
			v := true
			opts.Read = &v
		} else if input.Read == "false" {
			v := false
			opts.Read = &v
		}
		result, err := notifSvc.List(ctx, opts)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &ListNotificationsResponse{Body: *result}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-unread-count",
		Method:      http.MethodGet,
		Path:        "/notifications/unread-count",
		Summary:     "Get unread notification count",
		Description: "Returns the number of unread notifications for the current user.",
		Tags:        []string{"notifications"},
	}, func(ctx context.Context, input *struct{}) (*GetUnreadCountResponse, error) {
		count, err := notifSvc.GetUnreadCount(ctx, placeholderUserID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &GetUnreadCountResponse{Body: dto.UnreadCountOutput{Count: count}}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "mark-notification-read",
		Method:      http.MethodPost,
		Path:        "/notifications/{id}/read",
		Summary:     "Mark notification as read",
		Description: "Marks a single notification as read.",
		Tags:        []string{"notifications"},
	}, func(ctx context.Context, input *MarkNotificationReadRequest) (*MarkNotificationReadResponse, error) {
		slog.Info("marking notification as read", "id", input.ID)
		notif, err := notifSvc.MarkRead(ctx, input.ID)
		if err != nil {
			return nil, toHumaError(err)
		}
		return &MarkNotificationReadResponse{Body: *notif}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "mark-all-notifications-read",
		Method:      http.MethodPost,
		Path:        "/notifications/read-all",
		Summary:     "Mark all notifications as read",
		Description: "Marks all unread notifications as read for the current user.",
		Tags:        []string{"notifications"},
	}, func(ctx context.Context, input *struct{}) (*MarkAllNotificationsReadResponse, error) {
		slog.Info("marking all notifications as read")
		if err := notifSvc.MarkAllRead(ctx, placeholderUserID); err != nil {
			return nil, toHumaError(err)
		}
		return &MarkAllNotificationsReadResponse{
			Body: struct {
				Message string `json:"message"`
			}{Message: "all notifications marked as read"},
		}, nil
	})

	huma.Register(api, huma.Operation{
		OperationID:   "delete-notification",
		Method:        http.MethodDelete,
		Path:          "/notifications/{id}",
		Summary:       "Delete notification",
		Description:   "Deletes a notification by ID.",
		Tags:          []string{"notifications"},
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, input *DeleteNotificationRequest) (*struct{}, error) {
		slog.Info("deleting notification", "id", input.ID)
		if err := notifSvc.Delete(ctx, input.ID); err != nil {
			return nil, toHumaError(err)
		}
		return nil, nil
	})
}

package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/dto"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated"
	"github.com/Casimir1904/Mission-Control/apps/api/internal/ent/generated/notification"
)

// NotificationService defines the interface for notification operations.
type NotificationService interface {
	Create(ctx context.Context, userID uuid.UUID, title, body, channel string) (*dto.NotificationOutput, error)
	List(ctx context.Context, opts dto.ListNotificationOptions) (*dto.PaginatedResponse[dto.NotificationOutput], error)
	MarkRead(ctx context.Context, id uuid.UUID) (*dto.NotificationOutput, error)
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type notificationService struct {
	client *generated.Client
}

// NewNotificationService creates a new NotificationService backed by the Ent client.
func NewNotificationService(client *generated.Client) NotificationService {
	return &notificationService{client: client}
}

func (s *notificationService) Create(ctx context.Context, userID uuid.UUID, title, body, channel string) (*dto.NotificationOutput, error) {
	if title == "" {
		return nil, apperror.NewValidation("notification title is required")
	}

	ch := notification.ChannelInApp
	if channel == "webhook" {
		ch = notification.ChannelWebhook
	}

	n, err := s.client.Notification.Create().
		SetUserID(userID).
		SetTitle(title).
		SetBody(body).
		SetChannel(ch).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.NotificationService.Create: %w", err)
	}

	slog.Info("notification created", "id", n.ID, "user_id", userID, "title", title)
	return notificationToOutput(n), nil
}

func (s *notificationService) List(ctx context.Context, opts dto.ListNotificationOptions) (*dto.PaginatedResponse[dto.NotificationOutput], error) {
	query := s.client.Notification.Query().
		Where(notification.UserID(opts.UserID)).
		Order(generated.Desc(notification.FieldCreatedAt))

	if opts.Read != nil {
		query = query.Where(notification.ReadEQ(*opts.Read))
	}

	total, err := query.Clone().Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.NotificationService.List count: %w", err)
	}

	notifications, err := query.
		Offset(opts.Offset()).
		Limit(opts.Limit()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("service.NotificationService.List: %w", err)
	}

	items := make([]dto.NotificationOutput, len(notifications))
	for i, n := range notifications {
		items[i] = *notificationToOutput(n)
	}

	return &dto.PaginatedResponse[dto.NotificationOutput]{
		Items:   items,
		Total:   total,
		Page:    opts.Page,
		PerPage: opts.Limit(),
	}, nil
}

func (s *notificationService) MarkRead(ctx context.Context, id uuid.UUID) (*dto.NotificationOutput, error) {
	n, err := s.client.Notification.UpdateOneID(id).
		SetRead(true).
		Save(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return nil, apperror.NewNotFound("notification not found")
		}
		return nil, fmt.Errorf("service.NotificationService.MarkRead: %w", err)
	}

	slog.Info("notification marked as read", "id", id)
	return notificationToOutput(n), nil
}

func (s *notificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	count, err := s.client.Notification.Update().
		Where(
			notification.UserID(userID),
			notification.ReadEQ(false),
		).
		SetRead(true).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("service.NotificationService.MarkAllRead: %w", err)
	}

	slog.Info("all notifications marked as read", "user_id", userID, "count", count)
	return nil
}

func (s *notificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	count, err := s.client.Notification.Query().
		Where(
			notification.UserID(userID),
			notification.ReadEQ(false),
		).
		Count(ctx)
	if err != nil {
		return 0, fmt.Errorf("service.NotificationService.GetUnreadCount: %w", err)
	}
	return count, nil
}

func (s *notificationService) Delete(ctx context.Context, id uuid.UUID) error {
	err := s.client.Notification.DeleteOneID(id).Exec(ctx)
	if err != nil {
		if generated.IsNotFound(err) {
			return apperror.NewNotFound("notification not found")
		}
		return fmt.Errorf("service.NotificationService.Delete: %w", err)
	}

	slog.Info("notification deleted", "id", id)
	return nil
}

func notificationToOutput(n *generated.Notification) *dto.NotificationOutput {
	return &dto.NotificationOutput{
		ID:        n.ID,
		Title:     n.Title,
		Body:      n.Body,
		Read:      n.Read,
		Channel:   string(n.Channel),
		CreatedAt: n.CreatedAt,
	}
}

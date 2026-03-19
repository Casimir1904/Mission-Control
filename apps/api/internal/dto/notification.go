package dto

import (
	"time"

	"github.com/google/uuid"
)

// NotificationOutput is the API response for a notification.
type NotificationOutput struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body,omitempty"`
	Read      bool      `json:"read"`
	Channel   string    `json:"channel"`
	CreatedAt time.Time `json:"created_at"`
}

// ListNotificationOptions extends ListOptions with notification-specific filters.
type ListNotificationOptions struct {
	ListOptions
	UserID uuid.UUID `json:"user_id"`
	Read   *bool     `json:"read,omitempty"`
}

// UnreadCountOutput is the API response for the unread notification count.
type UnreadCountOutput struct {
	Count int `json:"count"`
}

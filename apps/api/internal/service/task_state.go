package service

import (
	"fmt"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
)

// TaskStatus represents valid task statuses.
type TaskStatus string

const (
	TaskStatusBacklog    TaskStatus = "backlog"
	TaskStatusTodo       TaskStatus = "todo"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusReview     TaskStatus = "review"
	TaskStatusApproved   TaskStatus = "approved"
	TaskStatusRejected   TaskStatus = "rejected"
	TaskStatusDone       TaskStatus = "done"
	TaskStatusBlocked    TaskStatus = "blocked"
)

// validTransitions defines the state machine for task status transitions.
// The key is the current status and the value is the set of valid target statuses.
var validTransitions = map[TaskStatus]map[TaskStatus]bool{
	TaskStatusBacklog: {
		TaskStatusTodo: true,
	},
	TaskStatusTodo: {
		TaskStatusInProgress: true,
		TaskStatusBlocked:    true,
	},
	TaskStatusInProgress: {
		TaskStatusReview:  true,
		TaskStatusBlocked: true,
		TaskStatusTodo:    true,
	},
	TaskStatusReview: {
		TaskStatusApproved: true,
		TaskStatusRejected: true,
	},
	TaskStatusApproved: {
		TaskStatusDone: true,
	},
	TaskStatusRejected: {
		TaskStatusInProgress: true,
	},
	TaskStatusBlocked: {
		TaskStatusTodo:       true,
		TaskStatusInProgress: true,
	},
	TaskStatusDone: {
		// Terminal state -- only reopen is allowed.
		TaskStatusTodo: true,
	},
}

// ValidateTransition checks if a status transition is valid per the state machine.
// Returns an AppError with conflict status if the transition is not allowed.
func ValidateTransition(from, to TaskStatus) *apperror.AppError {
	targets, ok := validTransitions[from]
	if !ok {
		return apperror.NewConflict(
			fmt.Sprintf("unknown current status %q", from),
		)
	}
	if !targets[to] {
		return apperror.NewConflict(
			fmt.Sprintf("invalid transition from %q to %q", from, to),
		)
	}
	return nil
}

// IsValidStatus returns true if the given string is a valid task status.
func IsValidStatus(s string) bool {
	switch TaskStatus(s) {
	case TaskStatusBacklog, TaskStatusTodo, TaskStatusInProgress,
		TaskStatusReview, TaskStatusApproved, TaskStatusRejected,
		TaskStatusDone, TaskStatusBlocked:
		return true
	}
	return false
}

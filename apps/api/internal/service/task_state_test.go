package service_test

import (
	"net/http"
	"testing"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/service"
)

// TestValidateTransition_AllowedTransitions verifies every valid edge in the
// task state machine. Each case must return nil (no error).
func TestValidateTransition_AllowedTransitions(t *testing.T) {
	tests := []struct {
		name string
		from service.TaskStatus
		to   service.TaskStatus
	}{
		// backlog
		{"backlog -> todo", service.TaskStatusBacklog, service.TaskStatusTodo},

		// todo
		{"todo -> in_progress", service.TaskStatusTodo, service.TaskStatusInProgress},
		{"todo -> blocked", service.TaskStatusTodo, service.TaskStatusBlocked},

		// in_progress
		{"in_progress -> review", service.TaskStatusInProgress, service.TaskStatusReview},
		{"in_progress -> blocked", service.TaskStatusInProgress, service.TaskStatusBlocked},
		{"in_progress -> todo", service.TaskStatusInProgress, service.TaskStatusTodo},

		// review
		{"review -> approved", service.TaskStatusReview, service.TaskStatusApproved},
		{"review -> rejected", service.TaskStatusReview, service.TaskStatusRejected},

		// approved
		{"approved -> done", service.TaskStatusApproved, service.TaskStatusDone},

		// rejected
		{"rejected -> in_progress", service.TaskStatusRejected, service.TaskStatusInProgress},

		// blocked
		{"blocked -> todo", service.TaskStatusBlocked, service.TaskStatusTodo},
		{"blocked -> in_progress", service.TaskStatusBlocked, service.TaskStatusInProgress},

		// done (reopen)
		{"done -> todo (reopen)", service.TaskStatusDone, service.TaskStatusTodo},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateTransition(tt.from, tt.to)
			if err != nil {
				t.Errorf("ValidateTransition(%q, %q) returned error %v, want nil", tt.from, tt.to, err)
			}
		})
	}
}

// TestValidateTransition_InvalidTransitions verifies that illegal state
// transitions return a conflict error (HTTP 409).
func TestValidateTransition_InvalidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from service.TaskStatus
		to   service.TaskStatus
	}{
		// backlog: can only go to todo
		{"backlog -> in_progress", service.TaskStatusBacklog, service.TaskStatusInProgress},
		{"backlog -> review", service.TaskStatusBacklog, service.TaskStatusReview},
		{"backlog -> done", service.TaskStatusBacklog, service.TaskStatusDone},
		{"backlog -> blocked", service.TaskStatusBacklog, service.TaskStatusBlocked},
		{"backlog -> approved", service.TaskStatusBacklog, service.TaskStatusApproved},
		{"backlog -> rejected", service.TaskStatusBacklog, service.TaskStatusRejected},

		// todo: can only go to in_progress, blocked
		{"todo -> backlog", service.TaskStatusTodo, service.TaskStatusBacklog},
		{"todo -> review", service.TaskStatusTodo, service.TaskStatusReview},
		{"todo -> done", service.TaskStatusTodo, service.TaskStatusDone},
		{"todo -> approved", service.TaskStatusTodo, service.TaskStatusApproved},
		{"todo -> rejected", service.TaskStatusTodo, service.TaskStatusRejected},

		// in_progress: can go to review, blocked, todo
		{"in_progress -> backlog", service.TaskStatusInProgress, service.TaskStatusBacklog},
		{"in_progress -> done", service.TaskStatusInProgress, service.TaskStatusDone},
		{"in_progress -> approved", service.TaskStatusInProgress, service.TaskStatusApproved},
		{"in_progress -> rejected", service.TaskStatusInProgress, service.TaskStatusRejected},

		// review: can only go to approved, rejected
		{"review -> backlog", service.TaskStatusReview, service.TaskStatusBacklog},
		{"review -> todo", service.TaskStatusReview, service.TaskStatusTodo},
		{"review -> in_progress", service.TaskStatusReview, service.TaskStatusInProgress},
		{"review -> done", service.TaskStatusReview, service.TaskStatusDone},
		{"review -> blocked", service.TaskStatusReview, service.TaskStatusBlocked},

		// approved: can only go to done
		{"approved -> backlog", service.TaskStatusApproved, service.TaskStatusBacklog},
		{"approved -> todo", service.TaskStatusApproved, service.TaskStatusTodo},
		{"approved -> in_progress", service.TaskStatusApproved, service.TaskStatusInProgress},
		{"approved -> review", service.TaskStatusApproved, service.TaskStatusReview},
		{"approved -> blocked", service.TaskStatusApproved, service.TaskStatusBlocked},
		{"approved -> rejected", service.TaskStatusApproved, service.TaskStatusRejected},

		// rejected: can only go to in_progress
		{"rejected -> backlog", service.TaskStatusRejected, service.TaskStatusBacklog},
		{"rejected -> todo", service.TaskStatusRejected, service.TaskStatusTodo},
		{"rejected -> review", service.TaskStatusRejected, service.TaskStatusReview},
		{"rejected -> done", service.TaskStatusRejected, service.TaskStatusDone},
		{"rejected -> approved", service.TaskStatusRejected, service.TaskStatusApproved},
		{"rejected -> blocked", service.TaskStatusRejected, service.TaskStatusBlocked},

		// blocked: can go to todo, in_progress
		{"blocked -> backlog", service.TaskStatusBlocked, service.TaskStatusBacklog},
		{"blocked -> review", service.TaskStatusBlocked, service.TaskStatusReview},
		{"blocked -> done", service.TaskStatusBlocked, service.TaskStatusDone},
		{"blocked -> approved", service.TaskStatusBlocked, service.TaskStatusApproved},
		{"blocked -> rejected", service.TaskStatusBlocked, service.TaskStatusRejected},

		// done: can only go to todo (reopen)
		{"done -> backlog", service.TaskStatusDone, service.TaskStatusBacklog},
		{"done -> in_progress", service.TaskStatusDone, service.TaskStatusInProgress},
		{"done -> review", service.TaskStatusDone, service.TaskStatusReview},
		{"done -> approved", service.TaskStatusDone, service.TaskStatusApproved},
		{"done -> rejected", service.TaskStatusDone, service.TaskStatusRejected},
		{"done -> blocked", service.TaskStatusDone, service.TaskStatusBlocked},

		// Self-transitions should be invalid for all states.
		{"backlog -> backlog", service.TaskStatusBacklog, service.TaskStatusBacklog},
		{"todo -> todo", service.TaskStatusTodo, service.TaskStatusTodo},
		{"in_progress -> in_progress", service.TaskStatusInProgress, service.TaskStatusInProgress},
		{"review -> review", service.TaskStatusReview, service.TaskStatusReview},
		{"approved -> approved", service.TaskStatusApproved, service.TaskStatusApproved},
		{"rejected -> rejected", service.TaskStatusRejected, service.TaskStatusRejected},
		{"done -> done", service.TaskStatusDone, service.TaskStatusDone},
		{"blocked -> blocked", service.TaskStatusBlocked, service.TaskStatusBlocked},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateTransition(tt.from, tt.to)
			if err == nil {
				t.Errorf("ValidateTransition(%q, %q) returned nil, want conflict error", tt.from, tt.to)
			}
			if err != nil && err.Status != http.StatusConflict {
				t.Errorf("ValidateTransition(%q, %q) status = %d, want %d", tt.from, tt.to, err.Status, http.StatusConflict)
			}
		})
	}
}

// TestValidateTransition_UnknownStatus verifies that an unknown source status
// returns a conflict error mentioning "unknown".
func TestValidateTransition_UnknownStatus(t *testing.T) {
	unknown := service.TaskStatus("nonexistent")
	err := service.ValidateTransition(unknown, service.TaskStatusTodo)
	if err == nil {
		t.Fatal("ValidateTransition with unknown source status returned nil, want error")
	}
	if err.Status != http.StatusConflict {
		t.Errorf("error status = %d, want %d", err.Status, http.StatusConflict)
	}
}

// TestValidateTransition_FullLifecycle walks the complete happy-path lifecycle:
// backlog -> todo -> in_progress -> review -> approved -> done
func TestValidateTransition_FullLifecycle(t *testing.T) {
	lifecycle := []service.TaskStatus{
		service.TaskStatusBacklog,
		service.TaskStatusTodo,
		service.TaskStatusInProgress,
		service.TaskStatusReview,
		service.TaskStatusApproved,
		service.TaskStatusDone,
	}

	for i := 0; i < len(lifecycle)-1; i++ {
		from := lifecycle[i]
		to := lifecycle[i+1]
		err := service.ValidateTransition(from, to)
		if err != nil {
			t.Errorf("lifecycle step %d: ValidateTransition(%q, %q) = %v, want nil", i, from, to, err)
		}
	}
}

// TestValidateTransition_RejectionLoop tests the review-rejection-rework cycle:
// review -> rejected -> in_progress -> review -> approved -> done
func TestValidateTransition_RejectionLoop(t *testing.T) {
	steps := []service.TaskStatus{
		service.TaskStatusReview,
		service.TaskStatusRejected,
		service.TaskStatusInProgress,
		service.TaskStatusReview,
		service.TaskStatusApproved,
		service.TaskStatusDone,
	}

	for i := 0; i < len(steps)-1; i++ {
		from := steps[i]
		to := steps[i+1]
		err := service.ValidateTransition(from, to)
		if err != nil {
			t.Errorf("rejection loop step %d: ValidateTransition(%q, %q) = %v, want nil", i, from, to, err)
		}
	}
}

// TestValidateTransition_BlockedPaths tests the blocked workflow:
// in_progress -> blocked -> todo -> in_progress
func TestValidateTransition_BlockedPaths(t *testing.T) {
	steps := []service.TaskStatus{
		service.TaskStatusInProgress,
		service.TaskStatusBlocked,
		service.TaskStatusTodo,
		service.TaskStatusInProgress,
	}

	for i := 0; i < len(steps)-1; i++ {
		from := steps[i]
		to := steps[i+1]
		err := service.ValidateTransition(from, to)
		if err != nil {
			t.Errorf("blocked path step %d: ValidateTransition(%q, %q) = %v, want nil", i, from, to, err)
		}
	}
}

// TestValidateTransition_ReopenFromDone verifies done -> todo (reopen) works.
func TestValidateTransition_ReopenFromDone(t *testing.T) {
	err := service.ValidateTransition(service.TaskStatusDone, service.TaskStatusTodo)
	if err != nil {
		t.Errorf("done -> todo (reopen) returned error: %v", err)
	}
}

// TestIsValidStatus tests the IsValidStatus helper for all known and unknown values.
func TestIsValidStatus(t *testing.T) {
	valid := []string{
		"backlog", "todo", "in_progress", "review",
		"approved", "rejected", "done", "blocked",
	}
	for _, s := range valid {
		if !service.IsValidStatus(s) {
			t.Errorf("IsValidStatus(%q) = false, want true", s)
		}
	}

	invalid := []string{
		"", "unknown", "BACKLOG", "Todo", "pending",
		"in-progress", "cancelled", "archived",
	}
	for _, s := range invalid {
		if service.IsValidStatus(s) {
			t.Errorf("IsValidStatus(%q) = true, want false", s)
		}
	}
}

// TestTaskStatusConstants ensures the string values of TaskStatus constants
// match the expected lowercase underscore format.
func TestTaskStatusConstants(t *testing.T) {
	tests := []struct {
		status service.TaskStatus
		want   string
	}{
		{service.TaskStatusBacklog, "backlog"},
		{service.TaskStatusTodo, "todo"},
		{service.TaskStatusInProgress, "in_progress"},
		{service.TaskStatusReview, "review"},
		{service.TaskStatusApproved, "approved"},
		{service.TaskStatusRejected, "rejected"},
		{service.TaskStatusDone, "done"},
		{service.TaskStatusBlocked, "blocked"},
	}

	for _, tt := range tests {
		if string(tt.status) != tt.want {
			t.Errorf("TaskStatus constant = %q, want %q", tt.status, tt.want)
		}
	}
}

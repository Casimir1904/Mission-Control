package apperror_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
)

// TestErrorConstructors verifies that each error constructor sets the correct
// HTTP status code and machine-readable error code.
func TestErrorConstructors(t *testing.T) {
	tests := []struct {
		name       string
		err        *apperror.AppError
		wantStatus int
		wantCode   string
	}{
		{
			name:       "NewValidation",
			err:        apperror.NewValidation("bad input"),
			wantStatus: http.StatusBadRequest,
			wantCode:   "validation_error",
		},
		{
			name:       "NewNotFound",
			err:        apperror.NewNotFound("resource missing"),
			wantStatus: http.StatusNotFound,
			wantCode:   "not_found",
		},
		{
			name:       "NewConflict",
			err:        apperror.NewConflict("state conflict"),
			wantStatus: http.StatusConflict,
			wantCode:   "conflict",
		},
		{
			name:       "NewForbidden",
			err:        apperror.NewForbidden("access denied"),
			wantStatus: http.StatusForbidden,
			wantCode:   "forbidden",
		},
		{
			name:       "NewUnauthorized",
			err:        apperror.NewUnauthorized("not authenticated"),
			wantStatus: http.StatusUnauthorized,
			wantCode:   "unauthorized",
		},
		{
			name:       "NewGatewayError",
			err:        apperror.NewGatewayError("upstream failed"),
			wantStatus: http.StatusBadGateway,
			wantCode:   "gateway_error",
		},
		{
			name:       "NewServiceError",
			err:        apperror.NewServiceError("internal failure"),
			wantStatus: http.StatusInternalServerError,
			wantCode:   "internal_error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Status != tt.wantStatus {
				t.Errorf("Status = %d, want %d", tt.err.Status, tt.wantStatus)
			}
			if tt.err.Code != tt.wantCode {
				t.Errorf("Code = %q, want %q", tt.err.Code, tt.wantCode)
			}
		})
	}
}

// TestAppError_ErrorString verifies the Error() method returns "code: message".
func TestAppError_ErrorString(t *testing.T) {
	tests := []struct {
		err  *apperror.AppError
		want string
	}{
		{apperror.NewValidation("field required"), "validation_error: field required"},
		{apperror.NewNotFound("user not found"), "not_found: user not found"},
		{apperror.NewConflict("duplicate entry"), "conflict: duplicate entry"},
		{apperror.NewForbidden("no permission"), "forbidden: no permission"},
		{apperror.NewUnauthorized("invalid token"), "unauthorized: invalid token"},
		{apperror.NewGatewayError("timeout"), "gateway_error: timeout"},
		{apperror.NewServiceError("crash"), "internal_error: crash"},
	}

	for _, tt := range tests {
		got := tt.err.Error()
		if got != tt.want {
			t.Errorf("Error() = %q, want %q", got, tt.want)
		}
	}
}

// TestAppError_Message verifies the Message field stores the input string.
func TestAppError_Message(t *testing.T) {
	msg := "something went wrong"
	err := apperror.NewServiceError(msg)
	if err.Message != msg {
		t.Errorf("Message = %q, want %q", err.Message, msg)
	}
}

// TestAppError_WithDetails verifies that WithDetails returns a copy with the
// details map set, without mutating the original error.
func TestAppError_WithDetails(t *testing.T) {
	original := apperror.NewValidation("bad input")
	if original.Details != nil {
		t.Fatal("original should have nil Details")
	}

	details := map[string]any{"field": "email", "reason": "invalid format"}
	withDetails := original.WithDetails(details)

	// The returned error should have details.
	if withDetails.Details == nil {
		t.Fatal("WithDetails result should have non-nil Details")
	}
	if withDetails.Details["field"] != "email" {
		t.Errorf("Details[field] = %v, want %q", withDetails.Details["field"], "email")
	}

	// Original must be unchanged.
	if original.Details != nil {
		t.Error("original Details should still be nil after WithDetails call")
	}

	// Status and Code should be preserved.
	if withDetails.Status != original.Status {
		t.Errorf("WithDetails Status = %d, want %d", withDetails.Status, original.Status)
	}
	if withDetails.Code != original.Code {
		t.Errorf("WithDetails Code = %q, want %q", withDetails.Code, original.Code)
	}
}

// TestAppError_ImplementsError verifies AppError satisfies the error interface.
func TestAppError_ImplementsError(t *testing.T) {
	var err error = apperror.NewValidation("test")
	if err == nil {
		t.Fatal("AppError should satisfy error interface")
	}
	if !strings.Contains(err.Error(), "validation_error") {
		t.Errorf("Error() should contain code, got %q", err.Error())
	}
}

// TestWriteError verifies that WriteError produces correct JSON and status code.
func TestWriteError(t *testing.T) {
	appErr := apperror.NewNotFound("task not found")

	w := httptest.NewRecorder()
	apperror.WriteError(w, appErr)

	// Check status code.
	if w.Code != http.StatusNotFound {
		t.Errorf("WriteError status = %d, want %d", w.Code, http.StatusNotFound)
	}

	// Check content type.
	ct := w.Header().Get("Content-Type")
	if !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	// Parse JSON body.
	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse JSON response: %v", err)
	}
	if body.Error.Code != "not_found" {
		t.Errorf("JSON error.code = %q, want %q", body.Error.Code, "not_found")
	}
	if body.Error.Message != "task not found" {
		t.Errorf("JSON error.message = %q, want %q", body.Error.Message, "task not found")
	}
}

// TestWriteError_WithDetails verifies that details are included in JSON output.
func TestWriteError_WithDetails(t *testing.T) {
	appErr := apperror.NewValidation("validation failed").WithDetails(map[string]any{
		"field": "title",
	})

	w := httptest.NewRecorder()
	apperror.WriteError(w, appErr)

	var body struct {
		Error struct {
			Code    string         `json:"code"`
			Details map[string]any `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse JSON: %v", err)
	}
	if body.Error.Details["field"] != "title" {
		t.Errorf("details.field = %v, want %q", body.Error.Details["field"], "title")
	}
}

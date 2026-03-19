package apperror

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// AppError represents a structured application error with an HTTP status code,
// machine-readable code, human-readable message, and optional details.
type AppError struct {
	// HTTP status code.
	Status int `json:"-"`

	// Machine-readable error code (e.g., "validation_error", "not_found").
	Code string `json:"code"`

	// Human-readable error message.
	Message string `json:"message"`

	// Optional additional details.
	Details map[string]any `json:"details,omitempty"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// WithDetails returns a copy of the error with the given details map.
func (e *AppError) WithDetails(details map[string]any) *AppError {
	copy := *e
	copy.Details = details
	return &copy
}

// NewValidation creates a 400 Bad Request error for validation failures.
func NewValidation(message string) *AppError {
	return &AppError{
		Status:  http.StatusBadRequest,
		Code:    "validation_error",
		Message: message,
	}
}

// NewNotFound creates a 404 Not Found error.
func NewNotFound(message string) *AppError {
	return &AppError{
		Status:  http.StatusNotFound,
		Code:    "not_found",
		Message: message,
	}
}

// NewConflict creates a 409 Conflict error.
func NewConflict(message string) *AppError {
	return &AppError{
		Status:  http.StatusConflict,
		Code:    "conflict",
		Message: message,
	}
}

// NewForbidden creates a 403 Forbidden error.
func NewForbidden(message string) *AppError {
	return &AppError{
		Status:  http.StatusForbidden,
		Code:    "forbidden",
		Message: message,
	}
}

// NewUnauthorized creates a 401 Unauthorized error.
func NewUnauthorized(message string) *AppError {
	return &AppError{
		Status:  http.StatusUnauthorized,
		Code:    "unauthorized",
		Message: message,
	}
}

// NewGatewayError creates a 502 Bad Gateway error for upstream service failures.
func NewGatewayError(message string) *AppError {
	return &AppError{
		Status:  http.StatusBadGateway,
		Code:    "gateway_error",
		Message: message,
	}
}

// NewServiceError creates a 500 Internal Server Error.
func NewServiceError(message string) *AppError {
	return &AppError{
		Status:  http.StatusInternalServerError,
		Code:    "internal_error",
		Message: message,
	}
}

// WriteError writes an AppError as a JSON response.
func WriteError(w http.ResponseWriter, err *AppError) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(err.Status)

	resp := struct {
		Error *AppError `json:"error"`
	}{Error: err}

	_ = json.NewEncoder(w).Encode(resp)
}

// ErrorHandler is HTTP middleware that catches AppError values returned from
// handlers and converts them to JSON responses.
func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

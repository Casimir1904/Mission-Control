package handler

import (
	"errors"

	"github.com/danielgtaylor/huma/v2"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
)

// toHumaError converts an error (possibly an *apperror.AppError) into a Huma error
// so the framework serializes it with the correct HTTP status code.
func toHumaError(err error) error {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		return huma.NewError(appErr.Status, appErr.Message)
	}
	// Fall back to 500 for unexpected errors.
	return huma.Error500InternalServerError("internal server error")
}

package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
)

// Recovery is HTTP middleware that recovers from panics, logs the stack trace,
// and returns a 500 Internal Server Error response.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				requestID := GetRequestID(r.Context())
				stack := string(debug.Stack())

				slog.Error("panic recovered",
					"request_id", requestID,
					"panic", rec,
					"method", r.Method,
					"path", r.URL.Path,
					"stack", stack,
				)

				appErr := apperror.NewServiceError("internal server error")
				apperror.WriteError(w, appErr)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

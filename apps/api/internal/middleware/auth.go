package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Casimir1904/Mission-Control/apps/api/internal/apperror"
)

type claimsKey struct{}

// Claims represents the extracted OIDC JWT claims.
type Claims struct {
	Subject  string
	Email    string
	Name     string
	OrgID    string
	IssuedAt int64
	Issuer   string
}

// OIDCAuth returns middleware that validates OIDC JWT tokens.
// In Phase 0 this is a placeholder that extracts the Authorization header
// and stores placeholder claims in the context. Full OIDC validation will
// be implemented in Phase 1.
func OIDCAuth(issuer, audience string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				// Allow unauthenticated access for health checks and docs.
				next.ServeHTTP(w, r)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				appErr := apperror.NewUnauthorized("invalid authorization header format")
				apperror.WriteError(w, appErr)
				return
			}

			token := parts[1]
			if token == "" {
				appErr := apperror.NewUnauthorized("empty bearer token")
				apperror.WriteError(w, appErr)
				return
			}

			// Phase 0: Placeholder token validation.
			// In Phase 1, this will use go-oidc to verify the JWT against the OIDC issuer.
			slog.Debug("auth middleware received token",
				"issuer", issuer,
				"audience", audience,
				"token_length", len(token),
			)

			claims := &Claims{
				Subject: "placeholder",
				Issuer:  issuer,
			}

			ctx := context.WithValue(r.Context(), claimsKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims extracts the OIDC claims from the request context.
// Returns nil if no claims are present.
func GetClaims(ctx context.Context) *Claims {
	if claims, ok := ctx.Value(claimsKey{}).(*Claims); ok {
		return claims
	}
	return nil
}

// RequireAuth is middleware that rejects requests without valid authentication.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r.Context())
		if claims == nil {
			appErr := apperror.NewUnauthorized("authentication required")
			apperror.WriteError(w, appErr)
			return
		}
		next.ServeHTTP(w, r)
	})
}

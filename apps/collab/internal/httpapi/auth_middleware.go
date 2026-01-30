package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/NoumanAMalik/maple/apps/collab/internal/auth"
)

func AuthMiddleware(tokens *auth.TokenManager, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := auth.NormalizeBearer(r.Header.Get("Authorization"))
			if token == "" {
				writeError(w, http.StatusUnauthorized, "unauthorized", "Missing access token")
				return
			}

			claims, err := tokens.ParseAccessToken(token)
			if err != nil {
				logger.Warn("invalid access token", "error", err)
				writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid access token")
				return
			}

			ctx := withUserID(r.Context(), claims.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/NoumanAMalik/maple/apps/collab/internal/auth"
	"github.com/NoumanAMalik/maple/apps/collab/internal/collab"
	"github.com/NoumanAMalik/maple/apps/collab/internal/config"
	"github.com/NoumanAMalik/maple/apps/collab/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

const version = "0.1.0"

func NewRouter(ctx context.Context, cfg *config.Config, logger *slog.Logger, dbPool *pgxpool.Pool) (http.Handler, error) {
	if dbPool == nil {
		return nil, errors.New("database pool is required")
	}

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(NewStructuredLogger(logger))
	r.Use(middleware.Recoverer)
	r.Use(middleware.Heartbeat("/ping"))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	registry := collab.NewRoomRegistry(ctx, logger)
	wsHandler := collab.NewWSHandler(registry, logger)
	roomHandlers := NewRoomHandlers(registry, wsHandler, logger, cfg.BaseURL)

	tokenManager, err := auth.NewTokenManager(cfg.JWTSigningKey, "maple", cfg.AccessTokenExpiry)
	if err != nil {
		return nil, err
	}
	userRepo := db.NewUserRepo(dbPool)
	sessionRepo := db.NewSessionRepo(dbPool)
	authHandlers := NewAuthHandlers(userRepo, sessionRepo, tokenManager, auth.DefaultPasswordHasher(), cfg, logger)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"version": version,
		})
	})

	r.Route("/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "ok",
				"version": version,
			})
		})

		r.Route("/rooms", func(r chi.Router) {
			r.Post("/", roomHandlers.CreateRoom)
			r.Get("/{roomId}", roomHandlers.GetRoom)
			r.Delete("/{roomId}", roomHandlers.DeleteRoom)
			r.Get("/{roomId}/ws", roomHandlers.WebSocket)
		})

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandlers.Register)
			r.Post("/login", authHandlers.Login)
			r.Post("/refresh", authHandlers.Refresh)
			r.Post("/logout", authHandlers.Logout)
			r.With(AuthMiddleware(tokenManager, logger)).Post("/password", authHandlers.ChangePassword)
		})

		r.With(AuthMiddleware(tokenManager, logger)).Get("/me", authHandlers.Me)
	})

	return r, nil
}

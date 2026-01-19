package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/NoumanAMalik/maple/apps/collab/internal/collab"
	"github.com/NoumanAMalik/maple/apps/collab/internal/config"
)

const version = "0.1.0"

func NewRouter(cfg *config.Config, logger *slog.Logger) http.Handler {
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

	registry := collab.NewRoomRegistry(logger)
	wsHandler := collab.NewWSHandler(registry, logger)
	roomHandlers := NewRoomHandlers(registry, wsHandler, logger, cfg.BaseURL)

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
	})

	return r
}

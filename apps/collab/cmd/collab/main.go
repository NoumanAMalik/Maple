package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/NoumanAMalik/maple/apps/collab/internal/config"
	"github.com/NoumanAMalik/maple/apps/collab/internal/db"
	"github.com/NoumanAMalik/maple/apps/collab/internal/httpapi"
)

func main() {
	cfg := config.Load()

	logLevel := new(slog.LevelVar)
	switch strings.ToLower(cfg.LogLevel) {
	case "debug":
		logLevel.Set(slog.LevelDebug)
	case "warn", "warning":
		logLevel.Set(slog.LevelWarn)
	case "error":
		logLevel.Set(slog.LevelError)
	default:
		logLevel.Set(slog.LevelInfo)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
	slog.SetDefault(logger)

	if len(os.Args) > 1 {
		if os.Args[1] == "migrate" {
			direction := "up"
			if len(os.Args) > 2 {
				direction = os.Args[2]
			}
			if err := db.RunMigrations(cfg.DatabaseURL, direction); err != nil {
				logger.Error("migration failed", "error", err)
				os.Exit(1)
			}
			logger.Info("migration complete", "direction", direction)
			return
		}
		if os.Args[1] != "serve" {
			logger.Error("unknown command", "command", os.Args[1])
			os.Exit(1)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	dbPool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	router, err := httpapi.NewRouter(ctx, cfg, logger, dbPool)
	if err != nil {
		logger.Error("router initialization failed", "error", err)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("starting collab server", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server")
	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown error", "error", err)
	}

	logger.Info("server stopped")
}

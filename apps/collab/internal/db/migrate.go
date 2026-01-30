package db

import (
	"errors"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL, direction string) error {
	if strings.TrimSpace(databaseURL) == "" {
		return ErrMissingDatabaseURL
	}
	if direction == "" {
		direction = "up"
	}

	m, err := migrate.New("file://migrations", databaseURL)
	if err != nil {
		return err
	}

	switch direction {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			return err
		}
	case "down":
		if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			return err
		}
	default:
		return errors.New("unknown migrate direction")
	}

	return nil
}

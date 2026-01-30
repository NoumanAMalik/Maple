package db

import (
	"context"
	"errors"
	"time"

	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SessionRepo struct {
	pool *pgxpool.Pool
}

func NewSessionRepo(pool *pgxpool.Pool) *SessionRepo {
	return &SessionRepo{pool: pool}
}

func (r *SessionRepo) Create(ctx context.Context, userID, refreshTokenHash string, userAgent, ipAddress *string, expiresAt time.Time) (*models.Session, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, refresh_token_hash, user_agent, ip_address::text, created_at, expires_at, revoked_at
	`, userID, refreshTokenHash, userAgent, ipAddress, expiresAt)

	var session models.Session
	if err := row.Scan(
		&session.ID,
		&session.UserID,
		&session.RefreshTokenHash,
		&session.UserAgent,
		&session.IPAddress,
		&session.CreatedAt,
		&session.ExpiresAt,
		&session.RevokedAt,
	); err != nil {
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) GetByTokenHash(ctx context.Context, refreshTokenHash string) (*models.Session, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, refresh_token_hash, user_agent, ip_address::text, created_at, expires_at, revoked_at
		FROM sessions
		WHERE refresh_token_hash = $1
		LIMIT 1
	`, refreshTokenHash)

	var session models.Session
	if err := row.Scan(
		&session.ID,
		&session.UserID,
		&session.RefreshTokenHash,
		&session.UserAgent,
		&session.IPAddress,
		&session.CreatedAt,
		&session.ExpiresAt,
		&session.RevokedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &session, nil
}

func (r *SessionRepo) Revoke(ctx context.Context, sessionID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE sessions
		SET revoked_at = NOW()
		WHERE id = $1
	`, sessionID)
	return err
}

func (r *SessionRepo) Rotate(ctx context.Context, sessionID, newTokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE sessions
		SET refresh_token_hash = $1, expires_at = $2, revoked_at = NULL
		WHERE id = $3
	`, newTokenHash, expiresAt, sessionID)
	return err
}

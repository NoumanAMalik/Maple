package db

import (
	"context"
	"errors"

	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OpRepo struct {
	pool *pgxpool.Pool
}

func NewOpRepo(pool *pgxpool.Pool) *OpRepo {
	return &OpRepo{pool: pool}
}

func (r *OpRepo) Append(ctx context.Context, docID string, version int64, opID, clientID string, opsJSON []byte) error {
	var clientIDValue any
	if clientID != "" {
		clientIDValue = clientID
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO document_ops (document_id, version, op_id, client_id, ops)
		VALUES ($1, $2, $3, $4, $5)
	`, docID, version, opID, clientIDValue, opsJSON)
	if err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			return ErrDuplicate
		}
		return err
	}
	return nil
}

func (r *OpRepo) ListSince(ctx context.Context, docID string, version int64) ([]models.DocumentOp, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, document_id, version, op_id, client_id, ops, created_at
		FROM document_ops
		WHERE document_id = $1 AND version > $2
		ORDER BY version ASC
	`, docID, version)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ops := make([]models.DocumentOp, 0)
	for rows.Next() {
		var entry models.DocumentOp
		var clientID *string
		if err := rows.Scan(&entry.ID, &entry.DocumentID, &entry.Version, &entry.OpID, &clientID, &entry.Ops, &entry.CreatedAt); err != nil {
			return nil, err
		}
		if clientID != nil {
			entry.ClientID = *clientID
		}
		ops = append(ops, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ops, nil
}

func (r *OpRepo) LatestVersion(ctx context.Context, docID string) (int64, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT COALESCE(MAX(version), 0)
		FROM document_ops
		WHERE document_id = $1
	`, docID)

	var version int64
	if err := row.Scan(&version); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}

	return version, nil
}

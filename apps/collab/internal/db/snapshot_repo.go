package db

import (
	"context"
	"errors"

	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SnapshotRepo struct {
	pool *pgxpool.Pool
}

func NewSnapshotRepo(pool *pgxpool.Pool) *SnapshotRepo {
	return &SnapshotRepo{pool: pool}
}

func (r *SnapshotRepo) Create(ctx context.Context, docID string, version int64, content string) (*models.DocumentSnapshot, error) {
	row := r.pool.QueryRow(ctx, `
		INSERT INTO document_snapshots (document_id, version, content)
		VALUES ($1, $2, $3)
		RETURNING id, document_id, version, content, created_at
	`, docID, version, content)

	var snapshot models.DocumentSnapshot
	if err := row.Scan(&snapshot.ID, &snapshot.DocumentID, &snapshot.Version, &snapshot.Content, &snapshot.CreatedAt); err != nil {
		return nil, err
	}

	return &snapshot, nil
}

func (r *SnapshotRepo) GetLatest(ctx context.Context, docID string) (*models.DocumentSnapshot, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, document_id, version, content, created_at
		FROM document_snapshots
		WHERE document_id = $1
		ORDER BY version DESC
		LIMIT 1
	`, docID)

	var snapshot models.DocumentSnapshot
	if err := row.Scan(&snapshot.ID, &snapshot.DocumentID, &snapshot.Version, &snapshot.Content, &snapshot.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &snapshot, nil
}

package db

import (
	"context"
	"errors"
	"strings"

	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DocumentRepo struct {
	pool *pgxpool.Pool
}

func NewDocumentRepo(pool *pgxpool.Pool) *DocumentRepo {
	return &DocumentRepo{pool: pool}
}

func (r *DocumentRepo) CreateWithSnapshot(ctx context.Context, ownerID, title, language, content string) (*models.Document, *models.DocumentSnapshot, error) {
	cleanTitle := strings.TrimSpace(title)
	if cleanTitle == "" {
		cleanTitle = "Untitled"
	}
	cleanLanguage := strings.TrimSpace(language)

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var doc models.Document
	row := tx.QueryRow(ctx, `
		INSERT INTO documents (owner_id, title, language, current_version)
		VALUES ($1, $2, $3, 0)
		RETURNING id, owner_id, title, language, current_version, created_at, updated_at, deleted_at
	`, ownerID, cleanTitle, nullableString(cleanLanguage))
	if err := row.Scan(&doc.ID, &doc.OwnerID, &doc.Title, &doc.Language, &doc.CurrentVersion, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}

	var snapshot models.DocumentSnapshot
	snapRow := tx.QueryRow(ctx, `
		INSERT INTO document_snapshots (document_id, version, content)
		VALUES ($1, $2, $3)
		RETURNING id, document_id, version, content, created_at
	`, doc.ID, doc.CurrentVersion, content)
	if err := snapRow.Scan(&snapshot.ID, &snapshot.DocumentID, &snapshot.Version, &snapshot.Content, &snapshot.CreatedAt); err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	return &doc, &snapshot, nil
}

func (r *DocumentRepo) GetByIDForOwner(ctx context.Context, docID, ownerID string) (*models.Document, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, owner_id, title, language, current_version, created_at, updated_at, deleted_at
		FROM documents
		WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
	`, docID, ownerID)

	var doc models.Document
	if err := row.Scan(&doc.ID, &doc.OwnerID, &doc.Title, &doc.Language, &doc.CurrentVersion, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &doc, nil
}

func (r *DocumentRepo) ListByOwner(ctx context.Context, ownerID string, limit int) ([]models.Document, error) {
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id, owner_id, title, language, current_version, created_at, updated_at, deleted_at
		FROM documents
		WHERE owner_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC
		LIMIT $2
	`, ownerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := make([]models.Document, 0)
	for rows.Next() {
		var doc models.Document
		if err := rows.Scan(&doc.ID, &doc.OwnerID, &doc.Title, &doc.Language, &doc.CurrentVersion, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt); err != nil {
			return nil, err
		}
		docs = append(docs, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return docs, nil
}

func (r *DocumentRepo) UpdateTitle(ctx context.Context, docID, ownerID, title string) (*models.Document, error) {
	cleanTitle := strings.TrimSpace(title)
	if cleanTitle == "" {
		return nil, ErrInvalidInput
	}

	row := r.pool.QueryRow(ctx, `
		UPDATE documents
		SET title = $1, updated_at = NOW()
		WHERE id = $2 AND owner_id = $3 AND deleted_at IS NULL
		RETURNING id, owner_id, title, language, current_version, created_at, updated_at, deleted_at
	`, cleanTitle, docID, ownerID)

	var doc models.Document
	if err := row.Scan(&doc.ID, &doc.OwnerID, &doc.Title, &doc.Language, &doc.CurrentVersion, &doc.CreatedAt, &doc.UpdatedAt, &doc.DeletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &doc, nil
}

func (r *DocumentRepo) SoftDelete(ctx context.Context, docID, ownerID string) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE documents
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
	`, docID, ownerID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *DocumentRepo) UpdateVersion(ctx context.Context, docID string, version int64) error {
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE documents
		SET current_version = $1, updated_at = NOW()
		WHERE id = $2 AND deleted_at IS NULL
	`, version, docID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

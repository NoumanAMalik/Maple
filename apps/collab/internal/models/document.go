package models

import "time"

type Document struct {
	ID             string     `json:"id"`
	OwnerID        string     `json:"ownerId"`
	Title          string     `json:"title"`
	Language       string     `json:"language,omitempty"`
	CurrentVersion int64      `json:"currentVersion"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	DeletedAt      *time.Time `json:"deletedAt,omitempty"`
}

type DocumentOp struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"documentId"`
	Version    int64     `json:"version"`
	OpID       string    `json:"opId"`
	ClientID   string    `json:"clientId,omitempty"`
	Ops        []byte    `json:"ops"`
	CreatedAt  time.Time `json:"createdAt"`
}

type DocumentSnapshot struct {
	ID         string    `json:"id"`
	DocumentID string    `json:"documentId"`
	Version    int64     `json:"version"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"createdAt"`
}

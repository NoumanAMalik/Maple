package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/NoumanAMalik/maple/apps/collab/internal/collab"
	"github.com/NoumanAMalik/maple/apps/collab/internal/db"
	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
)

type DocumentHandlers struct {
	docs      *db.DocumentRepo
	ops       *db.OpRepo
	snapshots *db.SnapshotRepo
	logger    *slog.Logger
}

func NewDocumentHandlers(docs *db.DocumentRepo, ops *db.OpRepo, snapshots *db.SnapshotRepo, logger *slog.Logger) *DocumentHandlers {
	return &DocumentHandlers{
		docs:      docs,
		ops:       ops,
		snapshots: snapshots,
		logger:    logger,
	}
}

type createDocumentRequest struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	Language string `json:"language,omitempty"`
}

type updateDocumentRequest struct {
	Title string `json:"title"`
}

type DocumentResponse struct {
	ID             string `json:"id"`
	OwnerID        string `json:"ownerId"`
	Title          string `json:"title"`
	Language       string `json:"language,omitempty"`
	CurrentVersion int64  `json:"currentVersion"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

type SnapshotResponse struct {
	ID        string `json:"id"`
	Version   int64  `json:"version"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
}

type OpEntryResponse struct {
	Version   int64              `json:"version"`
	OpID      string             `json:"opId"`
	ClientID  string             `json:"clientId,omitempty"`
	Ops       []collab.Operation `json:"ops"`
	CreatedAt string             `json:"createdAt"`
}

type CreateDocumentResponse struct {
	Document DocumentResponse `json:"document"`
	Snapshot SnapshotResponse `json:"snapshot"`
}

type DocumentContentResponse struct {
	Document DocumentResponse  `json:"document"`
	Snapshot SnapshotResponse  `json:"snapshot"`
	Ops      []OpEntryResponse `json:"ops"`
}

func (h *DocumentHandlers) CreateDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	var req createDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = "Untitled"
	}

	doc, snapshot, err := h.docs.CreateWithSnapshot(r.Context(), userID, title, req.Language, req.Content)
	if err != nil {
		h.logger.Error("create document failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not create document")
		return
	}

	resp := CreateDocumentResponse{
		Document: formatDocument(doc),
		Snapshot: formatSnapshot(snapshot),
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *DocumentHandlers) ListDocuments(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	docs, err := h.docs.ListByOwner(r.Context(), userID, 100)
	if err != nil {
		h.logger.Error("list documents failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not load documents")
		return
	}

	resp := make([]DocumentResponse, 0, len(docs))
	for i := range docs {
		resp = append(resp, formatDocument(&docs[i]))
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *DocumentHandlers) GetDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	docID := chi.URLParam(r, "id")
	doc, err := h.docs.GetByIDForOwner(r.Context(), docID, userID)
	if err != nil {
		if err == db.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "Document not found")
			return
		}
		h.logger.Error("get document failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not load document")
		return
	}

	writeJSON(w, http.StatusOK, formatDocument(doc))
}

func (h *DocumentHandlers) GetDocumentContent(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	docID := chi.URLParam(r, "id")
	doc, err := h.docs.GetByIDForOwner(r.Context(), docID, userID)
	if err != nil {
		if err == db.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "Document not found")
			return
		}
		h.logger.Error("get document failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not load document")
		return
	}

	snapshot, err := h.snapshots.GetLatest(r.Context(), docID)
	if err != nil {
		if err == db.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "Snapshot not found")
			return
		}
		h.logger.Error("get snapshot failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not load snapshot")
		return
	}

	opEntries, err := h.ops.ListSince(r.Context(), docID, snapshot.Version)
	if err != nil {
		h.logger.Error("get ops failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not load operations")
		return
	}

	ops := make([]OpEntryResponse, 0, len(opEntries))
	for _, entry := range opEntries {
		var decoded []collab.Operation
		if err := json.Unmarshal(entry.Ops, &decoded); err != nil {
			h.logger.Error("decode ops failed", "error", err)
			writeError(w, http.StatusInternalServerError, "server_error", "Could not decode operations")
			return
		}
		ops = append(ops, OpEntryResponse{
			Version:   entry.Version,
			OpID:      entry.OpID,
			ClientID:  entry.ClientID,
			Ops:       decoded,
			CreatedAt: entry.CreatedAt.Format(time.RFC3339),
		})
	}

	resp := DocumentContentResponse{
		Document: formatDocument(doc),
		Snapshot: formatSnapshot(snapshot),
		Ops:      ops,
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *DocumentHandlers) UpdateDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	docID := chi.URLParam(r, "id")
	var req updateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	doc, err := h.docs.UpdateTitle(r.Context(), docID, userID, req.Title)
	if err != nil {
		if err == db.ErrInvalidInput {
			writeError(w, http.StatusBadRequest, "invalid_request", "Title is required")
			return
		}
		if err == db.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "Document not found")
			return
		}
		h.logger.Error("update document failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not update document")
		return
	}

	writeJSON(w, http.StatusOK, formatDocument(doc))
}

func (h *DocumentHandlers) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	docID := chi.URLParam(r, "id")
	if err := h.docs.SoftDelete(r.Context(), docID, userID); err != nil {
		if err == db.ErrNotFound {
			writeError(w, http.StatusNotFound, "not_found", "Document not found")
			return
		}
		h.logger.Error("delete document failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not delete document")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func formatDocument(doc *models.Document) DocumentResponse {
	return DocumentResponse{
		ID:             doc.ID,
		OwnerID:        doc.OwnerID,
		Title:          doc.Title,
		Language:       doc.Language,
		CurrentVersion: doc.CurrentVersion,
		CreatedAt:      doc.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      doc.UpdatedAt.Format(time.RFC3339),
	}
}

func formatSnapshot(snapshot *models.DocumentSnapshot) SnapshotResponse {
	return SnapshotResponse{
		ID:        snapshot.ID,
		Version:   snapshot.Version,
		Content:   snapshot.Content,
		CreatedAt: snapshot.CreatedAt.Format(time.RFC3339),
	}
}

package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"nhooyr.io/websocket"

	"github.com/NoumanAMalik/maple/apps/collab/internal/collab"
)

type RoomHandlers struct {
	registry  *collab.RoomRegistry
	wsHandler *collab.WSHandler
	logger    *slog.Logger
	baseURL   string
}

func NewRoomHandlers(registry *collab.RoomRegistry, wsHandler *collab.WSHandler, logger *slog.Logger, baseURL string) *RoomHandlers {
	return &RoomHandlers{
		registry:  registry,
		wsHandler: wsHandler,
		logger:    logger,
		baseURL:   baseURL,
	}
}

type CreateRoomRequest struct {
	Content  string `json:"content"`
	Language string `json:"language,omitempty"`
}

type CreateRoomResponse struct {
	RoomID   string `json:"roomId"`
	ShareURL string `json:"shareUrl"`
}

type RoomInfoResponse struct {
	RoomID           string `json:"roomId"`
	CreatedAt        string `json:"createdAt"`
	ParticipantCount int    `json:"participantCount"`
}

func (h *RoomHandlers) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	// For anonymous rooms, ownerID is empty
	room := h.registry.CreateRoom(req.Content, req.Language, "")

	resp := CreateRoomResponse{
		RoomID:   room.ID,
		ShareURL: h.baseURL + "/share/" + room.ID,
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *RoomHandlers) GetRoom(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomId")

	room, ok := h.registry.GetRoom(roomID)
	if !ok {
		writeError(w, http.StatusNotFound, "room_not_found", "Room does not exist")
		return
	}

	resp := RoomInfoResponse{
		RoomID:           room.ID,
		CreatedAt:        room.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		ParticipantCount: room.ClientCount(),
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *RoomHandlers) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomId")

	_, ok := h.registry.GetRoom(roomID)
	if !ok {
		writeError(w, http.StatusNotFound, "room_not_found", "Room does not exist")
		return
	}

	h.registry.DeleteRoom(roomID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *RoomHandlers) WebSocket(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomId")

	_, ok := h.registry.GetRoom(roomID)
	if !ok {
		writeError(w, http.StatusNotFound, "room_not_found", "Room does not exist")
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"}, // TODO: Configure properly for production
	})
	if err != nil {
		h.logger.Error("websocket accept error", "error", err)
		return
	}

	h.wsHandler.HandleConnection(r.Context(), conn, roomID)
}

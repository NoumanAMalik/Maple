package collab

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"nhooyr.io/websocket"
)

type WSHandler struct {
	registry *RoomRegistry
	logger   *slog.Logger
}

func NewWSHandler(registry *RoomRegistry, logger *slog.Logger) *WSHandler {
	return &WSHandler{
		registry: registry,
		logger:   logger,
	}
}

type ClientMessage struct {
	V int    `json:"v"`
	T string `json:"t"`
}

type HelloMessage struct {
	V        int    `json:"v"`
	T        string `json:"t"`
	DocID    string `json:"docId"`
	ClientID string `json:"clientId"`
	Resume   *struct {
		LastSeenVersion int `json:"lastSeenVersion"`
	} `json:"resume,omitempty"`
}

type WelcomeMessage struct {
	V             int            `json:"v"`
	T             string         `json:"t"`
	DocID         string         `json:"docId"`
	ServerVersion int            `json:"serverVersion"`
	Snapshot      string         `json:"snapshot"`
	Presence      []PresenceInfo `json:"presence"`
}

type UserJoinedMessage struct {
	V     int       `json:"v"`
	T     string    `json:"t"`
	Actor ActorInfo `json:"actor"`
}

type UserLeftMessage struct {
	V        int    `json:"v"`
	T        string `json:"t"`
	ClientID string `json:"clientId"`
}

type ErrorMessage struct {
	V       int    `json:"v"`
	T       string `json:"t"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

var clientColors = []string{
	"#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
	"#2196f3", "#00bcd4", "#009688", "#4caf50",
	"#ff9800", "#ff5722", "#795548", "#607d8b",
}

func (h *WSHandler) HandleConnection(ctx context.Context, conn *websocket.Conn, roomID string) {
	room, ok := h.registry.GetRoom(roomID)
	if !ok {
		h.sendError(ctx, conn, "room_not_found", "Room does not exist")
		conn.Close(websocket.StatusPolicyViolation, "room not found")
		return
	}

	hello, err := h.readHello(ctx, conn)
	if err != nil {
		h.logger.Error("failed to read hello", "error", err)
		conn.Close(websocket.StatusPolicyViolation, "invalid hello")
		return
	}

	if hello.DocID != roomID {
		h.sendError(ctx, conn, "room_mismatch", "DocID does not match room")
		conn.Close(websocket.StatusPolicyViolation, "room mismatch")
		return
	}

	clientCtx, cancel := context.WithCancel(ctx)
	client := &Client{
		ID:          hello.ClientID,
		DisplayName: "",
		Color:       clientColors[room.ClientCount()%len(clientColors)],
		Conn:        conn,
		Room:        room,
		send:        make(chan []byte, 256),
		ctx:         clientCtx,
		cancel:      cancel,
	}

	room.AddClient(client)
	defer func() {
		room.RemoveClient(client.ID)
		cancel()

		leftMsg, _ := json.Marshal(UserLeftMessage{
			V:        1,
			T:        "user_left",
			ClientID: client.ID,
		})
		room.Broadcast(leftMsg, client.ID)
	}()

	welcome := WelcomeMessage{
		V:             1,
		T:             "welcome",
		DocID:         room.ID,
		ServerVersion: room.GetVersion(),
		Snapshot:      room.GetSnapshot(),
		Presence:      room.GetPresenceList(client.ID),
	}
	if err := client.Send(welcome); err != nil {
		h.logger.Error("failed to send welcome", "error", err)
		return
	}

	joinedMsg, _ := json.Marshal(UserJoinedMessage{
		V: 1,
		T: "user_joined",
		Actor: ActorInfo{
			ClientID:    client.ID,
			DisplayName: client.DisplayName,
			Color:       client.Color,
		},
	})
	room.Broadcast(joinedMsg, client.ID)

	go client.WriteLoop()

	h.readLoop(client)
}

func (h *WSHandler) readHello(ctx context.Context, conn *websocket.Conn) (*HelloMessage, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	_, data, err := conn.Read(ctx)
	if err != nil {
		return nil, err
	}

	var base ClientMessage
	if err := json.Unmarshal(data, &base); err != nil {
		return nil, err
	}

	if base.T != "hello" {
		return nil, fmt.Errorf("expected hello, got %s", base.T)
	}

	var hello HelloMessage
	if err := json.Unmarshal(data, &hello); err != nil {
		return nil, err
	}

	if hello.ClientID == "" {
		return nil, fmt.Errorf("clientId is required")
	}

	return &hello, nil
}

func (h *WSHandler) readLoop(client *Client) {
	for {
		ctx, cancel := context.WithTimeout(client.ctx, 60*time.Second)
		_, data, err := client.Conn.Read(ctx)
		cancel()

		if err != nil {
			h.logger.Debug("client read error", "clientId", client.ID, "error", err)
			return
		}

		var base ClientMessage
		if err := json.Unmarshal(data, &base); err != nil {
			h.logger.Warn("invalid message format", "clientId", client.ID, "error", err)
			continue
		}

		switch base.T {
		case "op":
			h.handleOp(client, data)
		case "presence":
			h.handlePresence(client, data)
		default:
			h.logger.Warn("unknown message type", "type", base.T)
		}
	}
}

func (h *WSHandler) handleOp(client *Client, data []byte) {
	// TODO: Implement OT in Phase 2
	h.logger.Debug("received op message", "clientId", client.ID)
}

func (h *WSHandler) handlePresence(client *Client, data []byte) {
	// TODO: Implement presence broadcasting
	h.logger.Debug("received presence message", "clientId", client.ID)
}

func (h *WSHandler) sendError(ctx context.Context, conn *websocket.Conn, code, message string) {
	msg := ErrorMessage{
		V:       1,
		T:       "error",
		Code:    code,
		Message: message,
	}
	data, _ := json.Marshal(msg)
	conn.Write(ctx, websocket.MessageText, data)
}

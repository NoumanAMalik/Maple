package collab

import (
	"context"
	"encoding/json"
	"errors"
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
	Snapshots     []Snapshot     `json:"snapshots"`
	IsOwner       bool           `json:"isOwner"`
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

type PresenceMessage struct {
	V           int        `json:"v"`
	T           string     `json:"t"`
	Cursor      Position   `json:"cursor"`
	Selection   *Selection `json:"selection,omitempty"`
	DisplayName string     `json:"displayName,omitempty"`
}

type PresenceUpdateMessage struct {
	V         int        `json:"v"`
	T         string     `json:"t"`
	Actor     ActorInfo  `json:"actor"`
	Cursor    Position   `json:"cursor"`
	Selection *Selection `json:"selection,omitempty"`
}

// Snapshot-related messages

// SaveMessage - Client requests to save a snapshot
type SaveMessage struct {
	V       int    `json:"v"`
	T       string `json:"t"`
	Content string `json:"content"`
	Message string `json:"message,omitempty"`
}

// RestoreMessage - Client requests to restore to a snapshot
type RestoreMessage struct {
	V          int    `json:"v"`
	T          string `json:"t"`
	SnapshotID string `json:"snapshotId"`
}

// GetSnapshotsMessage - Client requests the list of snapshots
type GetSnapshotsMessage struct {
	V int    `json:"v"`
	T string `json:"t"`
}

// SnapshotCreatedMessage - Server notifies clients of a new snapshot
type SnapshotCreatedMessage struct {
	V        int      `json:"v"`
	T        string   `json:"t"`
	Snapshot Snapshot `json:"snapshot"`
}

// SnapshotsListMessage - Server sends list of snapshots
type SnapshotsListMessage struct {
	V         int        `json:"v"`
	T         string     `json:"t"`
	Snapshots []Snapshot `json:"snapshots"`
}

// SnapshotRestoredMessage - Server notifies clients of a restore
type SnapshotRestoredMessage struct {
	V          int    `json:"v"`
	T          string `json:"t"`
	Content    string `json:"content"`
	SnapshotID string `json:"snapshotId"`
	Version    int    `json:"version"`
}

// GetDiffMessage - Client requests a diff between snapshots
type GetDiffMessage struct {
	V              int    `json:"v"`
	T              string `json:"t"`
	RequestID      string `json:"requestId"`
	BaseSnapshotID string `json:"baseSnapshotId"`
	Target         string `json:"target"` // "current"
}

// DiffResultMessage - Server sends diff result to client
type DiffResultMessage struct {
	V              int        `json:"v"`
	T              string     `json:"t"`
	RequestID      string     `json:"requestId"`
	BaseSnapshotID string     `json:"baseSnapshotId"`
	Target         string     `json:"target"`
	ServerVersion  int        `json:"serverVersion"`
	Language       string     `json:"language"`
	Result         DiffResult `json:"result"`
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
		Snapshots:     room.GetSnapshots(),
		IsOwner:       room.OwnerID == client.ID,
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
		case "save":
			h.handleSave(client, data)
		case "restore":
			h.handleRestore(client, data)
		case "get_snapshots":
			h.handleGetSnapshots(client)
		case "get_diff":
			h.handleGetDiff(client, data)
		default:
			h.logger.Warn("unknown message type", "type", base.T)
		}
	}
}

func (h *WSHandler) handleOp(client *Client, data []byte) {
	var msg OpMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.logger.Warn("invalid op message", "clientId", client.ID, "error", err)
		return
	}

	if msg.OpID == "" || len(msg.Ops) == 0 {
		h.logger.Warn("invalid op payload", "clientId", client.ID)
		return
	}

	transformed, newVersion, err := client.Room.ApplyOpBatch(client.ID, msg.OpID, msg.BaseVersion, msg.Ops)
	if err != nil {
		if errors.Is(err, ErrResyncRequired) {
			client.Send(ResyncRequiredMessage{V: 1, T: "resync_required"})
			return
		}
		h.logger.Warn("failed to apply ops", "clientId", client.ID, "error", err)
		return
	}

	// Mark that content has changed since last snapshot
	client.Room.MarkContentChanged()

	if msg.Presence != nil {
		client.UpdatePresence(msg.Presence.Cursor, msg.Presence.Selection)
		h.broadcastPresenceUpdate(client, msg.Presence.Cursor, msg.Presence.Selection)
	}

	client.Send(AckMessage{
		V:          1,
		T:          "ack",
		OpID:       msg.OpID,
		NewVersion: newVersion,
	})

	if len(transformed) == 0 {
		return
	}

	remote := RemoteOpMessage{
		V:       1,
		T:       "remote_op",
		Version: newVersion,
		Actor: ActorInfo{
			ClientID:    client.ID,
			DisplayName: client.DisplayName,
			Color:       client.Color,
		},
		Ops: transformed,
	}
	remoteData, _ := json.Marshal(remote)
	client.Room.Broadcast(remoteData, client.ID)
}

func (h *WSHandler) handlePresence(client *Client, data []byte) {
	var msg PresenceMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.logger.Warn("invalid presence message", "clientId", client.ID, "error", err)
		return
	}

	if msg.DisplayName != "" {
		client.UpdateDisplayName(msg.DisplayName)
	}

	client.UpdatePresence(&msg.Cursor, msg.Selection)
	h.broadcastPresenceUpdate(client, &msg.Cursor, msg.Selection)
}

func (h *WSHandler) broadcastPresenceUpdate(client *Client, cursor *Position, selection *Selection) {
	if cursor == nil {
		return
	}
	update := PresenceUpdateMessage{
		V: 1,
		T: "presence_update",
		Actor: ActorInfo{
			ClientID:    client.ID,
			DisplayName: client.DisplayName,
			Color:       client.Color,
		},
		Cursor:    *cursor,
		Selection: selection,
	}
	updateData, _ := json.Marshal(update)
	client.Room.Broadcast(updateData, client.ID)
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

// handleSave handles a save/snapshot request from a client
func (h *WSHandler) handleSave(client *Client, data []byte) {
	var msg SaveMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.logger.Warn("invalid save message", "clientId", client.ID, "error", err)
		return
	}

	// Create snapshot
	snapshot := client.Room.CreateSnapshot(client.ID, SnapshotManual, msg.Message)

	// Broadcast snapshot created to all clients
	snapshotMsg := SnapshotCreatedMessage{
		V:        1,
		T:        "snapshot_created",
		Snapshot: *snapshot,
	}
	snapshotData, _ := json.Marshal(snapshotMsg)
	client.Room.Broadcast(snapshotData, "") // Send to all clients including sender
}

// handleRestore handles a restore request from a client (admin only)
func (h *WSHandler) handleRestore(client *Client, data []byte) {
	var msg RestoreMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.logger.Warn("invalid restore message", "clientId", client.ID, "error", err)
		return
	}

	// Only owner can restore
	if client.Room.OwnerID != client.ID {
		client.Send(ErrorMessage{
			V:       1,
			T:       "error",
			Code:    "unauthorized",
			Message: "Only the room owner can restore snapshots",
		})
		return
	}

	snapshot, err := client.Room.RestoreToSnapshot(msg.SnapshotID)
	if err != nil {
		client.Send(ErrorMessage{
			V:       1,
			T:       "error",
			Code:    "restore_failed",
			Message: err.Error(),
		})
		return
	}

	// Broadcast restore to all clients
	restoreMsg := SnapshotRestoredMessage{
		V:          1,
		T:          "snapshot_restored",
		Content:    snapshot.Content,
		SnapshotID: msg.SnapshotID,
		Version:    client.Room.GetVersion(),
	}
	restoreData, _ := json.Marshal(restoreMsg)
	client.Room.Broadcast(restoreData, "") // Send to all clients
}

// handleGetSnapshots sends the list of snapshots to the requesting client
func (h *WSHandler) handleGetSnapshots(client *Client) {
	snapshots := client.Room.GetSnapshots()

	msg := SnapshotsListMessage{
		V:         1,
		T:         "snapshots_list",
		Snapshots: snapshots,
	}
	client.Send(msg)
}

// handleGetDiff computes and sends a diff between a snapshot and current content
func (h *WSHandler) handleGetDiff(client *Client, data []byte) {
	var msg GetDiffMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.logger.Warn("invalid get_diff message", "clientId", client.ID, "error", err)
		return
	}

	if msg.RequestID == "" {
		client.Send(ErrorMessage{
			V:       1,
			T:       "error",
			Code:    "invalid_request",
			Message: "requestId is required",
		})
		return
	}

	// Compute diff
	diff, err := client.Room.GetDiff(msg.BaseSnapshotID, msg.Target)
	if err != nil {
		client.Send(ErrorMessage{
			V:       1,
			T:       "error",
			Code:    "diff_failed",
			Message: err.Error(),
		})
		return
	}

	// Send result only to requesting client
	result := DiffResultMessage{
		V:              1,
		T:              "diff_result",
		RequestID:      msg.RequestID,
		BaseSnapshotID: msg.BaseSnapshotID,
		Target:         msg.Target,
		ServerVersion:  client.Room.GetVersion(),
		Language:       client.Room.Language,
		Result:         *diff,
	}
	client.Send(result)
}

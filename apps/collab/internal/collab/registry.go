package collab

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"sync"
	"time"
)

type RoomRegistry struct {
	rooms  sync.Map // map[string]*Room
	logger *slog.Logger
	ctx    context.Context
	cancel context.CancelFunc
}

const autoSaveInterval = 30 * time.Second

func NewRoomRegistry(ctx context.Context, logger *slog.Logger) *RoomRegistry {
	ctx, cancel := context.WithCancel(ctx)
	rr := &RoomRegistry{
		logger: logger,
		ctx:    ctx,
		cancel: cancel,
	}
	go rr.cleanupLoop()
	go rr.autoSaveLoop()
	return rr
}

func (rr *RoomRegistry) Stop() {
	rr.cancel()
}

func (rr *RoomRegistry) cleanupLoop() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-rr.ctx.Done():
			return
		case <-ticker.C:
			rr.cleanupStaleRooms()
		}
	}
}

func (rr *RoomRegistry) cleanupStaleRooms() {
	now := time.Now()
	minAge := 5 * time.Minute

	rr.rooms.Range(func(key, value any) bool {
		room := value.(*Room)
		if room.ClientCount() == 0 && now.Sub(room.CreatedAt) > minAge {
			rr.rooms.Delete(key)
			rr.logger.Info("cleaned up stale room", "roomId", room.ID, "age", now.Sub(room.CreatedAt))
		}
		return true
	})
}

func (rr *RoomRegistry) autoSaveLoop() {
	ticker := time.NewTicker(10 * time.Second) // Check more frequently than auto-save interval
	defer ticker.Stop()

	for {
		select {
		case <-rr.ctx.Done():
			return
		case <-ticker.C:
			rr.checkAutoSave()
		}
	}
}

func (rr *RoomRegistry) checkAutoSave() {
	rr.rooms.Range(func(key, value any) bool {
		room := value.(*Room)
		// Only auto-save if there are changes and enough time has passed
		if room.ClientCount() > 0 && room.ShouldAutoSave(autoSaveInterval) {
			snapshot := room.CreateSnapshot("auto-save", SnapshotAuto, "")
			rr.logger.Info("auto-save triggered", "roomId", room.ID, "snapshotId", snapshot.ID)

			// Broadcast to all clients
			broadcastAutoSave(room, snapshot)
		}
		return true
	})
}

func broadcastAutoSave(room *Room, snapshot *Snapshot) {
	msg := struct {
		V        int      `json:"v"`
		T        string   `json:"t"`
		Snapshot Snapshot `json:"snapshot"`
	}{
		V:        1,
		T:        "snapshot_created",
		Snapshot: *snapshot,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	room.Broadcast(data, "")
}

func (rr *RoomRegistry) CreateRoom(content, language, ownerID string) *Room {
	id := generateRoomID()
	room := NewRoom(id, content, language, ownerID, rr.logger)
	rr.rooms.Store(id, room)
	rr.logger.Info("room created", "roomId", id, "ownerId", ownerID)
	return room
}

func (rr *RoomRegistry) GetRoom(id string) (*Room, bool) {
	val, ok := rr.rooms.Load(id)
	if !ok {
		return nil, false
	}
	return val.(*Room), true
}

func (rr *RoomRegistry) DeleteRoom(id string) {
	rr.rooms.Delete(id)
	rr.logger.Info("room deleted", "roomId", id)
}

func (rr *RoomRegistry) RoomCount() int {
	count := 0
	rr.rooms.Range(func(_, _ any) bool {
		count++
		return true
	})
	return count
}

func generateRoomID() string {
	bytes := make([]byte, 6)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

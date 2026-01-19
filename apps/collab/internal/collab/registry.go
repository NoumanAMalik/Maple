package collab

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"sync"
)

type RoomRegistry struct {
	rooms  sync.Map // map[string]*Room
	logger *slog.Logger
}

func NewRoomRegistry(logger *slog.Logger) *RoomRegistry {
	return &RoomRegistry{
		logger: logger,
	}
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

package collab

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"nhooyr.io/websocket"
)

type Client struct {
	ID          string
	DisplayName string
	Color       string
	Conn        *websocket.Conn
	Room        *Room
	send        chan []byte
	ctx         context.Context
	cancel      context.CancelFunc
	Presence    *Presence
	mu          sync.RWMutex
}

type Room struct {
	ID        string
	Content   string
	Language  string
	Version   int
	CreatedAt time.Time
	OwnerID   string

	clients   sync.Map // map[string]*Client
	mu        sync.RWMutex
	logger    *slog.Logger
	opHistory []OpHistoryEntry
}

const opHistoryLimit = 256

func NewRoom(id, content, language, ownerID string, logger *slog.Logger) *Room {
	return &Room{
		ID:        id,
		Content:   content,
		Language:  language,
		Version:   0,
		CreatedAt: time.Now(),
		OwnerID:   ownerID,
		logger:    logger,
		opHistory: make([]OpHistoryEntry, 0, opHistoryLimit),
	}
}

func (r *Room) AddClient(client *Client) {
	r.clients.Store(client.ID, client)
	r.logger.Info("client joined room", "roomId", r.ID, "clientId", client.ID)
}

func (r *Room) RemoveClient(clientID string) {
	r.clients.Delete(clientID)
	r.logger.Info("client left room", "roomId", r.ID, "clientId", clientID)
}

func (r *Room) GetClient(clientID string) (*Client, bool) {
	val, ok := r.clients.Load(clientID)
	if !ok {
		return nil, false
	}
	return val.(*Client), true
}

func (r *Room) ClientCount() int {
	count := 0
	r.clients.Range(func(_, _ any) bool {
		count++
		return true
	})
	return count
}

func (r *Room) Broadcast(msg []byte, excludeClientID string) {
	r.clients.Range(func(key, value any) bool {
		client := value.(*Client)
		if client.ID == excludeClientID {
			return true
		}
		select {
		case client.send <- msg:
		default:
			r.logger.Warn("client send buffer full, dropping message", "clientId", client.ID)
		}
		return true
	})
}

func (r *Room) GetSnapshot() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Content
}

func (r *Room) GetVersion() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Version
}

func (r *Room) ApplyOpBatch(clientID, opID string, baseVersion int, ops []Operation) ([]Operation, int, error) {
	if len(ops) == 0 {
		return nil, r.GetVersion(), errors.New("empty operation batch")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if baseVersion > r.Version {
		return nil, r.Version, ErrResyncRequired
	}

	historyStartVersion := r.Version - len(r.opHistory)
	if baseVersion < historyStartVersion {
		return nil, r.Version, ErrResyncRequired
	}

	transformed := make([]Operation, 0, len(ops))
	for _, op := range ops {
		transformed = append(transformed, op)
	}

	for _, entry := range r.opHistory {
		if entry.Version <= baseVersion {
			continue
		}
		for i, incoming := range transformed {
			for _, historyOp := range entry.Ops {
				incoming = transformOperation(incoming, historyOp, clientID, entry.ClientID)
			}
			transformed[i] = incoming
		}
	}

	filtered := make([]Operation, 0, len(transformed))
	for _, op := range transformed {
		if !isNoop(op) {
			filtered = append(filtered, op)
		}
	}

	updated, err := applyOperations(r.Content, filtered)
	if err != nil {
		return nil, r.Version, err
	}

	r.Version++
	r.Content = updated
	r.opHistory = append(r.opHistory, OpHistoryEntry{
		Version:  r.Version,
		Ops:      filtered,
		ClientID: clientID,
		OpID:     opID,
	})

	if len(r.opHistory) > opHistoryLimit {
		r.opHistory = r.opHistory[len(r.opHistory)-opHistoryLimit:]
	}

	return filtered, r.Version, nil
}

type PresenceInfo struct {
	Actor    ActorInfo `json:"actor"`
	Presence Presence  `json:"presence"`
}

type ActorInfo struct {
	ClientID    string `json:"clientId"`
	DisplayName string `json:"displayName,omitempty"`
	Color       string `json:"color"`
}

type Presence struct {
	Cursor    *Position  `json:"cursor,omitempty"`
	Selection *Selection `json:"selection,omitempty"`
}

type Position struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

type Selection struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

func (r *Room) GetPresenceList(excludeClientID string) []PresenceInfo {
	var presence []PresenceInfo
	r.clients.Range(func(key, value any) bool {
		client := value.(*Client)
		if client.ID == excludeClientID {
			return true
		}
		client.mu.RLock()
		clientPresence := Presence{}
		if client.Presence != nil {
			clientPresence = *client.Presence
		}
		client.mu.RUnlock()
		presence = append(presence, PresenceInfo{
			Actor: ActorInfo{
				ClientID:    client.ID,
				DisplayName: client.DisplayName,
				Color:       client.Color,
			},
			Presence: clientPresence,
		})
		return true
	})
	return presence
}

func (c *Client) UpdatePresence(cursor *Position, selection *Selection) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Presence = &Presence{
		Cursor:    cursor,
		Selection: selection,
	}
}

func (c *Client) UpdateDisplayName(name string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.DisplayName = name
}

func (c *Client) GetPresence() *Presence {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.Presence
}

func (c *Client) WriteLoop() {
	pingTicker := time.NewTicker(30 * time.Second)
	defer func() {
		pingTicker.Stop()
		c.cancel()
		c.Conn.Close(websocket.StatusNormalClosure, "")
	}()

	for {
		select {
		case <-c.ctx.Done():
			return
		case <-pingTicker.C:
			ctx, cancel := context.WithTimeout(c.ctx, 10*time.Second)
			err := c.Conn.Ping(ctx)
			cancel()
			if err != nil {
				return
			}
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			ctx, cancel := context.WithTimeout(c.ctx, 10*time.Second)
			err := c.Conn.Write(ctx, websocket.MessageText, msg)
			cancel()
			if err != nil {
				return
			}
		}
	}
}

func (c *Client) Send(msg any) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	select {
	case c.send <- data:
		return nil
	default:
		return nil // buffer full, drop message
	}
}

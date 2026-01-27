package collab

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"time"

	"nhooyr.io/websocket"
)

// SnapshotType represents the type of snapshot
type SnapshotType string

const (
	SnapshotInitial  SnapshotType = "initial"
	SnapshotManual   SnapshotType = "manual"
	SnapshotAuto     SnapshotType = "auto"
	SnapshotPreClose SnapshotType = "pre-close"
)

// Snapshot represents a saved state of the document at a point in time
type Snapshot struct {
	ID        string       `json:"id"`
	Content   string       `json:"content"`
	Timestamp time.Time    `json:"timestamp"`
	CreatedBy string       `json:"createdBy"`
	Type      SnapshotType `json:"type"`
	Message   string       `json:"message,omitempty"`
	// Computed diff stats from previous snapshot
	LinesAdded   int `json:"linesAdded"`
	LinesRemoved int `json:"linesRemoved"`
}

// DiffLine represents a single line in a diff
type DiffLine struct {
	Type    string `json:"type"` // "add", "remove", "context"
	Content string `json:"content"`
	OldLine int    `json:"oldLine,omitempty"`
	NewLine int    `json:"newLine,omitempty"`
}

// DiffHunk represents a contiguous section of changes
type DiffHunk struct {
	OldStart int        `json:"oldStart"`
	OldCount int        `json:"oldCount"`
	NewStart int        `json:"newStart"`
	NewCount int        `json:"newCount"`
	Lines    []DiffLine `json:"lines"`
}

// DiffResult represents the result of comparing two snapshots
type DiffResult struct {
	LinesAdded   int        `json:"linesAdded"`
	LinesRemoved int        `json:"linesRemoved"`
	Hunks        []DiffHunk `json:"hunks"`
}

const maxSnapshots = 50

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

	// Snapshot-related fields
	snapshots           []*Snapshot
	originalContent     string    // Content when sharing started
	lastAutoSave        time.Time // Last auto-save timestamp
	contentChangedSince bool      // Track if content changed since last snapshot

	// Hibernation: track when room became empty for cleanup
	emptyAt *time.Time
}

const opHistoryLimit = 256

func NewRoom(id, content, language, ownerID string, logger *slog.Logger) *Room {
	now := time.Now()
	room := &Room{
		ID:              id,
		Content:         content,
		Language:        language,
		Version:         0,
		CreatedAt:       now,
		OwnerID:         ownerID,
		logger:          logger,
		opHistory:       make([]OpHistoryEntry, 0, opHistoryLimit),
		snapshots:       make([]*Snapshot, 0, maxSnapshots),
		originalContent: content,
		lastAutoSave:    now,
	}

	// Create the initial snapshot
	room.createInitialSnapshot(content)

	return room
}

func (r *Room) AddClient(client *Client) {
	r.clients.Store(client.ID, client)
	r.mu.Lock()
	r.emptyAt = nil // Wake up room from hibernation
	r.mu.Unlock()
	r.logger.Info("client joined room", "roomId", r.ID, "clientId", client.ID)
}

func (r *Room) RemoveClient(clientID string) {
	r.clients.Delete(clientID)
	r.mu.Lock()
	if r.clientCountLocked() == 0 {
		now := time.Now()
		r.emptyAt = &now
		r.logger.Info("room now empty, starting hibernation timer", "roomId", r.ID)
	}
	r.mu.Unlock()
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
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.clientCountLocked()
}

func (r *Room) clientCountLocked() int {
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

// generateSnapshotID creates a unique ID for a snapshot
func generateSnapshotID() string {
	return time.Now().Format("20060102150405") + "_" + randomString(6)
}

// randomString generates a random alphanumeric string of the given length
func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
		time.Sleep(time.Nanosecond) // Ensure different values
	}
	return string(b)
}

// createInitialSnapshot creates the initial snapshot when room is created
func (r *Room) createInitialSnapshot(content string) *Snapshot {
	snapshot := &Snapshot{
		ID:           generateSnapshotID(),
		Content:      content,
		Timestamp:    r.CreatedAt,
		CreatedBy:    r.OwnerID,
		Type:         SnapshotInitial,
		Message:      "Initial content",
		LinesAdded:   0,
		LinesRemoved: 0,
	}
	r.snapshots = append(r.snapshots, snapshot)
	return snapshot
}

// CreateSnapshot creates a new snapshot of the current document state
func (r *Room) CreateSnapshot(createdBy string, snapType SnapshotType, message string) *Snapshot {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.createSnapshotLocked(createdBy, snapType, message)
}

// createSnapshotLocked creates a snapshot (must be called with lock held)
func (r *Room) createSnapshotLocked(createdBy string, snapType SnapshotType, message string) *Snapshot {
	now := time.Now()

	// Compute diff stats from previous snapshot
	var linesAdded, linesRemoved int
	if len(r.snapshots) > 0 {
		prevContent := r.snapshots[len(r.snapshots)-1].Content
		diff := computeLineDiff(prevContent, r.Content)
		linesAdded = diff.LinesAdded
		linesRemoved = diff.LinesRemoved
	}

	snapshot := &Snapshot{
		ID:           generateSnapshotID(),
		Content:      r.Content,
		Timestamp:    now,
		CreatedBy:    createdBy,
		Type:         snapType,
		Message:      message,
		LinesAdded:   linesAdded,
		LinesRemoved: linesRemoved,
	}

	r.snapshots = append(r.snapshots, snapshot)
	r.lastAutoSave = now
	r.contentChangedSince = false

	// Enforce max snapshots limit
	if len(r.snapshots) > maxSnapshots {
		r.snapshots = r.snapshots[len(r.snapshots)-maxSnapshots:]
	}

	r.logger.Info("snapshot created",
		"roomId", r.ID,
		"snapshotId", snapshot.ID,
		"type", snapType,
		"linesAdded", linesAdded,
		"linesRemoved", linesRemoved)

	return snapshot
}

// GetSnapshots returns a copy of all snapshots (without full content to reduce payload)
func (r *Room) GetSnapshots() []Snapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]Snapshot, len(r.snapshots))
	for i, s := range r.snapshots {
		result[i] = Snapshot{
			ID:           s.ID,
			Timestamp:    s.Timestamp,
			CreatedBy:    s.CreatedBy,
			Type:         s.Type,
			Message:      s.Message,
			LinesAdded:   s.LinesAdded,
			LinesRemoved: s.LinesRemoved,
			// Omit Content to reduce payload size
		}
	}
	return result
}

// GetSnapshotByID returns a snapshot by its ID
func (r *Room) GetSnapshotByID(snapshotID string) (*Snapshot, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, s := range r.snapshots {
		if s.ID == snapshotID {
			return s, true
		}
	}
	return nil, false
}

// GetOriginalContent returns the original content when sharing started
func (r *Room) GetOriginalContent() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.originalContent
}

// RestoreToSnapshot restores the room content to a specific snapshot
func (r *Room) RestoreToSnapshot(snapshotID string) (*Snapshot, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	var targetSnapshot *Snapshot
	for _, s := range r.snapshots {
		if s.ID == snapshotID {
			targetSnapshot = s
			break
		}
	}

	if targetSnapshot == nil {
		return nil, errors.New("snapshot not found")
	}

	// Create a pre-restore snapshot if there are unsaved changes
	if r.contentChangedSince {
		r.createSnapshotLocked("system", SnapshotPreClose, "Pre-restore backup")
	}

	// Restore content
	r.Content = targetSnapshot.Content
	r.Version++
	r.contentChangedSince = false

	r.logger.Info("restored to snapshot",
		"roomId", r.ID,
		"snapshotId", snapshotID)

	return targetSnapshot, nil
}

// GetDiff computes the diff between two snapshots
func (r *Room) GetDiff(snapshot1ID, snapshot2ID string) (*DiffResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var content1, content2 string
	found1 := snapshot1ID == ""
	found2 := snapshot2ID == ""

	if snapshot1ID == "original" {
		content1 = r.originalContent
		found1 = true
	} else {
		for _, s := range r.snapshots {
			if s.ID == snapshot1ID {
				content1 = s.Content
				found1 = true
				break
			}
		}
	}
	if !found1 {
		return nil, errors.New("snapshot1 not found")
	}

	if snapshot2ID == "current" {
		content2 = r.Content
		found2 = true
	} else {
		for _, s := range r.snapshots {
			if s.ID == snapshot2ID {
				content2 = s.Content
				found2 = true
				break
			}
		}
	}
	if !found2 {
		return nil, errors.New("snapshot2 not found")
	}

	diff := computeLineDiff(content1, content2)
	return &diff, nil
}

// CleanupSnapshots removes all snapshots except the last one (called when room ends)
func (r *Room) CleanupSnapshots() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.snapshots) > 1 {
		// Keep only the last snapshot
		r.snapshots = r.snapshots[len(r.snapshots)-1:]
	}
	r.logger.Info("snapshots cleaned up", "roomId", r.ID)
}

// HasChanges returns whether there have been changes since the last snapshot
func (r *Room) HasChanges() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.contentChangedSince
}

// IsStale returns whether the room has been empty longer than the given duration
func (r *Room) IsStale(maxEmptyDuration time.Duration) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.emptyAt == nil {
		return false
	}
	return time.Since(*r.emptyAt) > maxEmptyDuration
}

// MarkContentChanged marks that content has changed since last snapshot
func (r *Room) MarkContentChanged() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.contentChangedSince = true
}

// ShouldAutoSave returns whether enough time has passed for an auto-save
func (r *Room) ShouldAutoSave(interval time.Duration) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.contentChangedSince && time.Since(r.lastAutoSave) >= interval
}

// computeLineDiff computes a line-based diff between two strings
func computeLineDiff(oldContent, newContent string) DiffResult {
	oldLines := splitLines(oldContent)
	newLines := splitLines(newContent)

	// Simple line diff using longest common subsequence approach
	lcs := computeLCS(oldLines, newLines)

	var hunks []DiffHunk
	var linesAdded, linesRemoved int

	oldIdx, newIdx, lcsIdx := 0, 0, 0
	var currentHunk *DiffHunk

	for oldIdx < len(oldLines) || newIdx < len(newLines) {
		// Check if current lines match the LCS
		if lcsIdx < len(lcs) &&
			oldIdx < len(oldLines) && newIdx < len(newLines) &&
			oldLines[oldIdx] == lcs[lcsIdx] && newLines[newIdx] == lcs[lcsIdx] {
			// Lines match - context
			if currentHunk != nil {
				// Add context line to current hunk
				currentHunk.Lines = append(currentHunk.Lines, DiffLine{
					Type:    "context",
					Content: oldLines[oldIdx],
					OldLine: oldIdx + 1,
					NewLine: newIdx + 1,
				})
				currentHunk.OldCount++
				currentHunk.NewCount++
			}
			oldIdx++
			newIdx++
			lcsIdx++
		} else {
			// Start a new hunk if needed
			if currentHunk == nil {
				currentHunk = &DiffHunk{
					OldStart: oldIdx + 1,
					NewStart: newIdx + 1,
					Lines:    []DiffLine{},
				}
			}

			// Remove old lines not in LCS
			for oldIdx < len(oldLines) &&
				(lcsIdx >= len(lcs) || oldLines[oldIdx] != lcs[lcsIdx]) {
				currentHunk.Lines = append(currentHunk.Lines, DiffLine{
					Type:    "remove",
					Content: oldLines[oldIdx],
					OldLine: oldIdx + 1,
				})
				currentHunk.OldCount++
				linesRemoved++
				oldIdx++
			}

			// Add new lines not in LCS
			for newIdx < len(newLines) &&
				(lcsIdx >= len(lcs) || newLines[newIdx] != lcs[lcsIdx]) {
				currentHunk.Lines = append(currentHunk.Lines, DiffLine{
					Type:    "add",
					Content: newLines[newIdx],
					NewLine: newIdx + 1,
				})
				currentHunk.NewCount++
				linesAdded++
				newIdx++
			}

			// Close hunk if we've moved past the changes
			if lcsIdx < len(lcs) &&
				oldIdx < len(oldLines) && newIdx < len(newLines) &&
				oldLines[oldIdx] == lcs[lcsIdx] && newLines[newIdx] == lcs[lcsIdx] {
				if currentHunk != nil && len(currentHunk.Lines) > 0 {
					hunks = append(hunks, *currentHunk)
					currentHunk = nil
				}
			}
		}
	}

	// Close any remaining hunk
	if currentHunk != nil && len(currentHunk.Lines) > 0 {
		hunks = append(hunks, *currentHunk)
	}

	return DiffResult{
		LinesAdded:   linesAdded,
		LinesRemoved: linesRemoved,
		Hunks:        hunks,
	}
}

// splitLines splits content into lines
func splitLines(content string) []string {
	if content == "" {
		return []string{}
	}
	return strings.Split(content, "\n")
}

// computeLCS computes the longest common subsequence of two string slices
func computeLCS(a, b []string) []string {
	m, n := len(a), len(b)
	if m == 0 || n == 0 {
		return []string{}
	}

	// DP table
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}

	// Fill the DP table
	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else {
				dp[i][j] = max(dp[i-1][j], dp[i][j-1])
			}
		}
	}

	// Backtrack to find the LCS
	lcs := make([]string, 0, dp[m][n])
	i, j := m, n
	for i > 0 && j > 0 {
		if a[i-1] == b[j-1] {
			lcs = append([]string{a[i-1]}, lcs...)
			i--
			j--
		} else if dp[i-1][j] > dp[i][j-1] {
			i--
		} else {
			j--
		}
	}

	return lcs
}

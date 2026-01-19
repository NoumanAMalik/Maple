# Maple Backend Implementation Plan

A comprehensive plan for adding a Go WebSocket backend to Maple, enabling real-time collaborative editing, cloud storage, and user accounts.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Go Backend Architecture](#3-go-backend-architecture)
4. [Database Schema](#4-database-schema)
5. [Railway Deployment](#5-railway-deployment)
6. [Frontend Integration](#6-frontend-integration)
7. [Features Enabled](#7-features-enabled)
8. [Implementation Phases](#8-implementation-phases)
9. [Risks & Guardrails](#9-risks--guardrails)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Railway                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │     Next.js      │    │    Go Server     │    │  PostgreSQL  │   │
│  │    (apps/web)    │◄──►│   (apps/collab)  │◄──►│     (DB)     │   │
│  │                  │    │                  │    │              │   │
│  │  - UI/Editor     │    │  - WebSocket Hub │    │  - Users     │   │
│  │  - IndexedDB     │    │  - OT Engine     │    │  - Documents │   │
│  │  - Collab Client │    │  - REST API      │    │  - Ops Log   │   │
│  │                  │    │  - Auth/JWT      │    │  - Sessions  │   │
│  └──────────────────┘    └──────────────────┘    └──────────────┘   │
│           │                       │                                  │
│           └───────────────────────┘                                  │
│              WebSocket + REST API                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Core Principles:**
- Go server is the **authoritative source** for document state
- OT (Operational Transformation) ensures conflict-free concurrent editing
- IndexedDB remains for offline support with sync-on-reconnect
- JWT + refresh tokens for secure, stateless authentication

---

## 2. Monorepo Structure

### Tooling: Turborepo + Bun Workspaces

We already use Bun; adding Turborepo provides build orchestration and caching.

### Folder Layout

```
maple/
├── apps/
│   ├── web/                        # Next.js app (existing code moved here)
│   │   ├── app/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── collab/             # NEW: WebSocket client, sync logic
│   │   │   ├── storage/            # Existing IndexedDB (enhanced for sync)
│   │   │   ├── tokenizer/
│   │   │   └── highlighting/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── collab/                     # Go WebSocket + REST server
│       ├── cmd/
│       │   └── collab/
│       │       └── main.go         # Entry point
│       ├── internal/
│       │   ├── config/             # Environment parsing, constants
│       │   ├── httpapi/            # REST handlers, middleware, router
│       │   ├── ws/                 # WebSocket transport, protocol
│       │   ├── collab/             # Room hub, room lifecycle
│       │   ├── ot/                 # OT operations, transform, apply
│       │   ├── auth/               # JWT, sessions, password hashing
│       │   ├── db/                 # PostgreSQL queries, repositories
│       │   ├── models/             # Domain structs (User, Document, Op)
│       │   ├── service/            # Business logic / use-cases
│       │   └── observability/      # Logging, metrics
│       ├── migrations/             # SQL migration files
│       ├── go.mod
│       ├── go.sum
│       └── Dockerfile
│
├── packages/
│   ├── protocol/                   # Shared TypeScript types for WS/REST
│   │   ├── src/
│   │   │   ├── ws.ts               # WebSocket message types
│   │   │   ├── rest.ts             # REST API types
│   │   │   ├── operations.ts       # OT operation types
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                     # Shared configs (biome, tsconfig base)
│       ├── biome.json
│       └── tsconfig.base.json
│
├── turbo.json                      # Turborepo pipeline config
├── package.json                    # Root workspace config
├── biome.json                      # Root biome config
└── README.md
```

### Root `package.json`

```json
{
  "name": "maple",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "bin/**"]
    },
    "lint": {},
    "type-check": {},
    "test": {}
  }
}
```

### Shared Types Strategy

**Primary approach: TypeScript-first with Go mirroring**

- `packages/protocol` exports TypeScript discriminated unions for all WS messages and REST types
- Go server mirrors these with explicit structs and validation
- Clear versioning (`v: 1`) in all messages for future protocol evolution

**Optional future enhancement:** Protobuf schemas with `buf` + `ts-proto` for generated types in both languages.

---

## 3. Go Backend Architecture

### Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| HTTP Router | `go-chi/chi` | Lightweight, idiomatic routing |
| WebSocket | `nhooyr.io/websocket` | Modern, context-based WebSockets |
| PostgreSQL | `jackc/pgx/v5` | High-performance Postgres driver |
| Logging | `log/slog` | Structured logging (stdlib) |
| Migrations | `golang-migrate/migrate` | SQL migrations |
| Password Hashing | `golang.org/x/crypto/argon2` | Secure password storage |

### Go Project Structure

```
apps/collab/
├── cmd/collab/
│   └── main.go                     # Entry point, server startup
│
├── internal/
│   ├── config/
│   │   └── config.go               # Env parsing, validation
│   │
│   ├── httpapi/
│   │   ├── router.go               # Chi router setup
│   │   ├── middleware.go           # Auth, CORS, logging, recovery
│   │   ├── auth_handlers.go        # Register, login, refresh, logout
│   │   ├── doc_handlers.go         # Document CRUD
│   │   ├── collab_handlers.go      # Collaborators, share links
│   │   └── ws_handler.go           # WebSocket upgrade endpoint
│   │
│   ├── ws/
│   │   ├── transport.go            # WS read/write, message encoding
│   │   ├── protocol.go             # Message types, versioning
│   │   └── conn.go                 # Per-connection wrapper
│   │
│   ├── collab/
│   │   ├── hub.go                  # Map of docID → Room, lifecycle
│   │   ├── room.go                 # Single-goroutine room loop
│   │   └── presence.go             # Cursor/selection state
│   │
│   ├── ot/
│   │   ├── operation.go            # Insert/Delete op types
│   │   ├── transform.go            # OT transformation rules
│   │   ├── apply.go                # Apply ops to document state
│   │   └── ot_test.go              # Critical: transformation tests
│   │
│   ├── auth/
│   │   ├── jwt.go                  # Token generation, validation
│   │   ├── session.go              # Refresh token management
│   │   └── password.go             # Argon2id hashing
│   │
│   ├── db/
│   │   ├── pool.go                 # Connection pool setup
│   │   ├── user_repo.go            # User queries
│   │   ├── doc_repo.go             # Document queries
│   │   ├── op_repo.go              # Operation log queries
│   │   └── session_repo.go         # Session queries
│   │
│   ├── models/
│   │   ├── user.go
│   │   ├── document.go
│   │   ├── operation.go
│   │   └── session.go
│   │
│   ├── service/
│   │   ├── auth_service.go         # Auth business logic
│   │   ├── doc_service.go          # Document orchestration
│   │   └── collab_service.go       # Collaboration logic
│   │
│   └── observability/
│       ├── logger.go               # slog configuration
│       └── metrics.go              # Prometheus metrics (optional)
│
├── migrations/
│   ├── 000001_create_users.up.sql
│   ├── 000001_create_users.down.sql
│   ├── 000002_create_documents.up.sql
│   └── ...
│
├── go.mod
├── go.sum
└── Dockerfile
```

### WebSocket Server Design

#### Architecture: Hub → Rooms → Connections

```
┌─────────────────────────────────────────────────────────────┐
│                          Hub                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           map[docID]*Room                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│     ┌──────────────────────┼──────────────────────┐         │
│     ▼                      ▼                      ▼         │
│  ┌──────┐              ┌──────┐              ┌──────┐       │
│  │Room A│              │Room B│              │Room C│       │
│  │      │              │      │              │      │       │
│  │ Conn │              │ Conn │              │ Conn │       │
│  │ Conn │              │ Conn │              │      │       │
│  │ Conn │              │      │              │      │       │
│  └──────┘              └──────┘              └──────┘       │
└─────────────────────────────────────────────────────────────┘
```

#### Hub

- Owns a `sync.Map` or mutex-protected map of `docID → *Room`
- Creates rooms on first join
- Closes rooms after idle timeout (e.g., 5 minutes with no connections)
- Handles graceful shutdown

#### Room

- **Single goroutine** per room - acts as the "lock," serializes all operations
- Maintains:
  - In-memory document state (current text + version)
  - List of active connections
  - Presence state per connection
- Handles:
  - Joins/leaves
  - Incoming operations (transform, apply, persist, broadcast)
  - Presence updates
  - Heartbeat/ping management

#### Connection (`Conn`)

- Wraps `websocket.Conn`
- Reader goroutine: decode messages → send to room channel
- Writer goroutine: receive from outbound channel → encode + send
- Bounded outbound channel to prevent slow clients from blocking

### OT (Operational Transformation) Implementation

#### Operation Model

```go
// Minimal OT for text editing
type OpType string

const (
    OpInsert OpType = "insert"
    OpDelete OpType = "delete"
)

type Operation struct {
    Type OpType `json:"type"`
    Pos  int    `json:"pos"`  // UTF-16 code unit position
    Text string `json:"text,omitempty"` // For insert
    Len  int    `json:"len,omitempty"`  // For delete
}

type OpBatch struct {
    DocID       string      `json:"docId"`
    OpID        string      `json:"opId"`        // UUID for idempotency
    ClientID    string      `json:"clientId"`
    BaseVersion int64       `json:"baseVersion"` // Version client was editing against
    Ops         []Operation `json:"ops"`
}
```

#### Transformation Rules

For Insert/Insert:
- If `op1.Pos <= op2.Pos`: op2.Pos += len(op1.Text)
- Else: op1.Pos += len(op2.Text)

For Insert/Delete:
- Complex handling based on position overlap

For Delete/Delete:
- Handle overlapping ranges, adjust positions

#### Server Algorithm (Authoritative OT)

```
1. Receive OpBatch from client with baseVersion
2. If baseVersion < serverVersion:
   a. Load ops since baseVersion (from memory ring buffer or DB)
   b. Transform incoming ops against each concurrent op in order
3. Apply transformed ops to server document state
4. Increment serverVersion
5. Persist ops to document_ops table
6. Broadcast transformed ops to all other clients in room
7. Send ack to original client with new version
```

#### Client Algorithm

```
Maintain:
- localVersion (last server-ack'd version)
- pendingOps[] (sent but not ack'd)
- bufferedOps[] (created while offline)

On user edit:
1. Create op → apply locally immediately
2. Enqueue to pending → send with baseVersion = localVersion

On receiving remote op:
1. Transform remote op against all pendingOps
2. Apply transformed remote op locally

On receiving ack:
1. Remove from pendingOps
2. Advance localVersion
```

### Authentication

#### Token Strategy

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token (JWT) | 15 minutes | Memory only | API authentication |
| Refresh Token | 30 days | HttpOnly cookie | Session renewal |

#### JWT Claims

```go
type Claims struct {
    UserID      string `json:"sub"`
    Email       string `json:"email"`
    DisplayName string `json:"name"`
    jwt.RegisteredClaims
}
```

#### WebSocket Authentication

**Preferred:** Cookie-based auth (if same domain)
- Browser automatically sends cookies on WS upgrade
- Server validates refresh token, issues short-lived WS session

**Fallback:** Token in first message
- Client sends `hello` message with access token
- Server validates before accepting further messages

### REST API Endpoints

#### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Create new account |
| POST | `/v1/auth/login` | Login, receive tokens |
| POST | `/v1/auth/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Invalidate refresh token |
| GET | `/v1/me` | Get current user profile |

#### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/docs` | Create document |
| GET | `/v1/docs` | List accessible documents |
| GET | `/v1/docs/:id` | Get document metadata |
| GET | `/v1/docs/:id/content` | Get content (snapshot + ops) |
| PATCH | `/v1/docs/:id` | Update metadata (rename) |
| DELETE | `/v1/docs/:id` | Delete document |

#### Collaboration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/docs/:id/collaborators` | Add collaborator |
| DELETE | `/v1/docs/:id/collaborators/:userId` | Remove collaborator |
| POST | `/v1/docs/:id/share-links` | Create share link |
| DELETE | `/v1/share-links/:id` | Revoke share link |

#### History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/docs/:id/versions` | List version snapshots |
| GET | `/v1/docs/:id/versions/:version` | Get specific version |

#### WebSocket

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/ws` | WebSocket upgrade |

---

## 4. Database Schema

### PostgreSQL Tables

```sql
-- ===========================================
-- USERS
-- ===========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ===========================================
-- SESSIONS (Refresh Tokens)
-- ===========================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ===========================================
-- DOCUMENTS
-- ===========================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    language TEXT,
    current_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);

-- ===========================================
-- DOCUMENT COLLABORATORS
-- ===========================================
CREATE TABLE document_collaborators (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, user_id)
);

CREATE INDEX idx_document_collaborators_user_id ON document_collaborators(user_id);

-- ===========================================
-- DOCUMENT OPERATIONS (OT Log)
-- ===========================================
CREATE TABLE document_ops (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version BIGINT NOT NULL,
    op_id UUID NOT NULL,
    actor_user_id UUID REFERENCES users(id),
    actor_client_id TEXT NOT NULL,
    base_version BIGINT NOT NULL,
    ops_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, version)
);

CREATE INDEX idx_document_ops_created_at ON document_ops(document_id, created_at);

-- ===========================================
-- DOCUMENT SNAPSHOTS (for fast loading + history)
-- ===========================================
CREATE TABLE document_snapshots (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, version)
);

CREATE INDEX idx_document_snapshots_version ON document_snapshots(document_id, version DESC);

-- ===========================================
-- SHARE LINKS
-- ===========================================
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_links_document_id ON share_links(document_id);
CREATE INDEX idx_share_links_token_hash ON share_links(token_hash);
```

### Migrations Strategy

- Use `golang-migrate/migrate` CLI and library
- Migration files in `apps/collab/migrations/`
- Naming: `000001_description.up.sql` / `000001_description.down.sql`
- Migrations are **immutable** once committed
- Run migrations as Railway release command

### Snapshot Strategy

- Create snapshot every **100 operations** or **5 minutes** (whichever comes first)
- On document load: fetch latest snapshot + all ops since
- Optional: prune old ops before oldest retained snapshot

---

## 5. Railway Deployment

### Services

| Service | Type | Description |
|---------|------|-------------|
| `web` | Next.js | Frontend application |
| `collab` | Go | WebSocket + REST API server |
| `postgres` | PostgreSQL | Railway managed database |

### Environment Variables

#### `collab` Service

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/maple

# Auth
JWT_SIGNING_KEY=<32+ byte secret>
REFRESH_TOKEN_PEPPER=<32+ byte secret>
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=720h

# CORS
CORS_ORIGINS=https://maple.yourdomain.com

# Server
PORT=8080
LOG_LEVEL=info
PUBLIC_BASE_URL=https://api.maple.yourdomain.com
```

#### `web` Service

```env
# API URLs (used by browser)
NEXT_PUBLIC_API_URL=https://api.maple.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.maple.yourdomain.com/v1/ws

# Internal URL (for server-side calls, optional)
API_INTERNAL_URL=http://collab:8080
```

### Dockerfile for Go Server

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /collab ./cmd/collab

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /collab .
COPY migrations ./migrations

EXPOSE 8080

CMD ["./collab"]
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Lint & Type Check (TS)
        run: bun run lint && bun run type-check
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      
      - name: Test Go
        working-directory: apps/collab
        run: go test ./...
      
      - name: Build
        run: bun run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: railwayapp/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

### Railway Start Commands

**collab:**
```bash
./collab migrate up && ./collab serve
```

**web:**
```bash
bun run start
```

---

## 6. Frontend Integration

### New `lib/collab/` Module

```
apps/web/lib/collab/
├── client.ts           # CollabClient class - WS connection management
├── protocol.ts         # Message encoding/decoding
├── ot-client.ts        # Client-side OT state machine
├── sync.ts             # IndexedDB sync layer
└── types.ts            # Re-export from @maple/protocol
```

### CollabClient Class

```typescript
class CollabClient {
    private ws: WebSocket | null = null;
    private pendingOps: OpBatch[] = [];
    private localVersion: number = 0;
    private reconnectAttempts: number = 0;

    // Connection
    connect(docId: string): void;
    disconnect(): void;
    
    // Operations
    sendOp(ops: Operation[]): void;
    
    // Presence
    sendPresence(cursor: Position, selection?: Selection): void;
    
    // Events
    onRemoteOp: (ops: Operation[], actor: Actor) => void;
    onPresenceUpdate: (actor: Actor, presence: Presence) => void;
    onConnectionChange: (status: ConnectionStatus) => void;
}
```

### WebSocket Message Protocol

**Version:** `v: 1`

#### Client → Server

```typescript
// Join document
{ v: 1, t: "hello", docId: string, clientId: string, resume?: { lastSeenVersion: number } }

// Send operation
{ v: 1, t: "op", opId: string, baseVersion: number, ops: Operation[], presence?: Presence }

// Update presence
{ v: 1, t: "presence", cursor: Position, selection?: Selection }
```

#### Server → Client

```typescript
// Welcome (initial state)
{ v: 1, t: "welcome", docId: string, serverVersion: number, snapshot: string, presence: Presence[] }

// Acknowledge operation
{ v: 1, t: "ack", opId: string, newVersion: number }

// Remote operation from another client
{ v: 1, t: "remote_op", version: number, actor: Actor, ops: Operation[] }

// Presence update from another client
{ v: 1, t: "presence_update", actor: Actor, cursor: Position, selection?: Selection }

// Error
{ v: 1, t: "error", code: string, message: string }

// Resync required (client too far behind)
{ v: 1, t: "resync_required" }
```

### IndexedDB Sync Layer

**Enhanced Schema:**

```typescript
interface LocalDocument {
    id: string;
    serverId?: string;          // null if not synced yet
    title: string;
    content: string;
    language?: string;
    lastSyncedVersion: number;  // 0 if never synced
    localVersion: number;
    updatedAt: number;
}

interface OutboxOp {
    id: string;
    docId: string;
    ops: Operation[];
    createdAt: number;
    status: 'pending' | 'sending' | 'failed';
}
```

**Sync Flow:**

1. **Online editing:** Ops sent immediately, IndexedDB updated on ack
2. **Offline editing:** Ops stored in outbox, applied locally
3. **Reconnect:**
   - Fetch server state: `GET /docs/:id/content`
   - Transform outbox ops against server ops since last sync
   - Send rebased ops
   - Mark outbox entries as committed

### Auth Flow

```
1. User logs in → POST /v1/auth/login
2. Server returns access token + sets refresh cookie
3. Access token stored in memory (React state/context)
4. WS connects with cookie (auto-authenticated)
5. Access token refreshed silently when near expiry
6. On 401, refresh from cookie → retry
```

---

## 7. Features Enabled

### User Accounts & Authentication

- **Register/Login:** Email + password
- **Session management:** Multiple devices, revoke sessions
- **Profile:** Display name, avatar (future)

### Cloud File Storage & Sync

- **Create documents:** Saved to PostgreSQL
- **Access anywhere:** Documents load on any device
- **Offline support:** IndexedDB cache + sync on reconnect
- **Auto-save:** Ops persisted as you type

### Real-Time Collaborative Editing

- **Multiple cursors:** See where others are typing
- **Live updates:** Changes appear instantly
- **Conflict resolution:** OT ensures consistency
- **Presence indicators:** Who's online, what they're doing

### Version History

- **Browse versions:** See document at any point
- **Snapshots:** Periodic full-content saves
- **Op log:** Every change recorded
- **Restore:** Revert to previous version

### File Sharing

- **Add collaborators:** By email, with roles (editor/viewer)
- **Share links:** Public/private links with expiry
- **Permissions:** Owner, editor, viewer roles

### Offline Support

- **Local-first:** IndexedDB is primary store
- **Outbox queue:** Ops saved when offline
- **Automatic sync:** Seamless reconnect and merge
- **Conflict handling:** OT resolves divergent edits

---

## 8. Implementation Phases

> **Strategy: Anonymous-First**
> 
> We validate the core real-time collaboration (WebSocket + OT) with anonymous in-memory
> sharing before adding authentication, database persistence, or user accounts. This lets
> us prove Railway deployment works and OT is correct with minimal complexity.

---

### Phase 0: Monorepo Setup ✅ COMPLETE

**Tasks:**
- [x] Move existing Next.js code to `apps/web/`
- [x] Create `apps/collab/` with Go module
- [x] Add Turborepo configuration
- [x] Create `packages/protocol/` with initial types
- [x] Set up `turbo dev` to run both services

**Milestone:** ✅ `turbo dev` runs Next.js + Go placeholder server

---

### Phase 1: Go Server Skeleton + Room Management ✅ COMPLETE

**Tasks:**
- [x] Set up Chi router with basic middleware (CORS, logging, recovery)
- [x] Add slog structured logging
- [x] Health check endpoint (`GET /health` and `GET /v1/health`)
- [x] Basic Dockerfile for Railway deployment
- [x] **No database yet** — server is stateless
- [x] In-memory RoomRegistry (`internal/collab/registry.go`)
- [x] Room + Client structs with sync.Map (`internal/collab/room.go`)
- [x] REST endpoints: `POST /v1/rooms`, `GET /v1/rooms/:roomId`, `DELETE /v1/rooms/:roomId`
- [x] WebSocket upgrade endpoint: `GET /v1/rooms/:roomId/ws`
- [x] WebSocket handler with hello → welcome flow (`internal/collab/handler.go`)
- [x] Client read/write goroutines with broadcast helper
- [x] User joined/left notifications
- [x] railway.json configuration

**Milestone:** ✅ Go server deployed to Railway at `maple-production-1b30.up.railway.app`

**Deployed Infrastructure:**
- Go collab server: Railway (`https://maple-production-1b30.up.railway.app`)
- Next.js frontend: Vercel (configured with `NEXT_PUBLIC_COLLAB_URL`)

---

### Phase 2: Anonymous WebSocket Rooms + Presence ✅ COMPLETE

**Goal:** User clicks "Share" on a local file → creates a shareable link → others join and see cursors

**Backend Tasks:**
- [x] `POST /v1/rooms` — creates room, returns `{ roomId, shareUrl }`
- [x] `DELETE /v1/rooms/:roomId` — delete room
- [x] WebSocket upgrade at `/v1/rooms/:roomId/ws`
- [x] Hub manages `roomId → *Room` map (in-memory only)
- [x] Room stores document content in memory
- [x] First client sends initial content; subsequent clients receive it
- [x] Presence broadcasting (cursors, selections) — `handlePresence()` in handler.go
- [x] Heartbeat/ping-pong for connection health — 30s ping in WriteLoop
- [x] Room auto-cleanup after 5 minutes when empty — cleanupLoop in registry.go

**Frontend Tasks:**
- [x] "Share" button in editor toolbar — ShareButton.tsx
- [x] Generate share link with copy functionality — SharePopover.tsx
- [x] CollabClient WebSocket connection — lib/collab/client.ts
- [x] Display collaborator cursors with colors — CollaboratorCursor.tsx
- [x] "Stop Sharing" button clears room — SharePopover.tsx
- [x] useCollab hook for React integration — hooks/useCollab.ts

**Milestone:** ✅ Two browsers can open same link, see each other's cursors in real-time

---

### Phase 3: OT Implementation — In-Memory (1-2 days)

**Goal:** Multiple users can type concurrently without document corruption

**Tasks:**
- [ ] Define Operation types in Go (`Insert{Pos, Text}`, `Delete{Pos, Len}`)
- [ ] Implement transform functions (Insert×Insert, Insert×Delete, Delete×Delete)
- [ ] Implement apply functions (apply op to string)
- [ ] Server OT loop: receive op → transform against concurrent ops → apply → broadcast
- [ ] Client OT: pending ops queue, transform remote ops against pending
- [ ] Ack messages so client knows op was accepted
- [ ] **All state in memory** — no database persistence yet
- [ ] Write extensive OT unit tests
- [ ] Add convergence tests (random ops → same final state)

**Milestone:** Two clients can type concurrently, document stays consistent, no corruption

---

### Phase 4: Production Validation (2-4 hours)

**Goal:** Prove the anonymous sharing works in production

**Tasks:**
- [x] Deploy Go server to Railway
- [x] Deploy Next.js to Vercel
- [x] Configure CORS for production domains
- [ ] Test WebSocket connections work through Railway's proxy
- [ ] Test room creation, joining, real-time sync
- [ ] Test room cleanup on disconnect
- [ ] Basic load test (5-10 concurrent rooms)

**Milestone:** Anonymous real-time collaboration works in production

---

### Phase 5: Database + Authentication (4-8 hours)

**Now that core collab works, add persistence and accounts**

**Tasks:**
- [ ] Add PostgreSQL service on Railway
- [ ] Configure pgxpool connection
- [ ] Create migrations infrastructure
- [ ] Create base tables: `users`, `sessions`
- [ ] Implement password hashing (Argon2id)
- [ ] Create register/login/refresh/logout endpoints
- [ ] Add auth middleware
- [ ] JWT + refresh token flow

**Milestone:** Users can register, login, call `/me`

---

### Phase 6: Persistent Documents (4-8 hours)

**Tasks:**
- [ ] Create `documents`, `document_ops`, `document_snapshots` tables
- [ ] Implement document CRUD endpoints
- [ ] Persist OT ops to database (ops log)
- [ ] Create snapshots every 100 ops
- [ ] Load document from snapshot + replay ops on room creation
- [ ] Authorization checks (owner/collaborator)

**Milestone:** Documents persist to database, survive server restarts

---

### Phase 7: Offline Sync (1-2 days)

**Tasks:**
- [ ] Extend IndexedDB schema with sync fields
- [ ] Create outbox for offline ops
- [ ] Reconnect + rebase logic
- [ ] Handle `resync_required` message
- [ ] Test offline → online scenarios

**Milestone:** Edit offline → reconnect → changes merge correctly

---

### Phase 8: Sharing + Collaboration UI (1-2 days)

**Tasks:**
- [ ] Add collaborators by email
- [ ] Share links with expiry and permissions
- [ ] Version history endpoint
- [ ] UI for managing collaborators
- [ ] UI for share links
- [ ] Version history panel

**Milestone:** Invite collaborators, edit together, browse history

---

### Phase 9: Production Hardening (1-2 days)

**Tasks:**
- [ ] Add rate limiting
- [ ] Add message size limits
- [ ] Request ID tracing
- [ ] Structured error responses
- [ ] Automated migrations in deploy
- [ ] Load test WebSocket rooms
- [ ] OT fuzz testing

**Milestone:** Stable, production-ready deployment

---

## 9. Risks & Guardrails

### OT Correctness

**Risk:** OT transformation bugs cause document corruption

**Mitigation:**
- Write exhaustive unit tests for all transform cases
- Implement convergence tests: multiple clients, random ops, verify same final state
- Log all ops for debugging
- Add document checksum verification

### Unicode Indexing

**Risk:** Position mismatches between browser and server

**Mitigation:**
- Standardize on UTF-16 code units (matches JavaScript)
- Document indexing convention clearly
- Test with emoji, CJK characters, combining marks

### WebSocket Overload

**Risk:** Too many messages overwhelm clients or server

**Mitigation:**
- Throttle presence updates (max 30Hz)
- Batch rapid ops into single messages
- Cap message sizes (e.g., 1MB)
- Bounded outbound channels per connection

### Database Growth

**Risk:** Ops table grows unbounded

**Mitigation:**
- Create snapshots every 100 ops
- Option to prune ops before oldest snapshot
- Partition ops table by time (if needed at scale)

### Auth Across Domains

**Risk:** Cookie-based auth fails with separate domains

**Mitigation:**
- Plan for custom domain with shared parent (e.g., `app.maple.dev`, `api.maple.dev`)
- Fallback to token-based WS auth if needed
- Document cookie configuration requirements

---

## Next Steps

1. **Review this plan** - Identify any gaps or concerns
2. **Start Phase 0** - Set up monorepo structure
3. **Iterate** - Each phase builds on the previous

---

*Generated for Maple Code Editor*
*Last Updated: $(date)*

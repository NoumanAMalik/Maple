import type { Actor, Operation, Position, Presence, Selection } from "./operations";

export const PROTOCOL_VERSION = 1;

// Snapshot types
export type SnapshotType = "initial" | "manual" | "auto" | "pre-close";

export interface Snapshot {
    id: string;
    timestamp: string; // ISO 8601 format
    createdBy: string;
    type: SnapshotType;
    message?: string;
    linesAdded: number;
    linesRemoved: number;
    content?: string; // Only included when explicitly requested
}

export interface HelloMessage {
    v: 1;
    t: "hello";
    docId: string;
    clientId: string;
    resume?: { lastSeenVersion: number };
}

export interface OpMessage {
    v: 1;
    t: "op";
    opId: string;
    baseVersion: number;
    ops: Operation[];
    presence?: Presence;
}

export interface PresenceMessage {
    v: 1;
    t: "presence";
    cursor: Position;
    selection?: Selection;
    displayName?: string;
}

// Snapshot client messages
export interface SaveMessage {
    v: 1;
    t: "save";
    content: string;
    message?: string;
}

export interface RestoreMessage {
    v: 1;
    t: "restore";
    snapshotId: string;
}

export interface GetSnapshotsMessage {
    v: 1;
    t: "get_snapshots";
}

export type ClientMessage =
    | HelloMessage
    | OpMessage
    | PresenceMessage
    | SaveMessage
    | RestoreMessage
    | GetSnapshotsMessage;

export interface WelcomeMessage {
    v: 1;
    t: "welcome";
    docId: string;
    serverVersion: number;
    snapshot: string;
    presence: Array<{ actor: Actor; presence: Presence }>;
    snapshots: Snapshot[];
    isOwner: boolean;
}

export interface AckMessage {
    v: 1;
    t: "ack";
    opId: string;
    newVersion: number;
}

export interface RemoteOpMessage {
    v: 1;
    t: "remote_op";
    version: number;
    actor: Actor;
    ops: Operation[];
}

export interface PresenceUpdateMessage {
    v: 1;
    t: "presence_update";
    actor: Actor;
    cursor: Position;
    selection?: Selection;
}

export interface ErrorMessage {
    v: 1;
    t: "error";
    code: string;
    message: string;
}

export interface ResyncRequiredMessage {
    v: 1;
    t: "resync_required";
}

export interface UserJoinedMessage {
    v: 1;
    t: "user_joined";
    actor: Actor;
}

export interface UserLeftMessage {
    v: 1;
    t: "user_left";
    clientId: string;
}

// Snapshot server messages
export interface SnapshotCreatedMessage {
    v: 1;
    t: "snapshot_created";
    snapshot: Snapshot;
}

export interface SnapshotsListMessage {
    v: 1;
    t: "snapshots_list";
    snapshots: Snapshot[];
}

export interface SnapshotRestoredMessage {
    v: 1;
    t: "snapshot_restored";
    content: string;
    snapshotId: string;
    version: number;
}

export type ServerMessage =
    | WelcomeMessage
    | AckMessage
    | RemoteOpMessage
    | PresenceUpdateMessage
    | ErrorMessage
    | ResyncRequiredMessage
    | UserJoinedMessage
    | UserLeftMessage
    | SnapshotCreatedMessage
    | SnapshotsListMessage
    | SnapshotRestoredMessage;

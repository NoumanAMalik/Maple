import type { Actor, Operation, Position, Presence, Selection } from "./operations";

export const PROTOCOL_VERSION = 1;

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
}

export type ClientMessage = HelloMessage | OpMessage | PresenceMessage;

export interface WelcomeMessage {
    v: 1;
    t: "welcome";
    docId: string;
    serverVersion: number;
    snapshot: string;
    presence: Array<{ actor: Actor; presence: Presence }>;
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

export type ServerMessage =
    | WelcomeMessage
    | AckMessage
    | RemoteOpMessage
    | PresenceUpdateMessage
    | ErrorMessage
    | ResyncRequiredMessage
    | UserJoinedMessage
    | UserLeftMessage;

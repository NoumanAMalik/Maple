import type {
    Actor,
    Position,
    Selection,
    Presence,
    ClientMessage,
    ServerMessage,
    HelloMessage,
    PresenceMessage,
    OpMessage,
    Operation,
} from "@maple/protocol";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface PresenceInfo {
    actor: Actor;
    presence: Presence;
}

function generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export class CollabClient {
    private ws: WebSocket | null = null;
    private clientId: string;
    private displayName: string | null = null;
    private roomId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private pendingOps: Array<{ opId: string; ops: Operation[]; baseVersion: number }> = [];
    private localVersion = 0;

    onWelcome: ((snapshot: string, version: number, presence: PresenceInfo[]) => void) | null = null;
    onUserJoined: ((actor: Actor) => void) | null = null;
    onUserLeft: ((clientId: string) => void) | null = null;
    onPresenceUpdate: ((actor: Actor, cursor: Position, selection?: Selection) => void) | null = null;
    onRemoteOperations: ((ops: Operation[], actor: Actor, version: number) => void) | null = null;
    onConnectionChange: ((status: ConnectionStatus) => void) | null = null;
    onError: ((error: { code: string; message: string }) => void) | null = null;

    constructor() {
        this.clientId = generateClientId();
    }

    getClientId(): string {
        return this.clientId;
    }

    getDisplayName(): string | null {
        return this.displayName;
    }

    setDisplayName(name: string): void {
        this.displayName = name;
    }

    getRoomId(): string | null {
        return this.roomId;
    }

    connect(roomId: string): void {
        if (this.ws) {
            this.disconnect();
        }

        this.roomId = roomId;
        this.reconnectAttempts = 0;
        this.pendingOps = [];
        this.localVersion = 0;
        this.establishConnection();
    }

    private establishConnection(): void {
        const wsUrl = process.env.NEXT_PUBLIC_COLLAB_URL;
        if (!wsUrl) {
            this.onError?.({ code: "CONFIG_ERROR", message: "NEXT_PUBLIC_COLLAB_URL is not configured" });
            return;
        }

        this.onConnectionChange?.("connecting");

        const wsProtocol = wsUrl.startsWith("https") ? "wss" : "ws";
        const baseUrl = wsUrl.replace(/^https?/, wsProtocol);
        const url = `${baseUrl}/v1/rooms/${this.roomId}/ws`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.sendHello();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as ServerMessage;
                this.handleMessage(message);
            } catch (error) {
                console.error("[CollabClient] Failed to parse message:", error);
            }
        };

        this.ws.onclose = (event) => {
            this.onConnectionChange?.("disconnected");

            if (!event.wasClean && this.roomId && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = () => {
            this.onError?.({ code: "CONNECTION_ERROR", message: "WebSocket connection failed" });
        };
    }

    private scheduleReconnect(): void {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
            if (this.roomId) {
                this.establishConnection();
            }
        }, delay);
    }

    private sendHello(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.roomId) return;

        const hello: HelloMessage = {
            v: 1,
            t: "hello",
            docId: this.roomId,
            clientId: this.clientId,
        };

        this.send(hello);
    }

    private handleMessage(message: ServerMessage): void {
        switch (message.t) {
            case "welcome":
                this.onConnectionChange?.("connected");
                this.localVersion = message.serverVersion;
                this.pendingOps = [];
                this.onWelcome?.(message.snapshot, message.serverVersion, message.presence);
                break;

            case "user_joined":
                this.onUserJoined?.(message.actor);
                break;

            case "user_left":
                this.onUserLeft?.(message.clientId);
                break;

            case "presence_update":
                this.onPresenceUpdate?.(message.actor, message.cursor, message.selection);
                break;

            case "error":
                this.onError?.({ code: message.code, message: message.message });
                break;

            case "resync_required":
                this.pendingOps = [];
                if (this.roomId) {
                    this.sendHello();
                }
                break;

            case "ack":
                this.handleAck(message.opId, message.newVersion);
                break;
            case "remote_op":
                this.handleRemoteOp(message);
                break;
        }
    }

    private send(message: ClientMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.close(1000, "Client disconnected");
            this.ws = null;
        }

        this.roomId = null;
        this.pendingOps = [];
        this.localVersion = 0;
        this.onConnectionChange?.("disconnected");
    }

    sendPresence(cursor: Position, selection?: Selection): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const presence: PresenceMessage = {
            v: 1,
            t: "presence",
            cursor,
            selection,
            displayName: this.displayName ?? undefined,
        };

        this.send(presence);
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    sendOperations(ops: Operation[], presence?: Presence): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        if (ops.length === 0) return;

        const opId = generateOpId();
        const baseVersion = this.localVersion + this.pendingOps.length;
        const message: OpMessage = {
            v: 1,
            t: "op",
            opId,
            baseVersion,
            ops,
            presence,
        };

        this.pendingOps.push({ opId, ops, baseVersion });
        this.send(message);
    }

    private handleAck(opId: string, newVersion: number): void {
        this.pendingOps = this.pendingOps.filter((op) => op.opId !== opId);
        this.localVersion = Math.max(this.localVersion, newVersion);
    }

    private handleRemoteOp(message: { version: number; actor: Actor; ops: Operation[] }): void {
        const transformed = transformIncomingOps(message.ops, this.pendingOps, message.actor.clientId, this.clientId);
        this.localVersion = Math.max(this.localVersion, message.version);
        this.onRemoteOperations?.(transformed, message.actor, message.version);
    }
}

function generateOpId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function isNoop(op: Operation): boolean {
    if (op.type === "insert") {
        return op.text.length === 0;
    }
    return op.len <= 0;
}

function compareClientIds(a: string, b: string): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

function transformIncomingOps(
    ops: Operation[],
    pending: Array<{ ops: Operation[] }>,
    remoteClientId: string,
    localClientId: string,
): Operation[] {
    const transformed = ops.map((op) => ({ ...op }));

    for (const pendingEntry of pending) {
        for (let index = 0; index < transformed.length; index += 1) {
            let incoming = transformed[index];
            for (const localOp of pendingEntry.ops) {
                incoming = transformOperation(incoming, localOp, remoteClientId, localClientId);
            }
            transformed[index] = incoming;
        }
    }

    return transformed.filter((op) => !isNoop(op));
}

function transformOperation(op: Operation, other: Operation, opClientId: string, otherClientId: string): Operation {
    if (isNoop(op)) {
        return op;
    }

    if (op.type === "insert") {
        if (other.type === "insert") {
            if (op.pos > other.pos || (op.pos === other.pos && compareClientIds(opClientId, otherClientId) > 0)) {
                op.pos += other.text.length;
            }
        } else {
            const otherEnd = other.pos + other.len;
            if (op.pos > otherEnd) {
                op.pos -= other.len;
            } else if (op.pos > other.pos) {
                op.pos = other.pos;
            }
        }
        return op;
    }

    if (other.type === "insert") {
        if (op.pos >= other.pos) {
            op.pos += other.text.length;
        } else if (op.pos + op.len > other.pos) {
            op.len += other.text.length;
        }
        return op;
    }

    const otherEnd = other.pos + other.len;
    const opEnd = op.pos + op.len;

    if (op.pos >= otherEnd) {
        op.pos -= other.len;
        return op;
    }

    if (opEnd <= other.pos) {
        return op;
    }

    const overlapStart = Math.max(op.pos, other.pos);
    const overlapEnd = Math.min(opEnd, otherEnd);
    const overlapLen = overlapEnd - overlapStart;

    op.len -= overlapLen;
    if (other.pos < op.pos) {
        op.pos = other.pos;
    }

    return op;
}

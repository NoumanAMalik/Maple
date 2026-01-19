import type {
    Actor,
    Position,
    Selection,
    Presence,
    ClientMessage,
    ServerMessage,
    HelloMessage,
    PresenceMessage,
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
    private roomId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    onWelcome: ((snapshot: string, version: number, presence: PresenceInfo[]) => void) | null = null;
    onUserJoined: ((actor: Actor) => void) | null = null;
    onUserLeft: ((clientId: string) => void) | null = null;
    onPresenceUpdate: ((actor: Actor, cursor: Position, selection?: Selection) => void) | null = null;
    onConnectionChange: ((status: ConnectionStatus) => void) | null = null;
    onError: ((error: { code: string; message: string }) => void) | null = null;

    constructor() {
        this.clientId = generateClientId();
    }

    getClientId(): string {
        return this.clientId;
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
        this.establishConnection();
    }

    private establishConnection(): void {
        const wsUrl = process.env.NEXT_PUBLIC_COLLAB_URL;
        if (!wsUrl) {
            this.onError?.({ code: "CONFIG_ERROR", message: "NEXT_PUBLIC_COLLAB_URL is not configured" });
            return;
        }

        this.onConnectionChange?.("connecting");

        const url = `${wsUrl}/ws/${this.roomId}`;
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
                if (this.roomId) {
                    this.sendHello();
                }
                break;

            case "ack":
            case "remote_op":
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
        this.onConnectionChange?.("disconnected");
    }

    sendPresence(cursor: Position, selection?: Selection): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const presence: PresenceMessage = {
            v: 1,
            t: "presence",
            cursor,
            selection,
        };

        this.send(presence);
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

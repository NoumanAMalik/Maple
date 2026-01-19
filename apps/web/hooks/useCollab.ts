"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CollabClient, type ConnectionStatus } from "@/lib/collab/client";
import type { Actor, Position, Selection, CreateRoomResponse } from "@maple/protocol";

export type { ConnectionStatus };

const COLLABORATOR_COLORS = [
    "#11b7d4", // cyan
    "#c62f52", // pink
    "#38c7bd", // teal
    "#00a884", // green
    "#d46ec0", // magenta
    "#a85ff1", // purple
    "#d4770c", // orange
];

export interface Collaborator {
    clientId: string;
    displayName: string;
    color: string;
    cursor: Position;
    selection?: Selection;
}

export interface UseCollabResult {
    isSharing: boolean;
    shareUrl: string | null;
    collaborators: Collaborator[];
    connectionStatus: ConnectionStatus;
    startSharing: (content: string, language?: string) => Promise<void>;
    stopSharing: () => void;
    updatePresence: (cursor: Position, selection?: Selection) => void;
}

export function useCollab(): UseCollabResult {
    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [roomId, setRoomId] = useState<string | null>(null);

    const clientRef = useRef<CollabClient | null>(null);
    const colorIndexRef = useRef(0);

    const getNextColor = useCallback(() => {
        const color = COLLABORATOR_COLORS[colorIndexRef.current % COLLABORATOR_COLORS.length];
        colorIndexRef.current++;
        return color;
    }, []);

    useEffect(() => {
        const client = new CollabClient();
        clientRef.current = client;

        client.onConnectionChange = (status) => {
            setConnectionStatus(status);
        };

        client.onWelcome = (_snapshot, _version, presence) => {
            const existingCollaborators = presence
                .filter((p) => p.actor.clientId !== client.getClientId())
                .map((p) => ({
                    clientId: p.actor.clientId,
                    displayName: p.actor.displayName || `User ${p.actor.clientId.slice(-4)}`,
                    color: p.actor.color || getNextColor(),
                    cursor: p.presence.cursor,
                    selection: p.presence.selection,
                }));
            setCollaborators(existingCollaborators);
        };

        client.onUserJoined = (actor: Actor) => {
            if (actor.clientId === client.getClientId()) return;

            setCollaborators((prev) => {
                if (prev.some((c) => c.clientId === actor.clientId)) {
                    return prev;
                }
                return [
                    ...prev,
                    {
                        clientId: actor.clientId,
                        displayName: actor.displayName || `User ${actor.clientId.slice(-4)}`,
                        color: actor.color || getNextColor(),
                        cursor: { line: 1, column: 1 },
                    },
                ];
            });
        };

        client.onUserLeft = (clientId: string) => {
            setCollaborators((prev) => prev.filter((c) => c.clientId !== clientId));
        };

        client.onPresenceUpdate = (actor: Actor, cursor: Position, selection?: Selection) => {
            if (actor.clientId === client.getClientId()) return;

            setCollaborators((prev) => {
                const existing = prev.find((c) => c.clientId === actor.clientId);
                if (existing) {
                    return prev.map((c) =>
                        c.clientId === actor.clientId
                            ? { ...c, cursor, selection, displayName: actor.displayName || c.displayName }
                            : c,
                    );
                }
                return [
                    ...prev,
                    {
                        clientId: actor.clientId,
                        displayName: actor.displayName || `User ${actor.clientId.slice(-4)}`,
                        color: actor.color || getNextColor(),
                        cursor,
                        selection,
                    },
                ];
            });
        };

        client.onError = (error) => {
            console.error("[useCollab] Error:", error);
        };

        return () => {
            client.disconnect();
        };
    }, [getNextColor]);

    const startSharing = useCallback(async (content: string, language?: string) => {
        const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL;
        if (!collabUrl) {
            throw new Error("NEXT_PUBLIC_COLLAB_URL is not configured");
        }

        const response = await fetch(`${collabUrl}/v1/rooms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, language }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create room");
        }

        const data: CreateRoomResponse = await response.json();
        setRoomId(data.roomId);
        setShareUrl(data.shareUrl);
        setIsSharing(true);

        clientRef.current?.connect(data.roomId);
    }, []);

    const stopSharing = useCallback(async () => {
        if (roomId) {
            const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL;
            if (collabUrl) {
                try {
                    await fetch(`${collabUrl}/v1/rooms/${roomId}`, { method: "DELETE" });
                } catch (error) {
                    console.error("[useCollab] Failed to delete room:", error);
                }
            }
        }

        clientRef.current?.disconnect();
        setIsSharing(false);
        setShareUrl(null);
        setRoomId(null);
        setCollaborators([]);
        colorIndexRef.current = 0;
    }, [roomId]);

    const updatePresence = useCallback((cursor: Position, selection?: Selection) => {
        clientRef.current?.sendPresence(cursor, selection);
    }, []);

    return {
        isSharing,
        shareUrl,
        collaborators,
        connectionStatus,
        startSharing,
        stopSharing,
        updatePresence,
    };
}

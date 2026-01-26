"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CollabClient, type ConnectionStatus } from "@/lib/collab/client";
import type { Actor, Position, Selection, CreateRoomResponse, Operation } from "@maple/protocol";

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

export interface ChangeEvent {
    id: string;
    actor: Actor;
    summary: string;
    timestamp: number;
    isLocal: boolean;
    /** Number of characters inserted */
    insertions: number;
    /** Number of characters deleted */
    deletions: number;
    /** Number of operations batched into this event */
    batchCount: number;
}

export interface RemoteOpsEvent {
    id: string;
    ops: Operation[];
    actor: Actor;
    version: number;
}

export interface UseCollabResult {
    isSharing: boolean;
    shareUrl: string | null;
    collaborators: Collaborator[];
    connectionStatus: ConnectionStatus;
    roomId: string | null;
    isJoiner: boolean;
    displayName: string;
    recentChanges: ChangeEvent[];
    remoteOpsEvent: RemoteOpsEvent | null;
    startSharing: (content: string, language?: string) => Promise<void>;
    stopSharing: () => void;
    joinRoom: (roomId: string) => Promise<{ snapshot: string; version: number }>;
    leaveRoom: () => void;
    updatePresence: (cursor: Position, selection?: Selection) => void;
    sendOperations: (ops: Operation[]) => void;
    setDisplayName: (name: string) => void;
}

const MAX_CHANGE_EVENTS = 20;
/** Time window in ms to batch changes from same user */
const BATCH_WINDOW_MS = 2000;

interface OpStats {
    insertions: number;
    deletions: number;
}

function getOpStats(ops: Operation[]): OpStats {
    let insertions = 0;
    let deletions = 0;

    for (const op of ops) {
        if (op.type === "insert") {
            insertions += op.text.length;
        } else {
            deletions += op.len;
        }
    }

    return { insertions, deletions };
}

function formatDiffSummary(insertions: number, deletions: number): string {
    if (insertions === 0 && deletions === 0) {
        return "made changes";
    }

    const parts: string[] = [];
    if (insertions > 0) {
        parts.push(`+${insertions}`);
    }
    if (deletions > 0) {
        parts.push(`-${deletions}`);
    }

    return parts.join(" ");
}

export function useCollab(): UseCollabResult {
    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isJoiner, setIsJoiner] = useState(false);
    const [displayName, setDisplayNameState] = useState("You");
    const [recentChanges, setRecentChanges] = useState<ChangeEvent[]>([]);
    const [remoteOpsEvent, setRemoteOpsEvent] = useState<RemoteOpsEvent | null>(null);

    const clientRef = useRef<CollabClient | null>(null);
    const colorIndexRef = useRef(0);
    const lastPresenceRef = useRef<{ cursor: Position; selection?: Selection } | null>(null);
    const pendingJoinRef = useRef<{
        resolve: (value: { snapshot: string; version: number }) => void;
        reject: (reason: Error) => void;
    } | null>(null);

    const getNextColor = useCallback(() => {
        const color = COLLABORATOR_COLORS[colorIndexRef.current % COLLABORATOR_COLORS.length];
        colorIndexRef.current++;
        return color;
    }, []);

    const pushChangeEvent = useCallback((actor: Actor, ops: Operation[], isLocal: boolean) => {
        const stats = getOpStats(ops);
        const now = Date.now();

        setRecentChanges((prev) => {
            // Check if we can batch with a recent change from the same user
            const recentIndex = prev.findIndex(
                (change) => change.actor.clientId === actor.clientId && now - change.timestamp < BATCH_WINDOW_MS,
            );

            if (recentIndex !== -1) {
                // Merge with existing change
                const existing = prev[recentIndex];
                const newInsertions = existing.insertions + stats.insertions;
                const newDeletions = existing.deletions + stats.deletions;

                const updated: ChangeEvent = {
                    ...existing,
                    summary: formatDiffSummary(newInsertions, newDeletions),
                    timestamp: now, // Update timestamp to latest
                    insertions: newInsertions,
                    deletions: newDeletions,
                    batchCount: existing.batchCount + 1,
                    // Update actor info in case display name changed
                    actor: { ...actor },
                };

                // Move to top of list
                const newList = [...prev];
                newList.splice(recentIndex, 1);
                return [updated, ...newList].slice(0, MAX_CHANGE_EVENTS);
            }

            // Create new entry
            const entry: ChangeEvent = {
                id: `change_${now}_${Math.random().toString(36).substring(2, 7)}`,
                actor,
                summary: formatDiffSummary(stats.insertions, stats.deletions),
                timestamp: now,
                isLocal,
                insertions: stats.insertions,
                deletions: stats.deletions,
                batchCount: 1,
            };

            return [entry, ...prev].slice(0, MAX_CHANGE_EVENTS);
        });
    }, []);

    useEffect(() => {
        const client = new CollabClient();
        clientRef.current = client;

        client.onConnectionChange = (status) => {
            setConnectionStatus(status);
        };

        client.onWelcome = (snapshot, version, presence) => {
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

            client.sendPresence({ line: 1, column: 1 });

            if (pendingJoinRef.current) {
                pendingJoinRef.current.resolve({ snapshot, version });
                pendingJoinRef.current = null;
            }
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

        client.onRemoteOperations = (ops, actor, version) => {
            if (ops.length === 0) return;
            setRemoteOpsEvent({
                id: `remote_${version}_${Date.now()}`,
                ops,
                actor,
                version,
            });
            pushChangeEvent(actor, ops, false);
        };

        client.onError = (error) => {
            console.error("[useCollab] Error:", error);
            if (pendingJoinRef.current) {
                pendingJoinRef.current.reject(new Error(error.message));
                pendingJoinRef.current = null;
            }
        };

        return () => {
            client.disconnect();
        };
    }, [getNextColor, pushChangeEvent]);

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
        setIsJoiner(false);
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        setShareUrl(`${baseUrl}/editor?room=${data.roomId}`);
        setIsSharing(true);

        clientRef.current?.connect(data.roomId);
    }, []);

    const joinRoom = useCallback((targetRoomId: string): Promise<{ snapshot: string; version: number }> => {
        return new Promise((resolve, reject) => {
            setRoomId(targetRoomId);
            setIsJoiner(true);
            setIsSharing(true);
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
            setShareUrl(`${baseUrl}/editor?room=${targetRoomId}`);

            pendingJoinRef.current = { resolve, reject };

            const timeout = setTimeout(() => {
                if (pendingJoinRef.current) {
                    pendingJoinRef.current.reject(new Error("Join room timeout"));
                    pendingJoinRef.current = null;
                }
            }, 10000);

            const originalResolve = pendingJoinRef.current.resolve;
            pendingJoinRef.current.resolve = (value) => {
                clearTimeout(timeout);
                originalResolve(value);
            };

            const originalReject = pendingJoinRef.current.reject;
            pendingJoinRef.current.reject = (reason) => {
                clearTimeout(timeout);
                originalReject(reason);
            };

            clientRef.current?.connect(targetRoomId);
        });
    }, []);

    const leaveRoom = useCallback(() => {
        clientRef.current?.disconnect();
        setIsSharing(false);
        setShareUrl(null);
        setRoomId(null);
        setIsJoiner(false);
        setCollaborators([]);
        setRecentChanges([]);
        setRemoteOpsEvent(null);
        colorIndexRef.current = 0;
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
        setIsJoiner(false);
        setCollaborators([]);
        setRecentChanges([]);
        setRemoteOpsEvent(null);
        colorIndexRef.current = 0;
    }, [roomId]);

    const updatePresence = useCallback((cursor: Position, selection?: Selection) => {
        lastPresenceRef.current = { cursor, selection };
        clientRef.current?.sendPresence(cursor, selection);
    }, []);

    const sendOperations = useCallback(
        (ops: Operation[]) => {
            if (ops.length === 0) return;
            clientRef.current?.sendOperations(ops);

            const selfActor: Actor = {
                clientId: clientRef.current?.getClientId() ?? "local",
                displayName,
                color: "var(--ui-accent)",
            };
            pushChangeEvent(selfActor, ops, true);
        },
        [displayName, pushChangeEvent],
    );

    const setDisplayName = useCallback((name: string) => {
        setDisplayNameState(name);
        clientRef.current?.setDisplayName(name);

        const lastPresence = lastPresenceRef.current;
        if (lastPresence) {
            clientRef.current?.sendPresence(lastPresence.cursor, lastPresence.selection);
        }
    }, []);

    return {
        isSharing,
        shareUrl,
        collaborators,
        connectionStatus,
        roomId,
        isJoiner,
        displayName,
        recentChanges,
        remoteOpsEvent,
        startSharing,
        stopSharing,
        joinRoom,
        leaveRoom,
        updatePresence,
        sendOperations,
        setDisplayName,
    };
}

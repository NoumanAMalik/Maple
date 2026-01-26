"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { Copy, Check, Square, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Collaborator, ConnectionStatus, ChangeEvent } from "@/hooks/useCollab";

interface ShareSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isSharing: boolean;
    isJoiner: boolean;
    shareUrl: string | null;
    collaborators: Collaborator[];
    connectionStatus: ConnectionStatus;
    displayName: string;
    recentChanges: ChangeEvent[];
    onStartSharing: () => void;
    onStopSharing: () => void;
    onLeaveRoom: () => void;
    onDisplayNameChange: (name: string) => void;
}

function formatTimeAgo(timestamp: number): string {
    const delta = Date.now() - timestamp;
    if (delta < 10000) return "just now";
    if (delta < 60000) return `${Math.floor(delta / 1000)}s ago`;
    if (delta < 60 * 60000) return `${Math.floor(delta / 60000)}m ago`;
    return `${Math.floor(delta / 3600000)}h ago`;
}

export const ShareSidebar = memo(function ShareSidebar({
    isOpen,
    onClose,
    isSharing,
    isJoiner,
    shareUrl,
    collaborators,
    connectionStatus,
    displayName,
    recentChanges,
    onStartSharing,
    onStopSharing,
    onLeaveRoom,
    onDisplayNameChange,
}: ShareSidebarProps) {
    const [copied, setCopied] = useState(false);
    const [localDisplayName, setLocalDisplayName] = useState(displayName);
    const nameUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLocalDisplayName(displayName);
    }, [displayName]);

    const handleDisplayNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newName = e.target.value;
            setLocalDisplayName(newName);

            if (nameUpdateTimeoutRef.current) {
                clearTimeout(nameUpdateTimeoutRef.current);
            }
            nameUpdateTimeoutRef.current = setTimeout(() => {
                if (newName.trim()) {
                    onDisplayNameChange(newName.trim());
                }
            }, 300);
        },
        [onDisplayNameChange],
    );

    const handleCopy = useCallback(async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    }, [shareUrl]);

    if (!isOpen) return null;

    const statusText =
        connectionStatus === "connected" ? "Live" : connectionStatus === "connecting" ? "Connecting..." : "Offline";

    return (
        <div className="flex h-full w-full flex-col">
            <div className="border-b border-[var(--ui-border)] px-3 py-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                        Share
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--editor-line-number)] transition-colors hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)]"
                        aria-label="Close share panel"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {isSharing && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--editor-line-number)]">
                        <span
                            className={cn(
                                "h-2 w-2 rounded-full",
                                connectionStatus === "connected"
                                    ? "bg-[var(--level-success)]"
                                    : connectionStatus === "connecting"
                                      ? "bg-[var(--level-warning)] animate-pulse"
                                      : "bg-[var(--level-danger)]",
                            )}
                        />
                        <span>{statusText}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-3">
                {isSharing ? (
                    <>
                        {shareUrl && (
                            <div className="space-y-2">
                                <label htmlFor="share-url" className="text-xs text-[var(--editor-line-number)]">
                                    Share link
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="share-url"
                                        type="text"
                                        readOnly
                                        value={shareUrl}
                                        className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--editor-fg)] outline-none focus:border-[var(--ui-accent)]"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded border border-[var(--ui-border)] transition-colors",
                                            copied
                                                ? "bg-[var(--level-success)]/10 border-[var(--level-success)]/40"
                                                : "bg-[var(--ui-tab-bg)] hover:bg-[var(--ui-hover)]",
                                        )}
                                        aria-label={copied ? "Copied" : "Copy link"}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-[var(--level-success)]" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-[var(--editor-fg)]" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {isJoiner && (
                            <div className="space-y-2">
                                <label htmlFor="display-name" className="text-xs text-[var(--editor-line-number)]">
                                    Your display name
                                </label>
                                <input
                                    id="display-name"
                                    type="text"
                                    value={localDisplayName}
                                    onChange={handleDisplayNameChange}
                                    placeholder="Enter your name"
                                    className="w-full rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2.5 py-1.5 text-sm text-[var(--editor-fg)] outline-none focus:border-[var(--ui-accent)]"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--editor-line-number)]">Collaborators</span>
                                <span className="text-xs text-[var(--editor-line-number)]">
                                    {collaborators.length + 1} {collaborators.length === 0 ? "person" : "people"}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1">
                                    <span className="h-2 w-2 rounded-full bg-[var(--ui-accent)]" />
                                    <span className="text-xs text-[var(--editor-fg)]">
                                        {isJoiner ? localDisplayName || "You" : "You"}
                                    </span>
                                </div>
                                {collaborators.map((collab) => (
                                    <div
                                        key={collab.clientId}
                                        className="flex items-center gap-2 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1"
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: collab.color }}
                                        />
                                        <span className="text-xs text-[var(--editor-fg)]">{collab.displayName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--editor-line-number)]">Recent changes</span>
                                <span className="text-xs text-[var(--editor-line-number)]">{recentChanges.length}</span>
                            </div>
                            {recentChanges.length === 0 ? (
                                <div className="rounded border border-dashed border-[var(--ui-border)] px-2 py-3 text-xs text-[var(--editor-line-number)]">
                                    No changes yet.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {recentChanges.map((change) => (
                                        <div
                                            key={change.id}
                                            className="flex items-start justify-between gap-2 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1.5"
                                        >
                                            <div className="flex items-start gap-2">
                                                <span
                                                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                                    style={{ backgroundColor: change.actor.color }}
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-xs text-[var(--editor-fg)]">
                                                        {change.actor.displayName ?? "Anonymous"}
                                                        {change.isLocal ? " (you)" : ""}
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-1.5">
                                                        {change.insertions > 0 && (
                                                            <span className="font-mono text-[11px] text-[var(--level-success)]">
                                                                +{change.insertions}
                                                            </span>
                                                        )}
                                                        {change.deletions > 0 && (
                                                            <span className="font-mono text-[11px] text-[var(--level-danger)]">
                                                                -{change.deletions}
                                                            </span>
                                                        )}
                                                        {change.insertions === 0 && change.deletions === 0 && (
                                                            <span className="text-[11px] text-[var(--editor-line-number)]">
                                                                made changes
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="shrink-0 whitespace-nowrap text-[11px] text-[var(--editor-line-number)]">
                                                {formatTimeAgo(change.timestamp)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isJoiner ? (
                            <button
                                type="button"
                                onClick={onLeaveRoom}
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--ui-border)] bg-transparent px-4 py-2 text-sm text-[var(--editor-fg)] transition-colors hover:bg-[var(--ui-hover)]"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                Leave Room
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onStopSharing}
                                className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--level-danger)]/60 bg-transparent px-4 py-2 text-sm text-[var(--level-danger)] transition-colors hover:bg-[var(--level-danger)]/10"
                            >
                                <Square className="h-3.5 w-3.5" />
                                Stop Sharing
                            </button>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-[var(--editor-line-number)]">
                            Share this document to collaborate with others in real-time.
                        </p>
                        <button
                            type="button"
                            onClick={onStartSharing}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--ui-accent)] bg-[var(--ui-accent)] px-4 py-2 text-sm text-[var(--editor-bg)] transition-colors hover:bg-[var(--ui-accent-hover)]"
                        >
                            Start Sharing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

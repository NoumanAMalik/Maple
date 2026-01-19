"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import { Copy, Check, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Collaborator, ConnectionStatus } from "@/hooks/useCollab";

interface SharePopoverProps {
    isOpen: boolean;
    onClose: () => void;
    isSharing: boolean;
    shareUrl: string | null;
    collaborators: Collaborator[];
    connectionStatus: ConnectionStatus;
    onStartSharing: () => void;
    onStopSharing: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

export const SharePopover = memo(function SharePopover({
    isOpen,
    onClose,
    isSharing,
    shareUrl,
    collaborators,
    connectionStatus,
    onStartSharing,
    onStopSharing,
    anchorRef,
}: SharePopoverProps) {
    const [copied, setCopied] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

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

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 150);
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                popoverRef.current &&
                !popoverRef.current.contains(target) &&
                anchorRef.current &&
                !anchorRef.current.contains(target)
            ) {
                handleClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, handleClose, anchorRef]);

    if (!isOpen && !isClosing) return null;

    const statusText =
        connectionStatus === "connected" ? "Live" : connectionStatus === "connecting" ? "Connecting..." : "Offline";

    return (
        <div
            ref={popoverRef}
            className={cn(
                "absolute right-0 top-full z-50 mt-2 w-[360px] rounded-lg border border-[var(--ui-border)] bg-[var(--ui-tab-bg)] shadow-xl",
                isClosing ? "animate-slideOutToTopRight" : "animate-slideInFromTopRight",
            )}
            role="dialog"
            aria-labelledby="share-popover-title"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-4 py-3">
                <h3 id="share-popover-title" className="text-sm font-medium text-[var(--editor-fg)]">
                    Sharing
                </h3>
                {isSharing && (
                    <span className="flex items-center gap-1.5 text-xs">
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
                        <span className="text-[var(--editor-line-number)]">{statusText}</span>
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {isSharing && shareUrl ? (
                    <div className="space-y-4">
                        {/* Share Link */}
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

                        {/* Collaborators */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--editor-line-number)]">Collaborators</span>
                                <span className="text-xs text-[var(--editor-line-number)]">
                                    {collaborators.length + 1} {collaborators.length === 0 ? "person" : "people"}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {/* Self indicator */}
                                <div
                                    className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2"
                                    title="You"
                                >
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: "var(--ui-accent)" }}
                                    />
                                    <span className="text-xs text-[var(--editor-fg)]">You</span>
                                </div>
                                {/* Other collaborators */}
                                {collaborators.map((collab) => (
                                    <div
                                        key={collab.clientId}
                                        className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2"
                                        title={collab.displayName}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: collab.color }}
                                        />
                                        <span className="max-w-[80px] truncate text-xs text-[var(--editor-fg)]">
                                            {collab.displayName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stop Sharing Button */}
                        <button
                            type="button"
                            onClick={onStopSharing}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--level-danger)]/60 bg-transparent px-4 py-2 text-sm text-[var(--level-danger)] transition-colors hover:bg-[var(--level-danger)]/10"
                        >
                            <Square className="h-3.5 w-3.5" />
                            Stop Sharing
                        </button>
                    </div>
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

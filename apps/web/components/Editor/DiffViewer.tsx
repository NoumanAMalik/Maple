"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, RotateCcw, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiffResult, DiffLine } from "@maple/protocol";

interface DiffViewerProps {
    baseSnapshotId: string;
    snapshotLabel?: string;
    onRequestDiff: () => Promise<{ result: DiffResult; serverVersion: number; language: string }>;
    onRestore?: () => void;
    isOwner: boolean;
}

interface AlignedRow {
    oldLine: DiffLine | null;
    newLine: DiffLine | null;
}

// Convert hunk lines to aligned rows for split view
function alignHunkLines(lines: DiffLine[]): AlignedRow[] {
    const rows: AlignedRow[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.type === "context") {
            rows.push({ oldLine: line, newLine: line });
            i++;
        } else if (line.type === "remove") {
            // Collect consecutive removes
            const removes: DiffLine[] = [];
            while (i < lines.length && lines[i].type === "remove") {
                removes.push(lines[i]);
                i++;
            }
            // Collect consecutive adds
            const adds: DiffLine[] = [];
            while (i < lines.length && lines[i].type === "add") {
                adds.push(lines[i]);
                i++;
            }
            // Pair them up
            const maxLen = Math.max(removes.length, adds.length);
            for (let j = 0; j < maxLen; j++) {
                rows.push({
                    oldLine: removes[j] || null,
                    newLine: adds[j] || null,
                });
            }
        } else if (line.type === "add") {
            // Standalone add (no matching remove)
            rows.push({ oldLine: null, newLine: line });
            i++;
        }
    }

    return rows;
}

export const DiffViewer = memo(function DiffViewer({
    baseSnapshotId: _baseSnapshotId,
    snapshotLabel,
    onRequestDiff,
    onRestore,
    isOwner,
}: DiffViewerProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
    const [serverVersion, setServerVersion] = useState<number>(0);
    const [currentHunkIndex, setCurrentHunkIndex] = useState(0);

    const leftPaneRef = useRef<HTMLDivElement>(null);
    const rightPaneRef = useRef<HTMLDivElement>(null);
    const hunkRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isSyncingRef = useRef(false);

    // Fetch diff on mount
    const fetchDiff = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { result, serverVersion } = await onRequestDiff();
            setDiffResult(result);
            setServerVersion(serverVersion);
            setCurrentHunkIndex(0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load diff");
        } finally {
            setLoading(false);
        }
    }, [onRequestDiff]);

    useEffect(() => {
        fetchDiff();
    }, [fetchDiff]);

    // Synchronized scrolling
    const handleScroll = useCallback((source: "left" | "right") => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        const sourcePane = source === "left" ? leftPaneRef.current : rightPaneRef.current;
        const targetPane = source === "left" ? rightPaneRef.current : leftPaneRef.current;

        if (sourcePane && targetPane) {
            targetPane.scrollTop = sourcePane.scrollTop;
        }

        requestAnimationFrame(() => {
            isSyncingRef.current = false;
        });
    }, []);

    // Navigate to hunk
    const goToHunk = useCallback((index: number) => {
        if (!diffResult || index < 0 || index >= diffResult.hunks.length) return;
        setCurrentHunkIndex(index);
        hunkRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [diffResult]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[var(--editor-bg)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--editor-line-number)]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--editor-bg)]">
                <p className="text-sm text-[var(--level-danger)]">{error}</p>
                <button
                    onClick={fetchDiff}
                    className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-[var(--editor-fg)] hover:bg-[var(--ui-hover)]"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </button>
            </div>
        );
    }

    if (!diffResult) return null;

    const { hunks, linesAdded, linesRemoved } = diffResult;
    const hasChanges = hunks.length > 0;

    return (
        <div className="flex h-full flex-col bg-[var(--editor-bg)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--editor-fg)]">
                        {snapshotLabel || "Snapshot"} → Current
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                        {linesAdded > 0 && (
                            <span className="text-[var(--level-success)]">+{linesAdded}</span>
                        )}
                        {linesRemoved > 0 && (
                            <span className="text-[var(--level-danger)]">-{linesRemoved}</span>
                        )}
                    </div>
                    <span className="text-xs text-[var(--editor-line-number)]">
                        v{serverVersion}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <>
                            <button
                                onClick={() => goToHunk(currentHunkIndex - 1)}
                                disabled={currentHunkIndex === 0}
                                className="flex h-7 w-7 items-center justify-center rounded text-[var(--editor-fg)] hover:bg-[var(--ui-hover)] disabled:opacity-30"
                                title="Previous change"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-[var(--editor-line-number)]">
                                {currentHunkIndex + 1} / {hunks.length}
                            </span>
                            <button
                                onClick={() => goToHunk(currentHunkIndex + 1)}
                                disabled={currentHunkIndex === hunks.length - 1}
                                className="flex h-7 w-7 items-center justify-center rounded text-[var(--editor-fg)] hover:bg-[var(--ui-hover)] disabled:opacity-30"
                                title="Next change"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={fetchDiff}
                        className="flex h-7 w-7 items-center justify-center rounded text-[var(--editor-fg)] hover:bg-[var(--ui-hover)]"
                        title="Refresh diff"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    {isOwner && onRestore && (
                        <button
                            onClick={onRestore}
                            className="flex items-center gap-1.5 rounded bg-[var(--ui-accent)] px-2.5 py-1 text-xs text-[var(--editor-bg)] hover:bg-[var(--ui-accent-hover)]"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                        </button>
                    )}
                </div>
            </div>

            {/* Split view */}
            {!hasChanges ? (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-[var(--editor-line-number)]">No changes</p>
                </div>
            ) : (
                <div className="flex flex-1 overflow-hidden">
                    {/* Left pane (old) */}
                    <div
                        ref={leftPaneRef}
                        onScroll={() => handleScroll("left")}
                        className="flex-1 overflow-auto border-r border-[var(--ui-border)]"
                    >
                        <div className="min-w-max">
                            {hunks.map((hunk, hunkIdx) => (
                                <div
                                    key={hunkIdx}
                                    ref={(el) => { hunkRefs.current[hunkIdx] = el; }}
                                >
                                    {/* Hunk header */}
                                    <div className="sticky top-0 bg-[var(--ui-sidebar-bg)] px-3 py-1 text-xs text-[var(--editor-line-number)]">
                                        @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
                                    </div>
                                    {alignHunkLines(hunk.lines).map((row, rowIdx) => (
                                        <DiffRowLeft key={rowIdx} line={row.oldLine} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right pane (new) */}
                    <div
                        ref={rightPaneRef}
                        onScroll={() => handleScroll("right")}
                        className="flex-1 overflow-auto"
                    >
                        <div className="min-w-max">
                            {hunks.map((hunk, hunkIdx) => (
                                <div key={hunkIdx}>
                                    {/* Hunk header */}
                                    <div className="sticky top-0 bg-[var(--ui-sidebar-bg)] px-3 py-1 text-xs text-[var(--editor-line-number)]">
                                        @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
                                    </div>
                                    {alignHunkLines(hunk.lines).map((row, rowIdx) => (
                                        <DiffRowRight key={rowIdx} line={row.newLine} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// Left row component (old content)
const DiffRowLeft = memo(function DiffRowLeft({ line }: { line: DiffLine | null }) {
    if (!line) {
        return (
            <div className="flex h-6 bg-[var(--editor-bg)]">
                <div className="w-12 shrink-0" />
                <div className="flex-1" />
            </div>
        );
    }

    const isRemoved = line.type === "remove";
    const isContext = line.type === "context";

    return (
        <div
            className={cn(
                "flex h-6",
                isRemoved && "bg-[var(--level-danger)]/10",
                isContext && "bg-[var(--editor-bg)]"
            )}
        >
            <div className="w-12 shrink-0 select-none pr-2 text-right font-mono text-xs leading-6 text-[var(--editor-line-number)]">
                {line.oldLine}
            </div>
            <pre className="flex-1 overflow-hidden text-ellipsis whitespace-pre px-2 font-mono text-sm leading-6 text-[var(--editor-fg)]">
                {line.content}
            </pre>
        </div>
    );
});

// Right row component (new content)
const DiffRowRight = memo(function DiffRowRight({ line }: { line: DiffLine | null }) {
    if (!line) {
        return (
            <div className="flex h-6 bg-[var(--editor-bg)]">
                <div className="w-12 shrink-0" />
                <div className="flex-1" />
            </div>
        );
    }

    const isAdded = line.type === "add";
    const isContext = line.type === "context";

    return (
        <div
            className={cn(
                "flex h-6",
                isAdded && "bg-[var(--level-success)]/10",
                isContext && "bg-[var(--editor-bg)]"
            )}
        >
            <div className="w-12 shrink-0 select-none pr-2 text-right font-mono text-xs leading-6 text-[var(--editor-line-number)]">
                {line.newLine}
            </div>
            <pre className="flex-1 overflow-hidden text-ellipsis whitespace-pre px-2 font-mono text-sm leading-6 text-[var(--editor-fg)]">
                {line.content}
            </pre>
        </div>
    );
});

"use client";

import { memo } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface JoiningOverlayProps {
    state: "joining" | "error";
    error?: { code?: string; message: string };
    onRetry: () => void;
    onExit: () => void;
}

export const JoiningOverlay = memo(function JoiningOverlay({ state, error, onRetry, onExit }: JoiningOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111418]">
            {state === "joining" ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-[var(--ui-accent)]" />
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-base text-[var(--editor-fg)]">Joining collaborative session...</span>
                        <span className="text-sm text-[var(--editor-line-number)]">Connecting to room</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6">
                    <AlertCircle className="h-12 w-12 text-[var(--level-danger)]" />
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-lg font-medium text-[var(--editor-fg)]">Couldn't join session</span>
                        <span className="max-w-sm text-center font-mono text-sm text-[var(--editor-line-number)]">
                            {error?.message ?? "An unknown error occurred"}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onRetry}
                            className="rounded-md border border-[var(--ui-accent)] bg-transparent px-4 py-2 text-sm text-[var(--ui-accent)] transition-colors hover:bg-[var(--ui-accent)]/10"
                        >
                            Retry
                        </button>
                        <button
                            type="button"
                            onClick={onExit}
                            className="px-4 py-2 text-sm text-[var(--editor-line-number)] transition-colors hover:text-[var(--editor-fg)]"
                        >
                            Back to Editor
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

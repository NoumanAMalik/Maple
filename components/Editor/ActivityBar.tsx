"use client";

import { cn } from "@/lib/utils";

interface ActivityBarProps {
    isExplorerOpen: boolean;
    onToggleExplorer: () => void;
}

export function ActivityBar({ isExplorerOpen, onToggleExplorer }: ActivityBarProps) {
    return (
        <div className="flex h-full w-14 flex-col items-center gap-4 border-l border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] py-4">
            <button
                onClick={onToggleExplorer}
                aria-label="Toggle Explorer"
                aria-pressed={isExplorerOpen}
                className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-md text-[var(--editor-fg)] transition-colors duration-200 hover:bg-[var(--ui-hover)]",
                    isExplorerOpen && "bg-[var(--ui-hover)]",
                )}
            >
                {isExplorerOpen && (
                    <div className="absolute right-0 top-0 h-full w-0.5 rounded-l-sm bg-[var(--ui-accent)]" />
                )}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M3 3h8l2 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                </svg>
            </button>
        </div>
    );
}

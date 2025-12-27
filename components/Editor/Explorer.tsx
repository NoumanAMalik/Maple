"use client";

import { cn } from "@/lib/utils";

interface ExplorerProps {
    isOpen: boolean;
}

export function Explorer({ isOpen }: ExplorerProps) {
    return (
        <div
            className={cn(
                "h-full overflow-hidden border-l border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] transition-all duration-300",
                isOpen ? "w-60" : "w-0",
            )}
        >
            <div className="p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                    Explorer
                </h2>
            </div>
        </div>
    );
}

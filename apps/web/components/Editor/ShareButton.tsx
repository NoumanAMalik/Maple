"use client";

import { memo } from "react";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
    isSharing: boolean;
    onClick: () => void;
}

export const ShareButton = memo(function ShareButton({ isSharing, onClick }: ShareButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                isSharing
                    ? "border-[var(--ui-accent)] bg-[var(--ui-tab-bg)]"
                    : "border-[var(--ui-border)] bg-[var(--ui-tab-bg)] hover:bg-[var(--ui-hover)]",
            )}
            aria-label={isSharing ? "Sharing active" : "Share"}
            title={isSharing ? "Sharing active" : "Share"}
        >
            <Link2 className="h-4 w-4 text-[var(--editor-fg)]" />
            {isSharing && (
                <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--ui-accent)]"
                    aria-hidden="true"
                />
            )}
        </button>
    );
});

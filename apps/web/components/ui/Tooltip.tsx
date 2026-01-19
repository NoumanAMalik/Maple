"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    side?: "left" | "right" | "top" | "bottom";
}

export function Tooltip({ children, content, side = "left" }: TooltipProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isHovered) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
        setIsVisible(false);
        return undefined;
    }, [isHovered]);

    return (
        /* biome-ignore lint/a11y/noStaticElementInteractions: Tooltip requires mouse events */
        <span className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {children}
            {isHovered && (
                <span
                    className={cn(
                        "absolute z-50 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium",
                        "bg-[var(--ui-hover)] text-[var(--editor-fg)]",
                        "border border-[var(--ui-border)]",
                        "pointer-events-none",
                        "transition-all duration-150 ease-out",
                        // Position based on side (centering always applied)
                        side === "left" && "right-full top-1/2 mr-2",
                        side === "right" && "left-full top-1/2 ml-2",
                        side === "top" && "bottom-full left-1/2 mb-2",
                        side === "bottom" && "top-full left-1/2 mt-2",
                        // Animation + centering transforms
                        isVisible
                            ? cn(
                                  "opacity-100",
                                  (side === "left" || side === "right") && "-translate-y-1/2 translate-x-0",
                                  (side === "top" || side === "bottom") && "-translate-x-1/2 translate-y-0",
                              )
                            : cn(
                                  "opacity-0",
                                  side === "left" && "-translate-y-1/2 translate-x-2",
                                  side === "right" && "-translate-y-1/2 -translate-x-2",
                                  side === "top" && "-translate-x-1/2 translate-y-1",
                                  side === "bottom" && "-translate-x-1/2 -translate-y-1",
                              ),
                    )}
                    role="tooltip"
                >
                    {content}
                </span>
            )}
        </span>
    );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setTimeout(() => setIsAnimating(true), 10);
            return undefined;
        }
        setIsAnimating(false);
        const timer = setTimeout(() => setShouldRender(false), 120);
        return () => clearTimeout(timer);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    if (!shouldRender) return null;

    return (
        /* biome-ignore lint/a11y/noStaticElementInteractions: Click outside to close modal */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    onClose();
                }
            }}
            role="presentation"
        >
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-150",
                    isAnimating ? "opacity-100" : "opacity-0",
                )}
            />
            <div
                className={cn(
                    "relative z-50 w-full max-w-3xl overflow-hidden rounded-lg border",
                    "bg-[var(--ui-sidebar-bg)] border-[var(--ui-border)]",
                    "shadow-2xl",
                    "transition-all duration-150 ease-out",
                    isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95",
                )}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        onClose();
                    }
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-6 py-4">
                    <h2 id="modal-title" className="text-lg font-semibold text-[var(--editor-fg)]">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                onClose();
                            }
                        }}
                        className="rounded-md p-1 text-[var(--editor-line-number)] transition-colors hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)]"
                        aria-label="Close modal"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                            <title>Close</title>
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
            </div>
        </div>
    );
}

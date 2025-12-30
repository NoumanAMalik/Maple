"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCommands, type Command } from "@/lib/commands/registry";

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

function fuzzyMatch(text: string, query: string): boolean {
    let queryIndex = 0;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
        if (lowerText[i] === lowerQuery[queryIndex]) {
            queryIndex++;
        }
    }

    return queryIndex === lowerQuery.length;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const wasOpenRef = useRef(false);
    const closingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Subscribe to command registry changes
    const allCommands = useCommands();

    // Handle opening the palette
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            // Cancel any ongoing closing animation
            if (closingTimerRef.current) {
                clearTimeout(closingTimerRef.current);
                closingTimerRef.current = null;
            }
            // Opening: reset state and render immediately
            setQuery("");
            setSelectedIndex(0);
            setIsClosing(false);
            setShouldRender(true);
        }
        wasOpenRef.current = isOpen;
    }, [isOpen]);

    // Handle closing the palette with animation
    useEffect(() => {
        if (!isOpen && shouldRender && !closingTimerRef.current) {
            // Start closing animation
            setIsClosing(true);
            closingTimerRef.current = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
                closingTimerRef.current = null;
            }, 150);
        }
    }, [isOpen, shouldRender]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (closingTimerRef.current) {
                clearTimeout(closingTimerRef.current);
            }
        };
    }, []);

    // Get filtered commands based on query
    const filteredCommands = useMemo(() => {
        if (!query || query.trim() === "") {
            return allCommands;
        }
        // Filter commands by query
        const lowerQuery = query.toLowerCase();
        return allCommands.filter(
            (cmd) =>
                cmd.label.toLowerCase().includes(lowerQuery) ||
                cmd.category.toLowerCase().includes(lowerQuery) ||
                fuzzyMatch(cmd.label, lowerQuery),
        );
    }, [query, allCommands]);

    // Group commands by category
    const groupedCommands = useMemo(() => {
        const groups: Record<string, Command[]> = {};
        for (const cmd of filteredCommands) {
            if (!groups[cmd.category]) {
                groups[cmd.category] = [];
            }
            groups[cmd.category].push(cmd);
        }
        return groups;
    }, [filteredCommands]);

    // Flatten for keyboard navigation
    const flatCommands = useMemo(() => {
        return Object.values(groupedCommands).flat();
    }, [groupedCommands]);

    // Focus input when opened
    useEffect(() => {
        if (shouldRender && !isClosing && inputRef.current) {
            // Small delay to ensure DOM is ready
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, [shouldRender, isClosing]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedEl?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    const executeCommand = useCallback(
        (command: Command) => {
            onClose();
            // Small delay to let modal close
            setTimeout(() => command.action(), 50);
        },
        [onClose],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    onClose();
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, flatCommands.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (flatCommands[selectedIndex]) {
                        executeCommand(flatCommands[selectedIndex]);
                    }
                    break;
            }
        },
        [onClose, flatCommands, selectedIndex, executeCommand],
    );

    if (!shouldRender) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
        >
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/30 ${isClosing ? "animate-fadeOut" : "animate-fadeIn"}`} />

            {/* Command Palette Modal */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Modal content needs click isolation */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard events handled by input */}
            <div
                className={`relative w-full max-w-lg overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] shadow-2xl ${isClosing ? "animate-scaleOut" : "animate-scaleIn"}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center border-b border-[var(--ui-border)] p-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent text-[var(--editor-fg)] placeholder-[var(--editor-line-number)] focus:outline-none"
                    />
                    <kbd className="rounded border border-[var(--ui-border)] bg-[var(--ui-hover)] px-2 py-1 text-xs text-[var(--editor-line-number)]">
                        Esc
                    </kbd>
                </div>

                {/* Command list */}
                <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                    {Object.entries(groupedCommands).map(([category, commands]) => (
                        <div key={category} className="mb-2">
                            <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--ui-accent)]">
                                {category}
                            </div>
                            {commands.map((command) => {
                                const index = flatCommands.indexOf(command);
                                return (
                                    <button
                                        key={command.id}
                                        type="button"
                                        data-index={index}
                                        onClick={() => executeCommand(command)}
                                        className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm ${
                                            index === selectedIndex
                                                ? "bg-[var(--ui-active)] text-[var(--editor-fg)]"
                                                : "text-[var(--editor-fg)] hover:bg-[var(--ui-hover)]"
                                        }`}
                                    >
                                        <span>{command.label}</span>
                                        {command.shortcut && (
                                            <span className="text-xs text-[var(--editor-line-number)]">
                                                {command.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}

                    {flatCommands.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-[var(--editor-line-number)]">
                            No commands found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

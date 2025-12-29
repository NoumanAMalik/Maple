"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { commandRegistry, type Command } from "@/lib/commands/registry";

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Get filtered commands
    const filteredCommands = useMemo(() => {
        if (!query) return commandRegistry.getAll();
        return commandRegistry.search(query);
    }, [query]);

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
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setQuery("");
            setSelectedIndex(0);
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Command Palette Modal */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Modal content needs click isolation */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard events handled by input */}
            <div
                className="relative w-full max-w-lg overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="border-b border-[var(--ui-border)] p-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="w-full bg-transparent text-[var(--editor-fg)] placeholder-[var(--editor-line-number)] focus:outline-none"
                    />
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

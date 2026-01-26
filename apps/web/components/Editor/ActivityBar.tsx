"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, Modal } from "@/components/ui";
import {
    Undo2,
    Redo2,
    MousePointerSquareDashed,
    Copy,
    Scissors,
    Clipboard,
    IndentIncrease,
    CornerDownLeft,
    Navigation,
    ArrowLeftToLine,
    ArrowRightToLine,
    ArrowUpToLine,
    ArrowDownToLine,
    ArrowLeftRight,
    Home,
    MoveRight,
    Delete,
    Trash2,
    Command,
    ArrowUp,
    ArrowDown,
    Search as SearchIcon,
    Replace,
    ChevronUp,
    ChevronDown,
    Link2,
} from "lucide-react";

interface ActivityBarProps {
    isExplorerOpen: boolean;
    onToggleExplorer: () => void;
    isSearchOpen: boolean;
    onToggleSearch: () => void;
    isShareOpen: boolean;
    onToggleShare: () => void;
}

interface ShortcutCategory {
    title: string;
    shortcuts: {
        keys: string[];
        action: string;
        icon: React.ReactNode;
    }[];
}

const shortcutCategories: ShortcutCategory[] = [
    {
        title: "Search",
        shortcuts: [
            {
                keys: ["Cmd/Ctrl", "K"],
                action: "Command Palette",
                icon: <Command className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "F"],
                action: "Find",
                icon: <SearchIcon className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "H"],
                action: "Find & Replace",
                icon: <Replace className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Shift", "F"],
                action: "Search in Sidebar",
                icon: <SearchIcon className="h-4 w-4" />,
            },
            {
                keys: ["Enter"],
                action: "Next match",
                icon: <ChevronDown className="h-4 w-4" />,
            },
            {
                keys: ["Shift", "Enter"],
                action: "Previous match",
                icon: <ChevronUp className="h-4 w-4" />,
            },
            {
                keys: ["Arrow Down"],
                action: "Next match",
                icon: <ArrowDown className="h-4 w-4" />,
            },
            {
                keys: ["Arrow Up"],
                action: "Previous match",
                icon: <ArrowUp className="h-4 w-4" />,
            },
        ],
    },
    {
        title: "Editing",
        shortcuts: [
            {
                keys: ["Cmd/Ctrl", "Z"],
                action: "Undo",
                icon: <Undo2 className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Shift", "Z"],
                action: "Redo",
                icon: <Redo2 className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Y"],
                action: "Redo (alternative)",
                icon: <Redo2 className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "A"],
                action: "Select All",
                icon: <MousePointerSquareDashed className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "C"],
                action: "Copy",
                icon: <Copy className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "X"],
                action: "Cut",
                icon: <Scissors className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "V"],
                action: "Paste",
                icon: <Clipboard className="h-4 w-4" />,
            },
            {
                keys: ["Tab"],
                action: "Insert spaces",
                icon: <IndentIncrease className="h-4 w-4" />,
            },
            {
                keys: ["Enter"],
                action: "Insert new line",
                icon: <CornerDownLeft className="h-4 w-4" />,
            },
        ],
    },
    {
        title: "Navigation",
        shortcuts: [
            {
                keys: ["Arrow Keys"],
                action: "Move cursor",
                icon: <Navigation className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Arrow Left"],
                action: "Move to line start",
                icon: <ArrowLeftToLine className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Arrow Right"],
                action: "Move to line end",
                icon: <ArrowRightToLine className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Arrow Up"],
                action: "Move to document start",
                icon: <ArrowUpToLine className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Arrow Down"],
                action: "Move to document end",
                icon: <ArrowDownToLine className="h-4 w-4" />,
            },
            {
                keys: ["Alt", "Arrow Left/Right"],
                action: "Move by word",
                icon: <ArrowLeftRight className="h-4 w-4" />,
            },
            {
                keys: ["Home"],
                action: "Move to line start",
                icon: <Home className="h-4 w-4" />,
            },
            {
                keys: ["End"],
                action: "Move to line end",
                icon: <MoveRight className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Home"],
                action: "Move to document start",
                icon: <ArrowUpToLine className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "End"],
                action: "Move to document end",
                icon: <ArrowDownToLine className="h-4 w-4" />,
            },
        ],
    },
    {
        title: "Deletion",
        shortcuts: [
            {
                keys: ["Backspace"],
                action: "Delete backward",
                icon: <Delete className="h-4 w-4" />,
            },
            {
                keys: ["Alt", "Backspace"],
                action: "Delete word left",
                icon: <Delete className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Backspace"],
                action: "Delete to line start",
                icon: <Delete className="h-4 w-4" />,
            },
            {
                keys: ["Delete"],
                action: "Delete forward",
                icon: <Trash2 className="h-4 w-4" />,
            },
            {
                keys: ["Alt", "Delete"],
                action: "Delete word right",
                icon: <Trash2 className="h-4 w-4" />,
            },
            {
                keys: ["Cmd/Ctrl", "Delete"],
                action: "Delete to line end",
                icon: <Trash2 className="h-4 w-4" />,
            },
        ],
    },
];

function getKeyIcon(key: string): React.ReactNode {
    const keyLower = key.toLowerCase();

    // Command/Control
    if (keyLower === "cmd/ctrl") {
        return <span>⌘</span>;
    }

    // Shift
    if (keyLower === "shift") {
        return <span>⇧</span>;
    }

    // Alt/Option
    if (keyLower === "alt") {
        return <span>⌥</span>;
    }

    // Arrow Keys
    if (keyLower === "arrow keys") {
        return (
            <>
                <Navigation className="h-3 w-3" />
                <span className="ml-1">Arrows</span>
            </>
        );
    }

    if (keyLower === "arrow left") {
        return <span>←</span>;
    }
    if (keyLower === "arrow right") {
        return <span>→</span>;
    }
    if (keyLower === "arrow up") {
        return <span>↑</span>;
    }
    if (keyLower === "arrow down") {
        return <span>↓</span>;
    }
    if (keyLower === "arrow left/right") {
        return <span>← →</span>;
    }

    // Special keys
    if (keyLower === "backspace") {
        return <span>⌫</span>;
    }

    if (keyLower === "delete") {
        return (
            <>
                <Trash2 className="h-3 w-3" />
                <span className="ml-1">Del</span>
            </>
        );
    }

    if (keyLower === "tab") {
        return (
            <>
                <IndentIncrease className="h-3 w-3" />
                <span className="ml-1">Tab</span>
            </>
        );
    }

    if (keyLower === "enter") {
        return <span>↵</span>;
    }

    if (keyLower === "home") {
        return <span>Home</span>;
    }

    if (keyLower === "end") {
        return <span>End</span>;
    }

    // Single letter keys
    if (key.length === 1) {
        return <span>{key.toUpperCase()}</span>;
    }

    // Default
    return <span>{key}</span>;
}

export function ActivityBar({
    isExplorerOpen,
    onToggleExplorer,
    isSearchOpen,
    onToggleSearch,
    isShareOpen,
    onToggleShare,
}: ActivityBarProps) {
    const [showShortcuts, setShowShortcuts] = useState(false);

    return (
        <>
            <div className="flex h-full w-14 flex-col items-center gap-4 bg-[var(--ui-sidebar-bg)] py-4">
                <Tooltip content="Explorer" side="left">
                    <button
                        type="button"
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
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                            <path d="M3 3h8l2 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                        </svg>
                    </button>
                </Tooltip>

                <Tooltip content="Search" side="left">
                    <button
                        type="button"
                        onClick={onToggleSearch}
                        aria-label="Toggle Search"
                        aria-pressed={isSearchOpen}
                        className={cn(
                            "relative flex h-10 w-10 items-center justify-center rounded-md text-[var(--editor-fg)] transition-colors duration-200 hover:bg-[var(--ui-hover)]",
                            isSearchOpen && "bg-[var(--ui-hover)]",
                        )}
                    >
                        {isSearchOpen && (
                            <div className="absolute right-0 top-0 h-full w-0.5 rounded-l-sm bg-[var(--ui-accent)]" />
                        )}
                        <SearchIcon className="h-5 w-5" />
                    </button>
                </Tooltip>

                <Tooltip content="Share" side="left">
                    <button
                        type="button"
                        onClick={onToggleShare}
                        aria-label="Toggle Share"
                        aria-pressed={isShareOpen}
                        className={cn(
                            "relative flex h-10 w-10 items-center justify-center rounded-md text-[var(--editor-fg)] transition-colors duration-200 hover:bg-[var(--ui-hover)]",
                            isShareOpen && "bg-[var(--ui-hover)]",
                        )}
                    >
                        {isShareOpen && (
                            <div className="absolute right-0 top-0 h-full w-0.5 rounded-l-sm bg-[var(--ui-accent)]" />
                        )}
                        <Link2 className="h-5 w-5" />
                    </button>
                </Tooltip>

                <div className="flex-1" />

                <Tooltip content="Keyboard Shortcuts" side="left">
                    <button
                        type="button"
                        onClick={() => setShowShortcuts(true)}
                        aria-label="Show keyboard shortcuts"
                        className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--editor-fg)] transition-colors duration-200 hover:bg-[var(--ui-hover)]"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                            <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
                        </svg>
                    </button>
                </Tooltip>
            </div>

            <Modal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard Shortcuts">
                <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                    {shortcutCategories.map((category) => (
                        <div key={category.title}>
                            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--ui-accent)]">
                                {category.title}
                            </h3>
                            <div className="space-y-2.5">
                                {category.shortcuts.map((shortcut, index) => (
                                    <div key={index} className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[var(--editor-line-number)]">{shortcut.icon}</span>
                                            <span className="text-sm text-[var(--editor-fg)]">{shortcut.action}</span>
                                        </div>
                                        <div className="flex flex-shrink-0 items-center gap-1">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <span
                                                    key={keyIndex}
                                                    className="flex items-center gap-1 rounded border border-[var(--ui-border)] bg-[var(--ui-active)] px-2 py-0.5 text-xs font-mono text-[var(--editor-fg)]"
                                                >
                                                    {getKeyIcon(key)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </>
    );
}

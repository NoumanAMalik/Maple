"use client";

import { useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown, X, Search, Replace } from "lucide-react";
import type { SearchMatch } from "@/lib/search/findInDocument";

interface FindReplaceProps {
    isOpen: boolean;
    onClose: () => void;
    onReplace: (newContent: string) => void;
    onNavigateToMatch: (line: number, column: number, length: number) => void;
    // All useFindReplace return values as props
    findQuery: string;
    setFindQuery: (query: string) => void;
    replaceQuery: string;
    setReplaceQuery: (query: string) => void;
    matches: SearchMatch[];
    currentMatchIndex: number;
    caseSensitive: boolean;
    toggleCaseSensitive: () => void;
    useRegex: boolean;
    toggleUseRegex: () => void;
    showReplace: boolean;
    toggleShowReplace: () => void;
    findNext: () => void;
    findPrevious: () => void;
    replaceCurrent: () => string | null;
    replaceAll: () => string | null;
    hasMatches: boolean;
    matchCount: number;
}

export function FindReplace({
    isOpen,
    onClose,
    onReplace,
    onNavigateToMatch,
    findQuery,
    setFindQuery,
    replaceQuery,
    setReplaceQuery,
    matches,
    currentMatchIndex,
    caseSensitive,
    toggleCaseSensitive,
    useRegex,
    toggleUseRegex,
    showReplace,
    toggleShowReplace,
    findNext,
    findPrevious,
    replaceCurrent,
    replaceAll,
    hasMatches,
    matchCount,
}: FindReplaceProps) {
    const findInputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && findInputRef.current) {
            findInputRef.current.focus();
            findInputRef.current.select();
        }
    }, [isOpen]);

    // Navigate to current match
    useEffect(() => {
        if (hasMatches && currentMatchIndex >= 0) {
            const match = matches[currentMatchIndex];
            onNavigateToMatch(match.line, match.column, match.length);
        }
    }, [currentMatchIndex, matches, hasMatches, onNavigateToMatch]);

    const handleReplace = useCallback(() => {
        const newContent = replaceCurrent();
        if (newContent !== null) {
            onReplace(newContent);
        }
    }, [replaceCurrent, onReplace]);

    const handleReplaceAll = useCallback(() => {
        const newContent = replaceAll();
        if (newContent !== null) {
            onReplace(newContent);
        }
    }, [replaceAll, onReplace]);

    // Keyboard handling
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    onClose();
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    findNext();
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    findPrevious();
                    break;
                case "Enter":
                    e.preventDefault();
                    if (e.shiftKey) {
                        findPrevious();
                    } else {
                        findNext();
                    }
                    break;
                case "F3":
                    e.preventDefault();
                    if (e.shiftKey) {
                        findPrevious();
                    } else {
                        findNext();
                    }
                    break;
            }
        },
        [onClose, findNext, findPrevious],
    );

    if (!isOpen) return null;

    return (
        <div className="absolute top-2 right-2 z-50 w-80 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] p-3 shadow-xl animate-slideInFromTopRight">
            {/* Find input row */}
            <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2">
                    <Search className="h-4 w-4 text-[var(--editor-line-number)]" />
                    <input
                        ref={findInputRef}
                        type="text"
                        value={findQuery}
                        onChange={(e) => setFindQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Find"
                        className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] focus:border-[var(--ui-accent)] focus:outline-none"
                    />
                </div>
                <span className="text-xs text-[var(--editor-line-number)] whitespace-nowrap">
                    {hasMatches ? `${currentMatchIndex + 1}/${matchCount}` : "No results"}
                </span>
            </div>

            {/* Options row */}
            <div className="mt-2 flex items-center gap-3">
                <button
                    type="button"
                    onClick={toggleCaseSensitive}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        caseSensitive
                            ? "bg-[var(--ui-accent)] text-white"
                            : "text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)]"
                    }`}
                    title="Match case"
                >
                    Aa
                </button>
                <button
                    type="button"
                    onClick={toggleUseRegex}
                    className={`rounded px-2 py-0.5 text-xs font-mono transition-colors ${
                        useRegex
                            ? "bg-[var(--ui-accent)] text-white"
                            : "text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)]"
                    }`}
                    title="Use regular expression"
                >
                    .*
                </button>
                <button
                    type="button"
                    onClick={toggleShowReplace}
                    className="text-xs text-[var(--editor-line-number)] hover:text-[var(--editor-fg)] transition-colors"
                >
                    {showReplace ? "Hide Replace" : "Replace"}
                </button>
            </div>

            {/* Replace row (conditional) */}
            {showReplace && (
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-2">
                        <Replace className="h-4 w-4 text-[var(--editor-line-number)]" />
                        <input
                            type="text"
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Replace"
                            className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] focus:border-[var(--ui-accent)] focus:outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleReplace}
                        disabled={!hasMatches}
                        className="rounded bg-[var(--ui-hover)] px-2 py-1 text-xs text-[var(--editor-fg)] hover:bg-[var(--ui-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Replace current match"
                    >
                        Replace
                    </button>
                    <button
                        type="button"
                        onClick={handleReplaceAll}
                        disabled={!hasMatches}
                        className="rounded bg-[var(--ui-hover)] px-2 py-1 text-xs text-[var(--editor-fg)] hover:bg-[var(--ui-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Replace all matches"
                    >
                        All
                    </button>
                </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-3 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={findPrevious}
                    disabled={!hasMatches}
                    className="flex items-center justify-center rounded h-7 w-7 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous match"
                    title="Previous match (Shift+Enter)"
                >
                    <ChevronUp className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={findNext}
                    disabled={!hasMatches}
                    className="flex items-center justify-center rounded h-7 w-7 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next match"
                    title="Next match (Enter)"
                >
                    <ChevronDown className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center justify-center rounded h-7 w-7 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] transition-colors"
                    aria-label="Close"
                    title="Close (Escape)"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Keyboard hints */}
            <div className="mt-2 pt-2 border-t border-[var(--ui-border)]">
                <p className="text-xs text-[var(--editor-line-number)]">
                    Enter/↓ next • Shift+Enter/↑ prev • Esc close
                </p>
            </div>
        </div>
    );
}

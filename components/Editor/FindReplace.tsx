"use client";

import { useEffect, useRef, useCallback } from "react";
import { useFindReplace } from "@/hooks/useFindReplace";

interface FindReplaceProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    onReplace: (newContent: string) => void;
    onNavigateToMatch: (line: number, column: number, length: number) => void;
}

export function FindReplace({ isOpen, onClose, content, onReplace, onNavigateToMatch }: FindReplaceProps) {
    const findInputRef = useRef<HTMLInputElement>(null);

    const {
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
    } = useFindReplace({ content, isOpen });

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
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) {
                    findPrevious();
                } else {
                    findNext();
                }
            } else if (e.key === "F3") {
                e.preventDefault();
                if (e.shiftKey) {
                    findPrevious();
                } else {
                    findNext();
                }
            }
        },
        [onClose, findNext, findPrevious],
    );

    if (!isOpen) return null;

    return (
        <div className="absolute top-2 right-2 z-50 w-80 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] p-3 shadow-xl">
            {/* Find input row */}
            <div className="flex items-center gap-2">
                <input
                    ref={findInputRef}
                    type="text"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Find"
                    className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] focus:border-[var(--ui-accent)] focus:outline-none"
                />
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
                    <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Replace"
                        className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] focus:border-[var(--ui-accent)] focus:outline-none"
                    />
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
            <div className="mt-2 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={findPrevious}
                    disabled={!hasMatches}
                    className="rounded p-1 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous match"
                    title="Previous match (Shift+Enter)"
                >
                    ↑
                </button>
                <button
                    type="button"
                    onClick={findNext}
                    disabled={!hasMatches}
                    className="rounded p-1 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next match"
                    title="Next match (Enter)"
                >
                    ↓
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] transition-colors"
                    aria-label="Close"
                    title="Close (Escape)"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

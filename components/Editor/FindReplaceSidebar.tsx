"use client";

import { useRef, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchMatch } from "@/lib/search/findInDocument";

interface FindReplaceSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigateToMatch: (line: number, column: number) => void;
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
    onReplace: (newContent: string) => void;
    replaceCurrent: () => string | null;
    replaceAll: () => string | null;
    hasMatches: boolean;
    matchCount: number;
    // Additional for sidebar context
    content?: string;
}

export function FindReplaceSidebar({
    isOpen,
    onClose,
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
    onReplace,
    replaceCurrent,
    replaceAll,
    hasMatches,
    matchCount,
    content = "",
}: FindReplaceSidebarProps) {
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
            onNavigateToMatch(match.line, match.column);
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

    // Group matches by line
    const matchesByLine = matches.reduce(
        (acc, match, index) => {
            if (!acc[match.line]) {
                acc[match.line] = [];
            }
            acc[match.line].push({ match, index });
            return acc;
        },
        {} as Record<number, Array<{ match: SearchMatch; index: number }>>,
    );

    // Get line content for preview
    const getLineContent = useCallback(
        (lineNumber: number): string => {
            const lines = content.split("\n");
            return lines[lineNumber - 1] || "";
        },
        [content],
    );

    if (!isOpen) return null;

    return (
        <div className="flex h-full w-60 flex-col border-l border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)]">
            {/* Header */}
            <div className="flex h-10 items-center justify-between border-b border-[var(--ui-border)] px-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--editor-fg)]">Search</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-6 w-6 items-center justify-center rounded text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] transition-colors"
                    aria-label="Close search"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Search Input Section */}
            <div className="flex flex-col gap-2 border-b border-[var(--ui-border)] p-3">
                {/* Find input */}
                <div className="flex flex-col gap-1">
                    <label htmlFor="find-input" className="text-xs text-[var(--editor-line-number)]">
                        Find
                    </label>
                    <div className="flex items-center gap-1">
                        <input
                            id="find-input"
                            ref={findInputRef}
                            type="text"
                            value={findQuery}
                            onChange={(e) => setFindQuery(e.target.value)}
                            placeholder="Search..."
                            className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] focus:border-[var(--ui-accent)] focus:outline-none"
                        />
                    </div>
                </div>

                {/* Options */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={toggleCaseSensitive}
                        className={cn(
                            "flex h-6 w-6 items-center justify-center rounded text-xs font-semibold transition-colors",
                            caseSensitive
                                ? "bg-[var(--ui-accent)] text-white"
                                : "text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)]",
                        )}
                        title="Match case"
                        aria-label="Match case"
                    >
                        Aa
                    </button>
                    <button
                        type="button"
                        onClick={toggleUseRegex}
                        className={cn(
                            "flex h-6 w-6 items-center justify-center rounded text-xs font-mono transition-colors",
                            useRegex
                                ? "bg-[var(--ui-accent)] text-white"
                                : "text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)]",
                        )}
                        title="Use regular expression"
                        aria-label="Use regular expression"
                    >
                        .*
                    </button>
                    <button
                        type="button"
                        onClick={toggleShowReplace}
                        className="ml-auto rounded px-2 py-0.5 text-xs text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)] transition-colors"
                    >
                        {showReplace ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                </div>

                {/* Replace input (conditional) */}
                {showReplace && (
                    <div className="flex flex-col gap-1">
                        <label htmlFor="replace-input" className="text-xs text-[var(--editor-line-number)]">
                            Replace
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                id="replace-input"
                                type="text"
                                value={replaceQuery}
                                onChange={(e) => setReplaceQuery(e.target.value)}
                                placeholder="Replace..."
                                className="flex-1 rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] focus:border-[var(--ui-accent)] focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={handleReplace}
                                disabled={!hasMatches}
                                className="flex-1 rounded bg-[var(--ui-hover)] px-2 py-1 text-xs text-[var(--editor-fg)] hover:bg-[var(--ui-active)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                title="Replace current match"
                            >
                                Replace
                            </button>
                            <button
                                type="button"
                                onClick={handleReplaceAll}
                                disabled={!hasMatches}
                                className="flex-1 rounded bg-[var(--ui-hover)] px-2 py-1 text-xs text-[var(--editor-fg)] hover:bg-[var(--ui-active)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                title="Replace all matches"
                            >
                                Replace All
                            </button>
                        </div>
                    </div>
                )}

                {/* Results count */}
                <div className="text-xs text-[var(--editor-line-number)]">
                    {hasMatches ? `${matchCount} result${matchCount === 1 ? "" : "s"}` : "No results"}
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto">
                {hasMatches ? (
                    <div className="divide-y divide-[var(--ui-border)]">
                        {Object.entries(matchesByLine)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([lineNumber, lineMatches]) => {
                                const lineContent = getLineContent(Number(lineNumber));
                                return (
                                    <div key={lineNumber} className="px-3 py-2">
                                        <div className="mb-1 text-xs text-[var(--editor-line-number)]">
                                            Line {lineNumber}
                                        </div>
                                        {lineMatches.map(({ match, index }) => {
                                            const isActive = index === currentMatchIndex;
                                            const beforeMatch = lineContent.slice(0, match.column);
                                            const matchText = lineContent.slice(
                                                match.column,
                                                match.column + match.length,
                                            );
                                            const afterMatch = lineContent.slice(match.column + match.length);

                                            return (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => onNavigateToMatch(match.line, match.column)}
                                                    className={cn(
                                                        "w-full rounded px-2 py-1 text-left text-xs font-mono transition-colors",
                                                        isActive
                                                            ? "bg-[var(--ui-accent)]/20 text-[var(--editor-fg)]"
                                                            : "text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)]",
                                                    )}
                                                >
                                                    <span className="break-all">
                                                        <span>{beforeMatch}</span>
                                                        <span
                                                            className={cn(
                                                                "rounded px-0.5",
                                                                isActive
                                                                    ? "bg-[var(--ui-accent)] text-white"
                                                                    : "bg-yellow-500/30 text-[var(--editor-fg)]",
                                                            )}
                                                        >
                                                            {matchText}
                                                        </span>
                                                        <span>{afterMatch}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-sm text-[var(--editor-line-number)]">
                        {findQuery ? "No matches found" : "Enter a search term to find matches"}
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { useMemo } from "react";
import { Line } from "./Line";
import type { EditorConfig, CursorPosition } from "@/types/editor";
import type { SearchMatch } from "@/lib/search/findInDocument";

interface LineRendererProps {
    /** Function to get line content by line number */
    getLine: (lineNumber: number) => string;
    /** Total number of lines in the document */
    lineCount: number;
    /** First line that should be rendered */
    firstVisibleLine: number;
    /** Last line that should be rendered */
    lastVisibleLine: number;
    /** Current cursor position */
    cursor: CursorPosition;
    /** Editor configuration */
    config: EditorConfig;
    /** Version number to force re-render on content changes */
    version: number;
    /** Search matches to highlight */
    searchMatches?: SearchMatch[];
    /** Current match index for highlighting */
    currentMatchIndex?: number;
    /** Function to get tokens for a line */
    getTokens?: (lineNumber: number) => import("@/lib/tokenizer/types").Token[];
}

/**
 * Renders only the visible lines for virtual scrolling.
 * Uses a padding-top to offset non-rendered lines above the viewport.
 */
export function LineRenderer({
    getLine,
    lineCount,
    firstVisibleLine,
    lastVisibleLine,
    cursor,
    config,
    version,
    searchMatches,
    currentMatchIndex,
    getTokens,
}: LineRendererProps) {
    // Build array of visible lines with their content and matches
    // Note: version is in deps to force rebuild when content changes
    const visibleLines = useMemo(() => {
        const lines: Array<{
            lineNumber: number;
            content: string;
            isCurrent: boolean;
            matches: Array<{ column: number; length: number; isCurrent: boolean }>;
            tokens?: import("@/lib/tokenizer/types").Token[];
        }> = [];

        // Clamp the range to valid line numbers
        const start = Math.max(1, firstVisibleLine);
        const end = Math.min(lineCount, lastVisibleLine);

        for (let i = start; i <= end; i++) {
            const content = getLine(i);

            // Filter matches for this line
            const lineMatches: Array<{ column: number; length: number; isCurrent: boolean }> = [];
            if (searchMatches && searchMatches.length > 0) {
                for (let j = 0; j < searchMatches.length; j++) {
                    const match = searchMatches[j];
                    if (match.line === i) {
                        lineMatches.push({
                            column: match.column,
                            length: match.length,
                            isCurrent: j === currentMatchIndex,
                        });
                    }
                }
            }

            lines.push({
                lineNumber: i,
                content,
                isCurrent: i === cursor.line,
                matches: lineMatches,
                tokens: getTokens?.(i),
            });
        }

        return lines;
        // Note: getLine and getTokens intentionally omitted from deps - version change triggers recompute,
        // and the fresh functions from closure will be used
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineCount, firstVisibleLine, lastVisibleLine, cursor.line, version, searchMatches, currentMatchIndex]);

    // Calculate the offset for the first rendered line
    const paddingTop = useMemo(() => {
        const firstRendered = Math.max(1, firstVisibleLine);
        return (firstRendered - 1) * config.lineHeight;
    }, [firstVisibleLine, config.lineHeight]);

    // Calculate total height for the scroll container
    const totalHeight = lineCount * config.lineHeight;

    return (
        <div
            className="line-renderer"
            style={{
                position: "relative",
                minHeight: `${totalHeight}px`,
                width: "100%",
                zIndex: 1,
            }}
        >
            <div
                className="visible-lines"
                style={{
                    position: "absolute",
                    top: `${paddingTop}px`,
                    left: 0,
                    right: 0,
                }}
            >
                {visibleLines.map((line) => (
                    <Line
                        key={line.lineNumber}
                        lineNumber={line.lineNumber}
                        content={line.content}
                        isCurrent={line.isCurrent}
                        config={config}
                        tokens={line.tokens}
                        matches={line.matches.length > 0 ? line.matches : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

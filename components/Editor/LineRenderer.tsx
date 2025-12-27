"use client";

import { useMemo } from "react";
import { Line } from "./Line";
import type { EditorConfig, CursorPosition } from "@/types/editor";

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
}: LineRendererProps) {
    // Build array of visible lines with their content
    // Note: version is in deps to force rebuild when content changes
    const visibleLines = useMemo(() => {
        const lines: Array<{
            lineNumber: number;
            content: string;
            isCurrent: boolean;
        }> = [];

        // Clamp the range to valid line numbers
        const start = Math.max(1, firstVisibleLine);
        const end = Math.min(lineCount, lastVisibleLine);

        for (let i = start; i <= end; i++) {
            const content = getLine(i);
            lines.push({
                lineNumber: i,
                content,
                isCurrent: i === cursor.line,
            });
        }

        return lines;
        // Note: getLine intentionally omitted from deps - version change triggers recompute,
        // and the fresh getLine from closure will be used
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lineCount, firstVisibleLine, lastVisibleLine, cursor.line, version]);

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
                    />
                ))}
            </div>
        </div>
    );
}

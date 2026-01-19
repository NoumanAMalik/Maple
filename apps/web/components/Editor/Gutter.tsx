"use client";

import { memo, useMemo } from "react";
import type { EditorConfig } from "@/types/editor";
import { EDITOR_CONSTANTS } from "@/utils/constants";

interface GutterProps {
    /** Total number of lines in the document */
    lineCount: number;
    /** First line number to render (for virtual scrolling) */
    firstVisibleLine: number;
    /** Last line number to render */
    lastVisibleLine: number;
    /** Current cursor line number */
    currentLine: number;
    /** Editor configuration */
    config: EditorConfig;
}

interface LineNumberProps {
    /** Line number to display */
    lineNumber: number;
    /** Whether this is the current line */
    isCurrent: boolean;
    /** Height of each line */
    lineHeight: number;
}

/**
 * A single line number in the gutter.
 */
const LineNumber = memo(
    function LineNumber({ lineNumber, isCurrent, lineHeight }: LineNumberProps) {
        return (
            <div
                className="gutter-line-number"
                style={{
                    height: `${lineHeight}px`,
                    lineHeight: `${lineHeight}px`,
                    textAlign: "right",
                    paddingRight: "16px",
                    color: isCurrent ? "var(--editor-fg)" : "var(--editor-line-number)",
                    fontWeight: isCurrent ? 500 : 400,
                    userSelect: "none",
                    fontSize: "inherit",
                }}
            >
                {lineNumber}
            </div>
        );
    },
    (prev, next) =>
        prev.lineNumber === next.lineNumber && prev.isCurrent === next.isCurrent && prev.lineHeight === next.lineHeight,
);

/**
 * The gutter showing line numbers on the left side of the editor.
 * Only renders visible line numbers for virtual scrolling.
 */
export const Gutter = memo(function Gutter({
    lineCount,
    firstVisibleLine,
    lastVisibleLine,
    currentLine,
    config,
}: GutterProps) {
    // Build array of visible line numbers
    const visibleLineNumbers = useMemo(() => {
        const numbers: Array<{ lineNumber: number; isCurrent: boolean }> = [];

        const start = Math.max(1, firstVisibleLine);
        const end = Math.min(lineCount, lastVisibleLine);

        for (let i = start; i <= end; i++) {
            numbers.push({
                lineNumber: i,
                isCurrent: i === currentLine,
            });
        }

        return numbers;
    }, [lineCount, firstVisibleLine, lastVisibleLine, currentLine]);

    // Calculate padding for virtual scrolling offset
    const paddingTop = useMemo(() => {
        const firstRendered = Math.max(1, firstVisibleLine);
        return (firstRendered - 1) * config.lineHeight;
    }, [firstVisibleLine, config.lineHeight]);

    // Calculate total height
    const totalHeight = lineCount * config.lineHeight;

    return (
        <div
            className="editor-gutter"
            style={{
                width: `${EDITOR_CONSTANTS.GUTTER_WIDTH}px`,
                minWidth: `${EDITOR_CONSTANTS.GUTTER_WIDTH}px`,
                height: `${totalHeight}px`,
                backgroundColor: "var(--editor-bg)",
                borderRight: "1px solid var(--ui-border)",
                fontFamily: config.fontFamily,
                fontSize: `${config.fontSize}px`,
                position: "relative",
                userSelect: "none",
                flexShrink: 0,
            }}
        >
            <div
                className="gutter-content"
                style={{
                    position: "absolute",
                    top: `${paddingTop}px`,
                    left: 0,
                    right: 0,
                }}
            >
                {visibleLineNumbers.map((ln) => (
                    <LineNumber
                        key={ln.lineNumber}
                        lineNumber={ln.lineNumber}
                        isCurrent={ln.isCurrent}
                        lineHeight={config.lineHeight}
                    />
                ))}
            </div>
        </div>
    );
});

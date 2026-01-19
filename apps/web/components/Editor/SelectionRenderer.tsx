"use client";

import { memo, useMemo } from "react";
import type { Selection, EditorConfig } from "@/types/editor";
import { normalizeSelection } from "@/types/editor";

interface SelectionRendererProps {
    /** Current selection (or null if none) */
    selection: Selection | null;
    /** Function to get line content */
    getLine: (lineNumber: number) => string;
    /** First visible line (for virtual scrolling optimization) */
    firstVisibleLine: number;
    /** Last visible line */
    lastVisibleLine: number;
    /** Width of a single character */
    charWidth: number;
    /** Editor configuration */
    config: EditorConfig;
}

interface SelectionRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

/**
 * Renders selection highlighting across one or more lines.
 */
export const SelectionRenderer = memo(function SelectionRenderer({
    selection,
    getLine,
    firstVisibleLine,
    lastVisibleLine,
    charWidth,
    config,
}: SelectionRendererProps) {
    // Calculate selection rectangles for visible lines
    const selectionRects = useMemo((): SelectionRect[] => {
        if (!selection) return [];

        const normalized = normalizeSelection(selection);
        const { start, end } = normalized;

        // Check if selection is empty
        if (start.line === end.line && start.column === end.column) {
            return [];
        }

        // Note: selection is positioned within editor-text-area which is already after the gutter
        const padding = 8;
        const rects: SelectionRect[] = [];

        for (let line = start.line; line <= end.line; line++) {
            // Skip lines outside visible range
            if (line < firstVisibleLine || line > lastVisibleLine) {
                continue;
            }

            const lineContent = getLine(line);
            const lineLength = lineContent.length;

            let startCol = 1;
            let endCol = lineLength + 1;

            if (line === start.line) {
                startCol = start.column;
            }
            if (line === end.line) {
                endCol = end.column;
            }

            // Calculate pixel positions
            const top = (line - 1) * config.lineHeight;
            const left = padding + (startCol - 1) * charWidth;
            const width = (endCol - startCol) * charWidth;

            // Ensure minimum width for empty line selections
            const minWidth = line < end.line ? charWidth : 0;

            rects.push({
                top,
                left,
                width: Math.max(width, minWidth),
                height: config.lineHeight,
            });
        }

        return rects;
    }, [selection, getLine, firstVisibleLine, lastVisibleLine, charWidth, config.lineHeight]);

    if (selectionRects.length === 0) {
        return null;
    }

    return (
        <div
            className="selection-layer"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 0,
            }}
            aria-hidden="true"
        >
            {selectionRects.map((rect, index) => (
                <div
                    key={index}
                    className="selection-rect"
                    style={{
                        position: "absolute",
                        top: `${rect.top}px`,
                        left: `${rect.left}px`,
                        width: `${rect.width}px`,
                        height: `${rect.height}px`,
                        backgroundColor: "var(--editor-selection)",
                    }}
                />
            ))}
        </div>
    );
});

"use client";

import { memo } from "react";
import type { HighlightedLine } from "./highlighter";

interface LineRendererProps {
    /** The highlighted line to render */
    line: HighlightedLine;
    /** Line height in pixels */
    lineHeight: number;
}

/**
 * Memoized component for rendering a single highlighted line.
 * Only re-renders when the line content or height changes.
 */
export const LineRenderer = memo<LineRendererProps>(
    function LineRenderer({ line, lineHeight }) {
        return (
            <div
                className="whitespace-pre"
                style={{
                    height: lineHeight,
                    lineHeight: `${lineHeight}px`,
                }}
                data-line={line.lineNumber}
            >
                {line.elements.length > 0 ? line.elements : "\u200B"}
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison for better performance
        // Only re-render if line number, element count, or height changed
        return (
            prevProps.line.lineNumber === nextProps.line.lineNumber &&
            prevProps.line.elements.length === nextProps.line.elements.length &&
            prevProps.lineHeight === nextProps.lineHeight &&
            prevProps.line.isEmpty === nextProps.line.isEmpty
        );
    },
);

interface HighlightedCodeProps {
    /** Array of highlighted lines to render */
    lines: HighlightedLine[];
    /** Line height in pixels */
    lineHeight: number;
    /** Optional class name for the container */
    className?: string;
}

/**
 * Component for rendering all highlighted lines.
 */
export function HighlightedCode({ lines, lineHeight, className }: HighlightedCodeProps) {
    return (
        <code className={className}>
            {lines.map((line) => (
                <LineRenderer key={line.lineNumber} line={line} lineHeight={lineHeight} />
            ))}
        </code>
    );
}

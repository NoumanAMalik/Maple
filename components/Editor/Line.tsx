"use client";

import { memo } from "react";
import type { EditorConfig } from "@/types/editor";

interface LineProps {
    /** Line number (1-indexed) */
    lineNumber: number;
    /** Content of the line */
    content: string;
    /** Whether this is the current cursor line */
    isCurrent: boolean;
    /** Editor configuration */
    config: EditorConfig;
}

/**
 * A single line of text in the editor.
 * Memoized for performance - only re-renders when content or current state changes.
 */
export const Line = memo(
    function Line({ lineNumber, content, isCurrent, config }: LineProps) {
        return (
            <div
                className="editor-line"
                data-line={lineNumber}
                style={{
                    height: `${config.lineHeight}px`,
                    lineHeight: `${config.lineHeight}px`,
                    backgroundColor: isCurrent ? "var(--editor-active-line)" : "transparent",
                    fontFamily: config.fontFamily,
                    fontSize: `${config.fontSize}px`,
                    whiteSpace: "pre",
                    paddingLeft: "8px",
                    paddingRight: "8px",
                    color: "var(--editor-fg)",
                    minWidth: "100%",
                    boxSizing: "border-box",
                }}
            >
                {content || "\u00A0"}
                {/* Non-breaking space for empty lines */}
            </div>
        );
    },
    (prev, next) => {
        // Custom equality check for optimal performance
        return (
            prev.lineNumber === next.lineNumber &&
            prev.content === next.content &&
            prev.isCurrent === next.isCurrent &&
            prev.config.lineHeight === next.config.lineHeight &&
            prev.config.fontSize === next.config.fontSize
        );
    },
);

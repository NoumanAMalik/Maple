"use client";

import { memo, useState, useEffect, useRef } from "react";
import type { CursorPosition, EditorConfig } from "@/types/editor";

interface CursorRendererProps {
    /** Current cursor position (1-indexed) */
    cursor: CursorPosition;
    /** Width of a single character in pixels */
    charWidth: number;
    /** Editor configuration */
    config: EditorConfig;
    /** Whether the editor is focused */
    isFocused: boolean;
}

const BLINK_INTERVAL = 530; // ms, standard cursor blink rate

/**
 * Renders the blinking text cursor at the current position.
 */
export const CursorRenderer = memo(function CursorRenderer({
    cursor,
    charWidth,
    config,
    isFocused,
}: CursorRendererProps) {
    const [visible, setVisible] = useState(true);
    const blinkTimerRef = useRef<number | null>(null);
    const lastCursorRef = useRef({ line: cursor.line, column: cursor.column });

    // Reset blink and show cursor when cursor moves or focus changes
    useEffect(() => {
        const cursorMoved =
            lastCursorRef.current.line !== cursor.line || lastCursorRef.current.column !== cursor.column;

        if (cursorMoved || isFocused) {
            setVisible(true);
            lastCursorRef.current = { line: cursor.line, column: cursor.column };
        }

        // Clear existing timer
        if (blinkTimerRef.current !== null) {
            clearInterval(blinkTimerRef.current);
            blinkTimerRef.current = null;
        }

        // Only blink when focused
        if (isFocused) {
            blinkTimerRef.current = window.setInterval(() => {
                setVisible((v) => !v);
            }, BLINK_INTERVAL);
        }

        return () => {
            if (blinkTimerRef.current !== null) {
                clearInterval(blinkTimerRef.current);
            }
        };
    }, [cursor.line, cursor.column, isFocused]);

    // Calculate cursor position in pixels
    // Note: cursor is positioned within editor-text-area which is already after the gutter
    const padding = 8;

    const top = (cursor.line - 1) * config.lineHeight;
    const left = padding + (cursor.column - 1) * charWidth;

    // Don't render if not focused
    if (!isFocused) {
        return null;
    }

    return (
        <div
            className="editor-cursor"
            style={{
                position: "absolute",
                top: `${top}px`,
                left: `${left}px`,
                width: "2px",
                height: `${config.lineHeight}px`,
                backgroundColor: "var(--editor-cursor)",
                opacity: visible ? 1 : 0,
                pointerEvents: "none",
                zIndex: 10,
                transition: "opacity 0.05s ease-in-out",
            }}
            aria-hidden="true"
        />
    );
});

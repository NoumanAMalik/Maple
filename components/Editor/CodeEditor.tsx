"use client";

import { useRef, useState, useCallback, useMemo, useEffect, type MouseEvent } from "react";
import { useEditorState } from "@/hooks/useEditorState";
import { useViewport } from "@/hooks/useViewport";
import { Gutter } from "./Gutter";
import { LineRenderer } from "./LineRenderer";
import { CursorRenderer } from "./CursorRenderer";
import { SelectionRenderer } from "./SelectionRenderer";
import { HiddenTextarea } from "./HiddenTextarea";
import { createCoordinateConverter, pixelToPosition } from "@/lib/editor/coordinates";
import type { EditorConfig, CursorPosition } from "@/types/editor";
import type { SearchMatch } from "@/lib/search/findInDocument";

interface CodeEditorProps {
    /** Initial content to display */
    initialContent?: string;
    /** Called when content changes */
    onChange?: (content: string) => void;
    /** Called when cursor position changes */
    onCursorChange?: (position: CursorPosition) => void;
    /** Editor configuration overrides */
    config?: Partial<EditorConfig>;
    /** Whether the editor should auto-focus */
    autoFocus?: boolean;
    /** Search matches to highlight */
    searchMatches?: SearchMatch[];
    /** Current match index for highlighting */
    currentMatchIndex?: number;
}

/**
 * The main code editor component.
 * Provides a full-featured text editing experience with virtual scrolling,
 * cursor, selection, and keyboard handling.
 */
export function CodeEditor({
    initialContent = "",
    onChange,
    onCursorChange,
    config: configOverrides,
    autoFocus = true,
    searchMatches,
    currentMatchIndex,
}: CodeEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const prevCursorRef = useRef<{ line: number; column: number } | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);

    // Core editor state
    const editor = useEditorState({
        initialContent,
        config: configOverrides,
        onChange,
    });

    // Viewport for virtual scrolling
    const { viewState, setScroll, scrollToPosition } = useViewport({
        containerRef: scrollContainerRef,
        lineCount: editor.getLineCount(),
        lineHeight: editor.config.lineHeight,
    });

    // Coordinate converter for mouse handling
    const coordinateConverter = useMemo(() => createCoordinateConverter(editor.config), [editor.config]);

    // Notify parent of cursor changes
    useEffect(() => {
        onCursorChange?.(editor.cursor);
    }, [editor.cursor, onCursorChange]);

    // Scroll to keep cursor visible when it moves
    useEffect(() => {
        const prev = prevCursorRef.current;
        const curr = editor.cursor;

        // Only scroll if cursor position actually changed
        if (!prev || prev.line !== curr.line || prev.column !== curr.column) {
            scrollToPosition(curr.line, curr.column, coordinateConverter.charWidth);
            prevCursorRef.current = { line: curr.line, column: curr.column };
        }
    }, [editor.cursor, scrollToPosition, coordinateConverter.charWidth]);

    // Handle scroll events
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.currentTarget;
            setScroll(target.scrollTop, target.scrollLeft);
        },
        [setScroll],
    );

    // Convert mouse coordinates to cursor position
    const getPositionFromMouse = useCallback(
        (e: MouseEvent<HTMLDivElement>): CursorPosition => {
            const container = scrollContainerRef.current;
            if (!container) return { line: 1, column: 1 };

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            return pixelToPosition(
                coordinateConverter,
                x,
                y,
                viewState.scrollTop,
                viewState.scrollLeft,
                editor.getLineCount(),
                editor.getLineLength,
            );
        },
        [coordinateConverter, viewState.scrollTop, viewState.scrollLeft, editor],
    );

    // Handle mouse down for cursor positioning and selection start
    const handleMouseDown = useCallback(
        (e: MouseEvent<HTMLDivElement>) => {
            // Only handle left button
            if (e.button !== 0) return;

            e.preventDefault();
            setIsMouseDown(true);

            const position = getPositionFromMouse(e);

            if (e.shiftKey) {
                // Extend selection
                editor.executeCommand({
                    type: "moveCursorTo",
                    position,
                    extend: true,
                });
            } else {
                // Start new selection
                editor.setCursor(position);
                editor.setSelection({ anchor: position, active: position });
            }

            // Focus the hidden textarea
            containerRef.current?.querySelector("textarea")?.focus();
        },
        [getPositionFromMouse, editor],
    );

    // Handle mouse move for selection extension
    const handleMouseMove = useCallback(
        (e: MouseEvent<HTMLDivElement>) => {
            if (!isMouseDown) return;

            const position = getPositionFromMouse(e);
            editor.executeCommand({
                type: "moveCursorTo",
                position,
                extend: true,
            });
        },
        [isMouseDown, getPositionFromMouse, editor],
    );

    // Handle mouse up to end selection
    const handleMouseUp = useCallback(() => {
        setIsMouseDown(false);
    }, []);

    // Handle global mouse up to catch releases outside the editor
    useEffect(() => {
        if (!isMouseDown) return;

        const handleGlobalMouseUp = () => {
            setIsMouseDown(false);
        };

        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => {
            window.removeEventListener("mouseup", handleGlobalMouseUp);
        };
    }, [isMouseDown]);

    // Handle focus change
    const handleFocusChange = useCallback((focused: boolean) => {
        setIsFocused(focused);
    }, []);

    // Click on container to focus
    const handleContainerClick = useCallback(() => {
        containerRef.current?.querySelector("textarea")?.focus();
    }, []);

    // Keyboard handler for container (delegates to textarea)
    const handleContainerKeyDown = useCallback(() => {
        // Focus the hidden textarea to handle keyboard input
        containerRef.current?.querySelector("textarea")?.focus();
    }, []);

    // Calculate total content dimensions
    const totalHeight = editor.getLineCount() * editor.config.lineHeight;

    return (
        <div
            ref={containerRef}
            className="code-editor"
            role="application"
            aria-label="Code editor"
            tabIndex={-1}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                backgroundColor: "var(--editor-bg)",
                color: "var(--editor-fg)",
                fontFamily: editor.config.fontFamily,
                fontSize: `${editor.config.fontSize}px`,
                overflow: "hidden",
                cursor: "text",
                outline: "none",
            }}
            onClick={handleContainerClick}
            onKeyDown={handleContainerKeyDown}
        >
            {/* Hidden textarea for input capture */}
            <HiddenTextarea
                onCommand={editor.executeCommand}
                getSelectedText={editor.getSelectedText}
                autoFocus={autoFocus}
                onFocusChange={handleFocusChange}
                tabSize={editor.config.tabSize}
            />

            {/* Scroll container */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse events for text selection */}
            <div
                ref={scrollContainerRef}
                className="editor-scroll-container"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: "auto",
                }}
                onScroll={handleScroll}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                {/* Content wrapper with total height for scrolling */}
                <div
                    className="editor-content"
                    style={{
                        position: "relative",
                        display: "flex",
                        minHeight: `${totalHeight}px`,
                        minWidth: "100%",
                    }}
                >
                    {/* Gutter with line numbers */}
                    <Gutter
                        lineCount={editor.getLineCount()}
                        firstVisibleLine={viewState.firstVisibleLine}
                        lastVisibleLine={viewState.lastVisibleLine}
                        currentLine={editor.cursor.line}
                        config={editor.config}
                    />

                    {/* Text content area */}
                    <div
                        className="editor-text-area"
                        style={{
                            position: "relative",
                            flex: 1,
                            minHeight: `${totalHeight}px`,
                        }}
                    >
                        {/* Selection layer */}
                        <SelectionRenderer
                            selection={editor.selection}
                            getLine={editor.getLine}
                            firstVisibleLine={viewState.firstVisibleLine}
                            lastVisibleLine={viewState.lastVisibleLine}
                            charWidth={coordinateConverter.charWidth}
                            config={editor.config}
                        />

                        {/* Lines (plain text - no syntax highlighting) */}
                        <LineRenderer
                            getLine={editor.getLine}
                            lineCount={editor.getLineCount()}
                            firstVisibleLine={viewState.firstVisibleLine}
                            lastVisibleLine={viewState.lastVisibleLine}
                            cursor={editor.cursor}
                            config={editor.config}
                            version={editor.version}
                            searchMatches={searchMatches}
                            currentMatchIndex={currentMatchIndex}
                        />

                        {/* Cursor */}
                        <CursorRenderer
                            cursor={editor.cursor}
                            charWidth={coordinateConverter.charWidth}
                            config={editor.config}
                            isFocused={isFocused}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

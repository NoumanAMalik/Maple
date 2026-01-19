"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { PieceTable, type PieceTableSnapshot } from "@/lib/editor/pieceTable";
import {
    type CursorPosition,
    type Selection,
    type EditorConfig,
    type EditorCommand,
    type CursorDirection,
    defaultEditorConfig,
    normalizeSelection,
    isSelectionEmpty,
} from "@/types/editor";

interface UseEditorStateOptions {
    initialContent?: string;
    config?: Partial<EditorConfig>;
    onChange?: (content: string) => void;
}

interface HistoryEntry {
    snapshot: PieceTableSnapshot;
    cursor: CursorPosition;
    selection: Selection | null;
    timestamp: number;
}

interface EditMetadata {
    changedFromLine: number;
    version: number;
}

export interface EditorStateAPI {
    // State
    cursor: CursorPosition;
    selection: Selection | null;
    isDirty: boolean;
    version: number;
    config: EditorConfig;

    // Queries
    getContent: () => string;
    getLine: (lineNumber: number) => string;
    getLineCount: () => number;
    getLineLength: (lineNumber: number) => number;
    getSelectedText: () => string;

    // Commands
    executeCommand: (command: EditorCommand) => void;

    // Direct setters (for mouse handling)
    setCursor: (position: CursorPosition) => void;
    setSelection: (selection: Selection | null) => void;

    // Edit metadata for incremental tokenization
    getEditMetadata: () => EditMetadata | null;
    clearEditMetadata: () => void;
}

const HISTORY_BATCH_WINDOW = 300; // ms - batch edits within this window
const MAX_HISTORY_SIZE = 1000;

/**
 * Core hook for managing editor state.
 * Handles document content, cursor, selection, and undo/redo.
 */
export function useEditorState(options: UseEditorStateOptions = {}): EditorStateAPI {
    const { initialContent = "", config: userConfig, onChange } = options;

    const config = useMemo(() => ({ ...defaultEditorConfig, ...userConfig }), [userConfig]);

    // Core buffer state via PieceTable
    const bufferRef = useRef<PieceTable>(new PieceTable(initialContent));

    // Version number to trigger re-renders
    const [version, setVersion] = useState(0);

    // Cursor and selection state
    const [cursor, setCursorState] = useState<CursorPosition>({ line: 1, column: 1 });
    const [selection, setSelectionState] = useState<Selection | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // History for undo/redo
    const undoStackRef = useRef<HistoryEntry[]>([]);
    const redoStackRef = useRef<HistoryEntry[]>([]);
    const lastEditTimeRef = useRef<number>(0);

    // Edit metadata for incremental tokenization
    const editMetadataRef = useRef<EditMetadata | null>(null);

    // Helper to trigger re-render
    const triggerUpdate = useCallback(() => {
        setVersion((v) => v + 1);
    }, []);

    // Track previous initialContent to detect changes
    const prevInitialContentRef = useRef(initialContent);

    // Sync buffer when initialContent changes (e.g., tab switch)
    // Only reset if initialContent changed AND differs from current buffer
    // This distinguishes tab switches (buffer content differs) from keystrokes
    // (buffer already has the same content from user typing)
    useEffect(() => {
        const currentContent = bufferRef.current.getText();
        if (initialContent !== prevInitialContentRef.current && initialContent !== currentContent) {
            // Tab switch: initialContent changed AND differs from buffer
            bufferRef.current = new PieceTable(initialContent);
            setCursorState({ line: 1, column: 1 });
            setSelectionState(null);
            setIsDirty(false);
            undoStackRef.current = [];
            redoStackRef.current = [];
            prevInitialContentRef.current = initialContent;
            triggerUpdate();
        } else if (initialContent !== prevInitialContentRef.current) {
            // Content matches buffer but ref is stale (keystroke case), just update ref
            prevInitialContentRef.current = initialContent;
        }
    }, [initialContent, triggerUpdate]);

    // Helper to validate and clamp cursor position
    const clampCursor = useCallback((pos: CursorPosition): CursorPosition => {
        const buffer = bufferRef.current;
        const lineCount = buffer.getLineCount();
        const line = Math.max(1, Math.min(pos.line, lineCount));
        const lineLength = buffer.getLine(line).length;
        const column = Math.max(1, Math.min(pos.column, lineLength + 1));
        return { line, column };
    }, []);

    // Push current state to undo stack
    const pushToHistory = useCallback(
        (force = false) => {
            const now = Date.now();
            const timeSinceLastEdit = now - lastEditTimeRef.current;
            const shouldBatch = timeSinceLastEdit < HISTORY_BATCH_WINDOW && !force;

            if (!shouldBatch) {
                const entry: HistoryEntry = {
                    snapshot: bufferRef.current.snapshot(),
                    cursor,
                    selection,
                    timestamp: now,
                };

                undoStackRef.current.push(entry);

                // Trim history if too large
                if (undoStackRef.current.length > MAX_HISTORY_SIZE) {
                    undoStackRef.current = undoStackRef.current.slice(-MAX_HISTORY_SIZE);
                }

                // Clear redo stack on new edit
                redoStackRef.current = [];
            }

            lastEditTimeRef.current = now;
        },
        [cursor, selection],
    );

    // Insert text at cursor position
    const insertText = useCallback(
        (text: string) => {
            const buffer = bufferRef.current;

            // Determine changedFromLine before any edits
            const changedFromLine =
                selection && !isSelectionEmpty(selection) ? normalizeSelection(selection).start.line : cursor.line;

            // Delete selection first if present
            if (selection && !isSelectionEmpty(selection)) {
                const normalized = normalizeSelection(selection);
                const startOffset = buffer.positionToOffset(normalized.start);
                const endOffset = buffer.positionToOffset(normalized.end);
                buffer.delete(startOffset, endOffset - startOffset);
                setCursorState(normalized.start);
                setSelectionState(null);
            }

            // Insert text
            const offset = buffer.positionToOffset(cursor);
            buffer.insert(offset, text);

            // Move cursor after inserted text
            const newOffset = offset + text.length;
            const newCursor = buffer.offsetToPosition(newOffset);
            setCursorState(newCursor);
            setIsDirty(true);

            // Store edit metadata for incremental tokenization
            editMetadataRef.current = { changedFromLine, version: version + 1 };

            onChange?.(buffer.getText());
            triggerUpdate();
        },
        [cursor, selection, onChange, triggerUpdate, version],
    );

    // Delete backward (backspace)
    const deleteBackward = useCallback(() => {
        const buffer = bufferRef.current;

        // Determine changedFromLine before any edits
        const changedFromLine =
            selection && !isSelectionEmpty(selection) ? normalizeSelection(selection).start.line : cursor.line;

        if (selection && !isSelectionEmpty(selection)) {
            // Delete selection
            const normalized = normalizeSelection(selection);
            const startOffset = buffer.positionToOffset(normalized.start);
            const endOffset = buffer.positionToOffset(normalized.end);
            buffer.delete(startOffset, endOffset - startOffset);
            setCursorState(normalized.start);
            setSelectionState(null);
        } else {
            // Delete character before cursor
            const offset = buffer.positionToOffset(cursor);
            if (offset > 0) {
                buffer.delete(offset - 1, 1);
                const newCursor = buffer.offsetToPosition(offset - 1);
                setCursorState(newCursor);
            }
        }

        setIsDirty(true);

        // Store edit metadata for incremental tokenization
        editMetadataRef.current = { changedFromLine, version: version + 1 };

        onChange?.(buffer.getText());
        triggerUpdate();
    }, [cursor, selection, onChange, triggerUpdate, version]);

    // Delete forward (delete key)
    const deleteForward = useCallback(() => {
        const buffer = bufferRef.current;

        // Determine changedFromLine before any edits
        const changedFromLine =
            selection && !isSelectionEmpty(selection) ? normalizeSelection(selection).start.line : cursor.line;

        if (selection && !isSelectionEmpty(selection)) {
            // Delete selection
            const normalized = normalizeSelection(selection);
            const startOffset = buffer.positionToOffset(normalized.start);
            const endOffset = buffer.positionToOffset(normalized.end);
            buffer.delete(startOffset, endOffset - startOffset);
            setCursorState(normalized.start);
            setSelectionState(null);
        } else {
            // Delete character after cursor
            const offset = buffer.positionToOffset(cursor);
            if (offset < buffer.getTotalLength()) {
                buffer.delete(offset, 1);
            }
        }

        setIsDirty(true);

        // Store edit metadata for incremental tokenization
        editMetadataRef.current = { changedFromLine, version: version + 1 };

        onChange?.(buffer.getText());
        triggerUpdate();
    }, [cursor, selection, onChange, triggerUpdate, version]);

    // Move cursor in a direction
    const moveCursor = useCallback(
        (direction: CursorDirection, extend = false) => {
            const buffer = bufferRef.current;
            let newCursor = { ...cursor };

            switch (direction) {
                case "left":
                    if (cursor.column > 1) {
                        newCursor.column--;
                    } else if (cursor.line > 1) {
                        newCursor.line--;
                        newCursor.column = buffer.getLine(newCursor.line).length + 1;
                    }
                    break;

                case "right": {
                    const lineLength = buffer.getLine(cursor.line).length;
                    if (cursor.column <= lineLength) {
                        newCursor.column++;
                    } else if (cursor.line < buffer.getLineCount()) {
                        newCursor.line++;
                        newCursor.column = 1;
                    }
                    break;
                }

                case "up":
                    if (cursor.line > 1) {
                        newCursor.line--;
                        const lineLength = buffer.getLine(newCursor.line).length;
                        newCursor.column = Math.min(cursor.column, lineLength + 1);
                    }
                    break;

                case "down":
                    if (cursor.line < buffer.getLineCount()) {
                        newCursor.line++;
                        const lineLength = buffer.getLine(newCursor.line).length;
                        newCursor.column = Math.min(cursor.column, lineLength + 1);
                    }
                    break;

                case "lineStart":
                    newCursor.column = 1;
                    break;

                case "lineEnd":
                    newCursor.column = buffer.getLine(cursor.line).length + 1;
                    break;

                case "documentStart":
                    newCursor = { line: 1, column: 1 };
                    break;

                case "documentEnd": {
                    const lastLine = buffer.getLineCount();
                    newCursor = {
                        line: lastLine,
                        column: buffer.getLine(lastLine).length + 1,
                    };
                    break;
                }

                case "wordLeft": {
                    const lineContent = buffer.getLine(cursor.line);
                    let col = cursor.column - 2; // 0-indexed

                    if (col < 0) {
                        // Move to end of previous line
                        if (cursor.line > 1) {
                            newCursor.line--;
                            newCursor.column = buffer.getLine(newCursor.line).length + 1;
                        }
                        break;
                    }

                    // Skip spaces
                    while (col >= 0 && /\s/.test(lineContent[col])) {
                        col--;
                    }
                    // Skip word characters
                    while (col >= 0 && /\w/.test(lineContent[col])) {
                        col--;
                    }

                    newCursor.column = col + 2; // Back to 1-indexed
                    break;
                }

                case "wordRight": {
                    const lineContent = buffer.getLine(cursor.line);
                    let col = cursor.column - 1; // 0-indexed

                    if (col >= lineContent.length) {
                        // Move to start of next line
                        if (cursor.line < buffer.getLineCount()) {
                            newCursor.line++;
                            newCursor.column = 1;
                        }
                        break;
                    }

                    // Skip word characters
                    while (col < lineContent.length && /\w/.test(lineContent[col])) {
                        col++;
                    }
                    // Skip spaces
                    while (col < lineContent.length && /\s/.test(lineContent[col])) {
                        col++;
                    }

                    newCursor.column = col + 1; // Back to 1-indexed
                    break;
                }
            }

            newCursor = clampCursor(newCursor);

            if (extend) {
                // Extend selection
                if (selection) {
                    setSelectionState({ anchor: selection.anchor, active: newCursor });
                } else {
                    setSelectionState({ anchor: cursor, active: newCursor });
                }
            } else {
                // Clear selection
                setSelectionState(null);
            }

            setCursorState(newCursor);
            triggerUpdate();
        },
        [cursor, selection, clampCursor, triggerUpdate],
    );

    // Move cursor to a specific position
    const moveCursorTo = useCallback(
        (position: CursorPosition, extend = false) => {
            const newCursor = clampCursor(position);

            if (extend) {
                if (selection) {
                    setSelectionState({ anchor: selection.anchor, active: newCursor });
                } else {
                    setSelectionState({ anchor: cursor, active: newCursor });
                }
            } else {
                setSelectionState(null);
            }

            setCursorState(newCursor);
            triggerUpdate();
        },
        [cursor, selection, clampCursor, triggerUpdate],
    );

    // Select all text
    const selectAll = useCallback(() => {
        const buffer = bufferRef.current;
        const lastLine = buffer.getLineCount();
        const lastColumn = buffer.getLine(lastLine).length + 1;

        setSelectionState({
            anchor: { line: 1, column: 1 },
            active: { line: lastLine, column: lastColumn },
        });
        setCursorState({ line: lastLine, column: lastColumn });
        triggerUpdate();
    }, [triggerUpdate]);

    // Undo
    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) return;

        // Save current state to redo stack
        redoStackRef.current.push({
            snapshot: bufferRef.current.snapshot(),
            cursor,
            selection,
            timestamp: Date.now(),
        });

        // Restore from undo stack
        const entry = undoStackRef.current.pop()!;
        bufferRef.current.restore(entry.snapshot);
        setCursorState(entry.cursor);
        setSelectionState(entry.selection);
        setIsDirty(true);

        // Full re-tokenization needed after undo
        editMetadataRef.current = { changedFromLine: 1, version: version + 1 };

        onChange?.(bufferRef.current.getText());
        triggerUpdate();
    }, [cursor, selection, onChange, triggerUpdate, version]);

    // Redo
    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) return;

        // Save current state to undo stack
        undoStackRef.current.push({
            snapshot: bufferRef.current.snapshot(),
            cursor,
            selection,
            timestamp: Date.now(),
        });

        // Restore from redo stack
        const entry = redoStackRef.current.pop()!;
        bufferRef.current.restore(entry.snapshot);
        setCursorState(entry.cursor);
        setSelectionState(entry.selection);
        setIsDirty(true);

        // Full re-tokenization needed after redo
        editMetadataRef.current = { changedFromLine: 1, version: version + 1 };

        onChange?.(bufferRef.current.getText());
        triggerUpdate();
    }, [cursor, selection, onChange, triggerUpdate, version]);

    // Execute a command
    const executeCommand = useCallback(
        (command: EditorCommand) => {
            // Push to history before modifying content
            if (
                ["insert", "deleteBackward", "deleteForward", "deleteSelection", "paste", "cut"].includes(command.type)
            ) {
                pushToHistory();
            }

            switch (command.type) {
                case "insert":
                    insertText(command.text);
                    break;

                case "deleteBackward":
                    deleteBackward();
                    break;

                case "deleteForward":
                    deleteForward();
                    break;

                case "deleteSelection":
                    if (selection && !isSelectionEmpty(selection)) {
                        deleteBackward(); // Reuse logic
                    }
                    break;

                case "moveCursor":
                    moveCursor(command.direction, command.extend);
                    break;

                case "moveCursorTo":
                    moveCursorTo(command.position, command.extend);
                    break;

                case "selectAll":
                    selectAll();
                    break;

                case "undo":
                    undo();
                    break;

                case "redo":
                    redo();
                    break;

                case "paste":
                    insertText(command.text);
                    break;

                case "cut":
                    if (selection && !isSelectionEmpty(selection)) {
                        deleteBackward();
                    }
                    break;
            }
        },
        [
            pushToHistory,
            insertText,
            deleteBackward,
            deleteForward,
            moveCursor,
            moveCursorTo,
            selectAll,
            undo,
            redo,
            selection,
        ],
    );

    // Get selected text
    const getSelectedText = useCallback((): string => {
        if (!selection || isSelectionEmpty(selection)) return "";

        const buffer = bufferRef.current;
        const normalized = normalizeSelection(selection);
        const startOffset = buffer.positionToOffset(normalized.start);
        const endOffset = buffer.positionToOffset(normalized.end);

        return buffer.getText(startOffset, endOffset);
    }, [selection]);

    // Direct cursor setter (for mouse handling)
    const setCursor = useCallback(
        (position: CursorPosition) => {
            setCursorState(clampCursor(position));
            triggerUpdate();
        },
        [clampCursor, triggerUpdate],
    );

    // Direct selection setter (for mouse handling)
    const setSelection = useCallback(
        (newSelection: Selection | null) => {
            setSelectionState(newSelection);
            triggerUpdate();
        },
        [triggerUpdate],
    );

    // Build the API object
    return useMemo(
        () => ({
            cursor,
            selection,
            isDirty,
            version,
            config,

            getContent: () => bufferRef.current.getText(),
            getLine: (lineNumber: number) => bufferRef.current.getLine(lineNumber),
            getLineCount: () => bufferRef.current.getLineCount(),
            getLineLength: (lineNumber: number) => bufferRef.current.getLine(lineNumber).length,
            getSelectedText,

            executeCommand,
            setCursor,
            setSelection,
            getEditMetadata: () => editMetadataRef.current,
            clearEditMetadata: () => {
                editMetadataRef.current = null;
            },
        }),
        [cursor, selection, isDirty, version, config, getSelectedText, executeCommand, setCursor, setSelection],
    );
}

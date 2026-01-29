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
import type { Operation } from "@maple/protocol";

interface UseEditorStateOptions {
    initialContent?: string;
    config?: Partial<EditorConfig>;
    onChange?: (content: string) => void;
    onOperations?: (ops: Operation[]) => void;
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
    applyRemoteOperations: (ops: Operation[]) => void;

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
    const { initialContent = "", config: userConfig, onChange, onOperations } = options;

    const config = useMemo(() => ({ ...defaultEditorConfig, ...userConfig }), [userConfig]);

    // Core buffer state via PieceTable
    const bufferRef = useRef<PieceTable>(new PieceTable(initialContent));

    // Version number to trigger re-renders
    const [version, setVersion] = useState(0);

    // Cursor and selection state
    const [cursor, setCursorState] = useState<CursorPosition>({ line: 1, column: 1 });
    const [selection, setSelectionState] = useState<Selection | null>(null);
    const cursorRef = useRef<CursorPosition>({ line: 1, column: 1 });
    const selectionRef = useRef<Selection | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const updateCursor = useCallback((next: CursorPosition) => {
        cursorRef.current = next;
        setCursorState(next);
    }, []);

    const updateSelection = useCallback((next: Selection | null) => {
        selectionRef.current = next;
        setSelectionState(next);
    }, []);

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

    const diffToOperations = useCallback((prev: string, next: string): Operation[] => {
        if (prev === next) return [];

        let prefix = 0;
        const minLen = Math.min(prev.length, next.length);
        while (prefix < minLen && prev[prefix] === next[prefix]) {
            prefix++;
        }

        let prevEnd = prev.length - 1;
        let nextEnd = next.length - 1;
        while (prevEnd >= prefix && nextEnd >= prefix && prev[prevEnd] === next[nextEnd]) {
            prevEnd--;
            nextEnd--;
        }

        const deleted = prev.slice(prefix, prevEnd + 1);
        const inserted = next.slice(prefix, nextEnd + 1);

        const ops: Operation[] = [];
        if (deleted.length > 0) {
            ops.push({ type: "delete", pos: prefix, len: deleted.length });
        }
        if (inserted.length > 0) {
            ops.push({ type: "insert", pos: prefix, text: inserted });
        }

        return ops;
    }, []);

    const emitOperations = useCallback(
        (ops: Operation[]) => {
            if (ops.length > 0) {
                onOperations?.(ops);
            }
        },
        [onOperations],
    );

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
            updateCursor({ line: 1, column: 1 });
            updateSelection(null);
            setIsDirty(false);
            undoStackRef.current = [];
            redoStackRef.current = [];
            prevInitialContentRef.current = initialContent;
            triggerUpdate();
        } else if (initialContent !== prevInitialContentRef.current) {
            // Content matches buffer but ref is stale (keystroke case), just update ref
            prevInitialContentRef.current = initialContent;
        }
    }, [initialContent, triggerUpdate, updateCursor, updateSelection]);

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
    const pushToHistory = useCallback((force = false) => {
        const now = Date.now();
        const timeSinceLastEdit = now - lastEditTimeRef.current;
        const shouldBatch = timeSinceLastEdit < HISTORY_BATCH_WINDOW && !force;

        if (!shouldBatch) {
            const entry: HistoryEntry = {
                snapshot: bufferRef.current.snapshot(),
                cursor: cursorRef.current,
                selection: selectionRef.current,
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
    }, []);

    // Insert text at cursor position
    const insertText = useCallback(
        (text: string) => {
            const buffer = bufferRef.current;
            const ops: Operation[] = [];
            const currentCursor = cursorRef.current;
            const currentSelection = selectionRef.current;
            let insertPosition = currentCursor;

            // Determine changedFromLine before any edits
            const changedFromLine =
                currentSelection && !isSelectionEmpty(currentSelection)
                    ? normalizeSelection(currentSelection).start.line
                    : currentCursor.line;

            // Delete selection first if present
            if (currentSelection && !isSelectionEmpty(currentSelection)) {
                const normalized = normalizeSelection(currentSelection);
                const startOffset = buffer.positionToOffset(normalized.start);
                const endOffset = buffer.positionToOffset(normalized.end);
                if (endOffset > startOffset) {
                    ops.push({ type: "delete", pos: startOffset, len: endOffset - startOffset });
                }
                buffer.delete(startOffset, endOffset - startOffset);
                insertPosition = normalized.start;
                updateCursor(normalized.start);
                updateSelection(null);
            }

            // Insert text
            const offset = buffer.positionToOffset(insertPosition);
            buffer.insert(offset, text);
            if (text.length > 0) {
                ops.push({ type: "insert", pos: offset, text });
            }

            // Move cursor after inserted text
            const newOffset = offset + text.length;
            const newCursor = buffer.offsetToPosition(newOffset);
            updateCursor(newCursor);
            setIsDirty(true);

            // Store edit metadata for incremental tokenization
            editMetadataRef.current = { changedFromLine, version: version + 1 };

            onChange?.(buffer.getText());
            emitOperations(ops);
            triggerUpdate();
        },
        [onChange, emitOperations, triggerUpdate, updateCursor, updateSelection, version],
    );

    // Delete backward (backspace)
    const deleteBackward = useCallback(() => {
        const buffer = bufferRef.current;
        const ops: Operation[] = [];
        const currentCursor = cursorRef.current;
        const currentSelection = selectionRef.current;

        // Determine changedFromLine before any edits
        const changedFromLine =
            currentSelection && !isSelectionEmpty(currentSelection)
                ? normalizeSelection(currentSelection).start.line
                : currentCursor.line;

        if (currentSelection && !isSelectionEmpty(currentSelection)) {
            // Delete selection
            const normalized = normalizeSelection(currentSelection);
            const startOffset = buffer.positionToOffset(normalized.start);
            const endOffset = buffer.positionToOffset(normalized.end);
            if (endOffset > startOffset) {
                ops.push({ type: "delete", pos: startOffset, len: endOffset - startOffset });
            }
            buffer.delete(startOffset, endOffset - startOffset);
            updateCursor(normalized.start);
            updateSelection(null);
        } else {
            // Delete character before cursor
            const offset = buffer.positionToOffset(currentCursor);
            if (offset > 0) {
                buffer.delete(offset - 1, 1);
                ops.push({ type: "delete", pos: offset - 1, len: 1 });
                const newCursor = buffer.offsetToPosition(offset - 1);
                updateCursor(newCursor);
            }
        }

        setIsDirty(true);

        // Store edit metadata for incremental tokenization
        editMetadataRef.current = { changedFromLine, version: version + 1 };

        onChange?.(buffer.getText());
        emitOperations(ops);
        triggerUpdate();
    }, [onChange, emitOperations, triggerUpdate, updateCursor, updateSelection, version]);

    // Delete forward (delete key)
    const deleteForward = useCallback(() => {
        const buffer = bufferRef.current;
        const ops: Operation[] = [];
        const currentCursor = cursorRef.current;
        const currentSelection = selectionRef.current;

        // Determine changedFromLine before any edits
        const changedFromLine =
            currentSelection && !isSelectionEmpty(currentSelection)
                ? normalizeSelection(currentSelection).start.line
                : currentCursor.line;

        if (currentSelection && !isSelectionEmpty(currentSelection)) {
            // Delete selection
            const normalized = normalizeSelection(currentSelection);
            const startOffset = buffer.positionToOffset(normalized.start);
            const endOffset = buffer.positionToOffset(normalized.end);
            if (endOffset > startOffset) {
                ops.push({ type: "delete", pos: startOffset, len: endOffset - startOffset });
            }
            buffer.delete(startOffset, endOffset - startOffset);
            updateCursor(normalized.start);
            updateSelection(null);
        } else {
            // Delete character after cursor
            const offset = buffer.positionToOffset(currentCursor);
            if (offset < buffer.getTotalLength()) {
                buffer.delete(offset, 1);
                ops.push({ type: "delete", pos: offset, len: 1 });
            }
        }

        setIsDirty(true);

        // Store edit metadata for incremental tokenization
        editMetadataRef.current = { changedFromLine, version: version + 1 };

        onChange?.(buffer.getText());
        emitOperations(ops);
        triggerUpdate();
    }, [onChange, emitOperations, triggerUpdate, updateCursor, updateSelection, version]);

    const applyRemoteOperations = useCallback(
        (ops: Operation[]) => {
            if (ops.length === 0) return;

            const buffer = bufferRef.current;
            const currentCursor = cursorRef.current;
            const currentSelection = selectionRef.current;
            let cursorOffset = buffer.positionToOffset(currentCursor);
            let selectionAnchorOffset: number | null = null;
            let selectionActiveOffset: number | null = null;

            if (currentSelection && !isSelectionEmpty(currentSelection)) {
                selectionAnchorOffset = buffer.positionToOffset(currentSelection.anchor);
                selectionActiveOffset = buffer.positionToOffset(currentSelection.active);
            }

            let changedFromLine = Number.MAX_SAFE_INTEGER;

            const adjustOffset = (offset: number, op: Operation): number => {
                if (op.type === "insert") {
                    const insertLen = op.text.length;
                    if (op.pos <= offset) {
                        return offset + insertLen;
                    }
                    return offset;
                }

                const deleteEnd = op.pos + op.len;
                if (op.pos >= offset) {
                    return offset;
                }
                if (deleteEnd <= offset) {
                    return offset - op.len;
                }
                return op.pos;
            };

            for (const op of ops) {
                const line = buffer.offsetToPosition(op.pos).line;
                changedFromLine = Math.min(changedFromLine, line);

                cursorOffset = adjustOffset(cursorOffset, op);
                if (selectionAnchorOffset !== null && selectionActiveOffset !== null) {
                    selectionAnchorOffset = adjustOffset(selectionAnchorOffset, op);
                    selectionActiveOffset = adjustOffset(selectionActiveOffset, op);
                }

                if (op.type === "insert") {
                    buffer.insert(op.pos, op.text);
                } else {
                    buffer.delete(op.pos, op.len);
                }
            }

            const newCursor = buffer.offsetToPosition(cursorOffset);
            updateCursor(newCursor);

            if (selectionAnchorOffset !== null && selectionActiveOffset !== null) {
                const anchor = buffer.offsetToPosition(selectionAnchorOffset);
                const active = buffer.offsetToPosition(selectionActiveOffset);
                updateSelection({ anchor, active });
            }

            setIsDirty(true);
            editMetadataRef.current = {
                changedFromLine: changedFromLine === Number.MAX_SAFE_INTEGER ? 1 : changedFromLine,
                version: version + 1,
            };

            onChange?.(buffer.getText());
            triggerUpdate();
        },
        [onChange, triggerUpdate, updateCursor, updateSelection, version],
    );

    // Move cursor in a direction
    const moveCursor = useCallback(
        (direction: CursorDirection, extend = false) => {
            const buffer = bufferRef.current;
            const currentCursor = cursorRef.current;
            const currentSelection = selectionRef.current;
            let newCursor = { ...currentCursor };

            switch (direction) {
                case "left":
                    if (currentCursor.column > 1) {
                        newCursor.column--;
                    } else if (currentCursor.line > 1) {
                        newCursor.line--;
                        newCursor.column = buffer.getLine(newCursor.line).length + 1;
                    }
                    break;

                case "right": {
                    const lineLength = buffer.getLine(currentCursor.line).length;
                    if (currentCursor.column <= lineLength) {
                        newCursor.column++;
                    } else if (currentCursor.line < buffer.getLineCount()) {
                        newCursor.line++;
                        newCursor.column = 1;
                    }
                    break;
                }

                case "up":
                    if (currentCursor.line > 1) {
                        newCursor.line--;
                        const lineLength = buffer.getLine(newCursor.line).length;
                        newCursor.column = Math.min(currentCursor.column, lineLength + 1);
                    }
                    break;

                case "down":
                    if (currentCursor.line < buffer.getLineCount()) {
                        newCursor.line++;
                        const lineLength = buffer.getLine(newCursor.line).length;
                        newCursor.column = Math.min(currentCursor.column, lineLength + 1);
                    }
                    break;

                case "lineStart":
                    newCursor.column = 1;
                    break;

                case "lineEnd":
                    newCursor.column = buffer.getLine(currentCursor.line).length + 1;
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
                    const lineContent = buffer.getLine(currentCursor.line);
                    let col = currentCursor.column - 2; // 0-indexed

                    if (col < 0) {
                        // Move to end of previous line
                        if (currentCursor.line > 1) {
                            newCursor.line--;
                            newCursor.column = buffer.getLine(newCursor.line).length + 1;
                        }
                        break;
                    }

                    const isWordChar = (char: string) => /\w/.test(char);

                    // Skip non-word characters (spaces, punctuation)
                    while (col >= 0 && !isWordChar(lineContent[col])) {
                        col--;
                    }
                    // Skip word characters
                    while (col >= 0 && isWordChar(lineContent[col])) {
                        col--;
                    }

                    newCursor.column = col + 2; // Back to 1-indexed
                    break;
                }

                case "wordRight": {
                    const lineContent = buffer.getLine(currentCursor.line);
                    let col = currentCursor.column - 1; // 0-indexed

                    if (col >= lineContent.length) {
                        // Move to start of next line
                        if (currentCursor.line < buffer.getLineCount()) {
                            newCursor.line++;
                            newCursor.column = 1;
                        }
                        break;
                    }

                    const isWordChar = (char: string) => /\w/.test(char);

                    if (isWordChar(lineContent[col])) {
                        // Move to end of current word
                        while (col < lineContent.length && isWordChar(lineContent[col])) {
                            col++;
                        }
                    } else {
                        // Skip separators to next word
                        while (col < lineContent.length && !isWordChar(lineContent[col])) {
                            col++;
                        }
                        // Move to end of next word
                        while (col < lineContent.length && isWordChar(lineContent[col])) {
                            col++;
                        }
                    }

                    newCursor.column = col + 1; // Back to 1-indexed
                    break;
                }
            }

            newCursor = clampCursor(newCursor);

            if (extend) {
                // Extend selection
                if (currentSelection) {
                    updateSelection({ anchor: currentSelection.anchor, active: newCursor });
                } else {
                    updateSelection({ anchor: currentCursor, active: newCursor });
                }
            } else {
                // Clear selection
                updateSelection(null);
            }

            updateCursor(newCursor);
            triggerUpdate();
        },
        [clampCursor, triggerUpdate, updateCursor, updateSelection],
    );

    // Move cursor to a specific position
    const moveCursorTo = useCallback(
        (position: CursorPosition, extend = false) => {
            const newCursor = clampCursor(position);
            const currentCursor = cursorRef.current;
            const currentSelection = selectionRef.current;

            if (extend) {
                if (currentSelection) {
                    updateSelection({ anchor: currentSelection.anchor, active: newCursor });
                } else {
                    updateSelection({ anchor: currentCursor, active: newCursor });
                }
            } else {
                updateSelection(null);
            }

            updateCursor(newCursor);
            triggerUpdate();
        },
        [clampCursor, triggerUpdate, updateCursor, updateSelection],
    );

    // Select all text
    const selectAll = useCallback(() => {
        const buffer = bufferRef.current;
        const lastLine = buffer.getLineCount();
        const lastLineLength = buffer.getLine(lastLine).length;

        if (lastLine === 1 && lastLineLength === 0) {
            updateSelection(null);
            updateCursor({ line: 1, column: 1 });
            triggerUpdate();
            return;
        }

        const lastColumn = lastLineLength + 1;

        updateSelection({
            anchor: { line: 1, column: 1 },
            active: { line: lastLine, column: lastColumn },
        });
        updateCursor({ line: lastLine, column: lastColumn });
        triggerUpdate();
    }, [triggerUpdate, updateCursor, updateSelection]);

    // Undo
    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) return;

        const prevContent = bufferRef.current.getText();

        // Save current state to redo stack
        redoStackRef.current.push({
            snapshot: bufferRef.current.snapshot(),
            cursor: cursorRef.current,
            selection: selectionRef.current,
            timestamp: Date.now(),
        });

        // Restore from undo stack
        const entry = undoStackRef.current.pop()!;
        bufferRef.current.restore(entry.snapshot);
        updateCursor(entry.cursor);
        updateSelection(entry.selection);
        setIsDirty(true);

        // Full re-tokenization needed after undo
        editMetadataRef.current = { changedFromLine: 1, version: version + 1 };

        const nextContent = bufferRef.current.getText();
        onChange?.(nextContent);
        emitOperations(diffToOperations(prevContent, nextContent));
        triggerUpdate();
    }, [onChange, emitOperations, diffToOperations, triggerUpdate, updateCursor, updateSelection, version]);

    // Redo
    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) return;

        const prevContent = bufferRef.current.getText();

        // Save current state to undo stack
        undoStackRef.current.push({
            snapshot: bufferRef.current.snapshot(),
            cursor: cursorRef.current,
            selection: selectionRef.current,
            timestamp: Date.now(),
        });

        // Restore from redo stack
        const entry = redoStackRef.current.pop()!;
        bufferRef.current.restore(entry.snapshot);
        updateCursor(entry.cursor);
        updateSelection(entry.selection);
        setIsDirty(true);

        // Full re-tokenization needed after redo
        editMetadataRef.current = { changedFromLine: 1, version: version + 1 };

        const nextContent = bufferRef.current.getText();
        onChange?.(nextContent);
        emitOperations(diffToOperations(prevContent, nextContent));
        triggerUpdate();
    }, [onChange, emitOperations, diffToOperations, triggerUpdate, updateCursor, updateSelection, version]);

    // Execute a command
    const executeCommand = useCallback(
        (command: EditorCommand) => {
            const currentSelection = selectionRef.current;
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
                    if (currentSelection && !isSelectionEmpty(currentSelection)) {
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
                    if (currentSelection && !isSelectionEmpty(currentSelection)) {
                        deleteBackward();
                    }
                    break;
            }
        },
        [pushToHistory, insertText, deleteBackward, deleteForward, moveCursor, moveCursorTo, selectAll, undo, redo],
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
            updateCursor(clampCursor(position));
            triggerUpdate();
        },
        [clampCursor, triggerUpdate, updateCursor],
    );

    // Direct selection setter (for mouse handling)
    const setSelection = useCallback(
        (newSelection: Selection | null) => {
            if (newSelection) {
                const clampedAnchor = clampCursor(newSelection.anchor);
                const clampedActive = clampCursor(newSelection.active);
                updateSelection({ anchor: clampedAnchor, active: clampedActive });
                updateCursor(clampedActive);
            } else {
                updateSelection(null);
            }
            triggerUpdate();
        },
        [clampCursor, triggerUpdate, updateCursor, updateSelection],
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
            applyRemoteOperations,
            setCursor,
            setSelection,
            getEditMetadata: () => editMetadataRef.current,
            clearEditMetadata: () => {
                editMetadataRef.current = null;
            },
        }),
        [
            cursor,
            selection,
            isDirty,
            version,
            config,
            getSelectedText,
            executeCommand,
            applyRemoteOperations,
            setCursor,
            setSelection,
        ],
    );
}

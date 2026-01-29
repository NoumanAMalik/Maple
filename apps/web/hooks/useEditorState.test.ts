import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorState } from "./useEditorState";

describe("useEditorState", () => {
    describe("Initialization", () => {
        it("should initialize with empty content", () => {
            const { result } = renderHook(() => useEditorState());

            expect(result.current.getContent()).toBe("");
            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection).toBeNull();
            expect(result.current.isDirty).toBe(false);
            expect(result.current.version).toBe(0);
        });

        it("should initialize with provided content", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello\nWorld" }));

            expect(result.current.getContent()).toBe("Hello\nWorld");
            expect(result.current.getLineCount()).toBe(2);
            expect(result.current.getLine(1)).toBe("Hello");
            expect(result.current.getLine(2)).toBe("World");
        });

        it("should initialize with custom config", () => {
            const { result } = renderHook(() =>
                useEditorState({
                    config: { fontSize: 16, lineHeight: 24 },
                }),
            );

            expect(result.current.config.fontSize).toBe(16);
            expect(result.current.config.lineHeight).toBe(24);
        });
    });

    describe("Text Insertion", () => {
        it("should insert text at cursor", () => {
            const onChange = vi.fn();
            const { result } = renderHook(() => useEditorState({ onChange }));

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            expect(result.current.getContent()).toBe("Hello");
            expect(result.current.cursor).toEqual({ line: 1, column: 6 });
            expect(result.current.isDirty).toBe(true);
            expect(onChange).toHaveBeenCalledWith("Hello");
        });

        it("should insert text with newlines", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Line 1\nLine 2" });
            });

            expect(result.current.getContent()).toBe("Line 1\nLine 2");
            expect(result.current.getLineCount()).toBe(2);
            expect(result.current.cursor).toEqual({ line: 2, column: 7 });
        });

        it("should replace selection when inserting", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                // Select "World"
                result.current.setSelection({
                    anchor: { line: 1, column: 7 },
                    active: { line: 1, column: 12 },
                });
                // Move cursor to active position
                result.current.setCursor({ line: 1, column: 12 });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Claude" });
            });

            expect(result.current.getContent()).toBe("Hello Claude");
            expect(result.current.selection).toBeNull();
        });

        it("should trigger onChange callback", () => {
            const onChange = vi.fn();
            const { result } = renderHook(() => useEditorState({ onChange }));

            act(() => {
                result.current.executeCommand({ type: "insert", text: "test" });
            });

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith("test");
        });
    });

    describe("Text Deletion", () => {
        it("should delete backward (backspace)", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 6 });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe("Hell");
            expect(result.current.cursor).toEqual({ line: 1, column: 5 });
        });

        it("should not delete backward at start of document", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe("Hello");
        });

        it("should delete forward (delete key)", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteForward" });
            });

            expect(result.current.getContent()).toBe("ello");
            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
        });

        it("should delete selection with deleteBackward", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 6 },
                });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe(" World");
            expect(result.current.selection).toBeNull();
        });

        it("should delete selection with deleteForward", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 7 },
                    active: { line: 1, column: 12 },
                });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteForward" });
            });

            expect(result.current.getContent()).toBe("Hello ");
        });
    });

    describe("Cursor Movement", () => {
        beforeEach(() => {
            // Helper for cursor movement tests
        });

        it("should move cursor left", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 5 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "left" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 4 });
        });

        it("should move cursor right", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "right" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 2 });
        });

        it("should move cursor up", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.setCursor({ line: 2, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "up" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
        });

        it("should move cursor down", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "down" });
            });

            expect(result.current.cursor).toEqual({ line: 2, column: 1 });
        });

        it("should move cursor to line start", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 7 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "lineStart" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
        });

        it("should move cursor to line end", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "lineEnd" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 6 });
        });

        it("should move cursor to document start", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }));

            act(() => {
                result.current.setCursor({ line: 3, column: 5 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "documentStart" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
        });

        it("should move cursor to document end", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "documentEnd" });
            });

            expect(result.current.cursor).toEqual({ line: 3, column: 7 });
        });

        it("should wrap cursor to previous line when moving left at line start", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.setCursor({ line: 2, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "left" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 7 });
        });

        it("should wrap cursor to next line when moving right at line end", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 7 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "right" });
            });

            expect(result.current.cursor).toEqual({ line: 2, column: 1 });
        });

        it("should move by word left", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World Test" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 17 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "wordLeft" });
            });

            expect(result.current.cursor.column).toBeLessThan(17);
        });

        it("should move by word right", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World Test" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "wordRight" });
            });

            expect(result.current.cursor.column).toBeGreaterThan(1);
        });
    });

    describe("Selection", () => {
        it("should extend selection when moving with extend flag", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "right",
                    extend: true,
                });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection?.active).toEqual({ line: 1, column: 2 });
        });

        it("should clear selection when moving without extend", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 6 },
                });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "right" });
            });

            expect(result.current.selection).toBeNull();
        });

        it("should select all text", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }));

            act(() => {
                result.current.executeCommand({ type: "selectAll" });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection?.active).toEqual({ line: 3, column: 7 });
        });

        it("should get selected text", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 6 },
                });
            });

            expect(result.current.getSelectedText()).toBe("Hello");
        });

        it("should return empty string when no selection", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            expect(result.current.getSelectedText()).toBe("");
        });

        it("should handle moveCursorTo command", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.executeCommand({
                    type: "moveCursorTo",
                    position: { line: 1, column: 7 },
                });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 7 });
        });

        it("should extend selection with moveCursorTo", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 1 });
            });

            act(() => {
                result.current.executeCommand({
                    type: "moveCursorTo",
                    position: { line: 1, column: 6 },
                    extend: true,
                });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection?.active).toEqual({ line: 1, column: 6 });
        });

        it("should clear selection when setSelection receives null", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 6 },
                });
            });

            act(() => {
                result.current.setSelection(null);
            });

            expect(result.current.selection).toBeNull();
        });
    });

    describe("Undo/Redo", () => {
        it("should undo insert operation", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            expect(result.current.getContent()).toBe("Hello");

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");
        });

        it("should redo insert operation", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");

            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.getContent()).toBe("Hello");
        });

        it("should restore cursor position on undo", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            const cursorAfterInsert = result.current.cursor;

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 1 });

            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.cursor).toEqual(cursorAfterInsert);
        });

        it("should clear redo stack on new edit", async () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            // Wait for history batching window to pass (300ms)
            await new Promise((resolve) => setTimeout(resolve, 350));

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");

            // Wait again for history batching
            await new Promise((resolve) => setTimeout(resolve, 350));

            act(() => {
                result.current.executeCommand({ type: "insert", text: "World" });
            });

            expect(result.current.getContent()).toBe("World");

            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            // Redo should have no effect because redo stack was cleared by the "World" insert
            // Content should still be "World"
            expect(result.current.getContent()).toBe("World");
        });

        it("should do nothing when undo stack is empty", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");
        });

        it("should do nothing when redo stack is empty", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.getContent()).toBe("");
        });

        it("should emit diff operations for undo/redo replacements", () => {
            const onOperations = vi.fn();
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World", onOperations }),
            );

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 7 },
                    active: { line: 1, column: 12 },
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "You" });
            });

            onOperations.mockClear();

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(onOperations).toHaveBeenCalledTimes(1);
            const undoOps = onOperations.mock.calls[0][0];
            expect(undoOps).toHaveLength(2);
            expect(undoOps.map((op: { type: string }) => op.type)).toEqual(["delete", "insert"]);

            onOperations.mockClear();

            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(onOperations).toHaveBeenCalledTimes(1);
            const redoOps = onOperations.mock.calls[0][0];
            expect(redoOps).toHaveLength(2);
            expect(redoOps.map((op: { type: string }) => op.type)).toEqual(["delete", "insert"]);
        });
    });

    describe("Paste and Cut", () => {
        it("should handle paste command", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "paste", text: "Pasted text" });
            });

            expect(result.current.getContent()).toBe("Pasted text");
        });

        it("should handle cut command with selection", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 6 },
                });
            });

            act(() => {
                result.current.executeCommand({ type: "cut" });
            });

            expect(result.current.getContent()).toBe(" World");
            expect(result.current.selection).toBeNull();
        });

        it("should do nothing on cut without selection", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.executeCommand({ type: "cut" });
            });

            expect(result.current.getContent()).toBe("Hello World");
        });

        it("should not emit operations for empty insert", () => {
            const onOperations = vi.fn();
            const { result } = renderHook(() => useEditorState({ onOperations }));

            act(() => {
                result.current.executeCommand({ type: "insert", text: "" });
            });

            expect(onOperations).not.toHaveBeenCalled();
        });
    });

    describe("Remote Operations", () => {
        it("should ignore empty remote operations", () => {
            const onChange = vi.fn();
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello", onChange }),
            );

            act(() => {
                result.current.applyRemoteOperations([]);
            });

            expect(result.current.getContent()).toBe("Hello");
            expect(onChange).not.toHaveBeenCalled();
        });

        it("should apply remote insert and adjust cursor/selection", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "abc\ndef" }),
            );

            act(() => {
                result.current.setCursor({ line: 1, column: 2 });
                result.current.setSelection({
                    anchor: { line: 1, column: 2 },
                    active: { line: 1, column: 3 },
                });
            });

            act(() => {
                result.current.applyRemoteOperations([{ type: "insert", pos: 0, text: "Z" }]);
            });

            expect(result.current.getContent()).toBe("Zabc\ndef");
            expect(result.current.cursor).toEqual({ line: 1, column: 3 });
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 3 });
            expect(result.current.selection?.active).toEqual({ line: 1, column: 4 });
            expect(result.current.getEditMetadata()?.changedFromLine).toBe(1);
        });

        it("should adjust cursor for remote deletes across branches", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "abcdef" }));

            act(() => {
                result.current.setCursor({ line: 1, column: 4 });
            });

            act(() => {
                result.current.applyRemoteOperations([
                    { type: "delete", pos: 5, len: 1 }, // delete after cursor
                    { type: "delete", pos: 0, len: 1 }, // delete before cursor
                    { type: "delete", pos: 1, len: 2 }, // delete covering cursor
                ]);
            });

            expect(result.current.getContent()).toBe("be");
            expect(result.current.cursor).toEqual({ line: 1, column: 2 });
        });
    });

    describe("Query Methods", () => {
        it("should get content", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            expect(result.current.getContent()).toBe("Hello World");
        });

        it("should get line", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            expect(result.current.getLine(1)).toBe("Line 1");
            expect(result.current.getLine(2)).toBe("Line 2");
        });

        it("should get line count", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }));

            expect(result.current.getLineCount()).toBe(3);
        });

        it("should get line length", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            expect(result.current.getLineLength(1)).toBe(5);
        });
    });

    describe("Tab Switching", () => {
        it("should reset state when initialContent changes to different content", () => {
            const { result, rerender } = renderHook(({ content }) => useEditorState({ initialContent: content }), {
                initialProps: { content: "Original" },
            });

            // Move cursor to end before inserting
            act(() => {
                result.current.setCursor({ line: 1, column: 9 }); // After "Original"
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: " edited" });
            });

            expect(result.current.getContent()).toBe("Original edited");

            // Simulate tab switch
            rerender({ content: "New tab content" });

            expect(result.current.getContent()).toBe("New tab content");
            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
            expect(result.current.isDirty).toBe(false);
        });

        it("should not reset when initialContent matches current buffer", () => {
            const { result, rerender } = renderHook(({ content }) => useEditorState({ initialContent: content }), {
                initialProps: { content: "Test" },
            });

            // Move cursor to end before inserting
            act(() => {
                result.current.setCursor({ line: 1, column: 5 }); // After "Test"
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "ing" });
            });

            expect(result.current.getContent()).toBe("Testing");

            // Rerender with content that matches buffer (simulating onChange callback)
            rerender({ content: "Testing" });

            // Should not reset
            expect(result.current.getContent()).toBe("Testing");
            expect(result.current.isDirty).toBe(true);
        });
    });

    describe("Version Updates", () => {
        it("should increment version on changes", () => {
            const { result } = renderHook(() => useEditorState());

            const initialVersion = result.current.version;

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            expect(result.current.version).toBeGreaterThan(initialVersion);
        });

        it("should increment version on cursor movement", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            const initialVersion = result.current.version;

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "right" });
            });

            expect(result.current.version).toBeGreaterThan(initialVersion);
        });
    });

    describe("Cursor Clamping", () => {
        it("should clamp cursor to document bounds", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello" }));

            act(() => {
                result.current.setCursor({ line: 10, column: 50 });
            });

            expect(result.current.cursor.line).toBe(1);
            expect(result.current.cursor.column).toBeLessThanOrEqual(6);
        });

        it("should clamp cursor to line bounds", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Short\nVery long line here" }));

            // Move to long line
            act(() => {
                result.current.setCursor({ line: 2, column: 15 });
            });

            // Move up to short line - column should be clamped
            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "up" });
            });

            expect(result.current.cursor.line).toBe(1);
            expect(result.current.cursor.column).toBeLessThanOrEqual(6);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty document", () => {
            const { result } = renderHook(() => useEditorState());

            expect(result.current.getContent()).toBe("");
            expect(result.current.getLineCount()).toBe(1);
            expect(result.current.getLine(1)).toBe("");
        });

        it("should handle very long content", () => {
            const longContent = "x".repeat(10000);
            const { result } = renderHook(() => useEditorState({ initialContent: longContent }));

            expect(result.current.getContent().length).toBe(10000);
        });

        it("should handle unicode content", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello 世界 🌍" }));

            expect(result.current.getContent()).toBe("Hello 世界 🌍");
        });

        it("should handle deleteSelection command", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.setSelection({
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 6 },
                });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe(" World");
        });

        it("should handle deleteSelection with no selection", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("Hello World");
        });
    });

    describe("Branch Coverage Tests", () => {
        it("should detect tab switching when initialContent changes", () => {
            const { result, rerender } = renderHook(({ content }) => useEditorState({ initialContent: content }), {
                initialProps: { content: "First tab" },
            });

            expect(result.current.getContent()).toBe("First tab");

            rerender({ content: "Second tab" });
            expect(result.current.getContent()).toBe("Second tab");
        });

        it("should batch history at exactly 300ms boundary", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "A" });
            });

            act(() => {
                vi.advanceTimersByTime(299);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "B" });
            });

            act(() => {
                vi.advanceTimersByTime(1);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "C" });
            });

            expect(result.current.getContent()).toBe("ABC");

            vi.useRealTimers();
        });

        it("should handle word navigation at line boundaries", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "First line\nSecond line" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "wordRight" });
            });

            expect(result.current.cursor.column).toBeGreaterThan(1);

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 1, column: 11 } });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "wordRight" });
            });

            expect(result.current.cursor.line).toBe(2);
        });

        it("should clamp cursor at document edges", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 0, column: 0 } });
            });

            expect(result.current.cursor.line).toBe(1);
            expect(result.current.cursor.column).toBe(1);

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 100, column: 100 } });
            });

            const lastLine = result.current.getLineCount();
            expect(result.current.cursor.line).toBe(lastLine);
        });

        it("should handle select all with empty document", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "selectAll" });
            });

            expect(result.current.selection).toBeNull();
        });

        it("should handle moveCursorTo with extend selection", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 1, column: 6 }, extend: true });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection?.active).toEqual({ line: 1, column: 6 });
        });

        it("should respect history stack max size (1000 entries)", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            for (let i = 0; i < 1005; i++) {
                act(() => {
                    result.current.executeCommand({ type: "insert", text: "x" });
                });

                if (i < 1004) {
                    act(() => {
                        vi.advanceTimersByTime(301);
                    });
                }
            }

            let undoCount = 0;
            const maxUndos = 2000;
            while (undoCount < maxUndos) {
                const contentBefore2 = result.current.getContent();
                act(() => {
                    result.current.executeCommand({ type: "undo" });
                });
                // Stop if content didn't change (no more undo history)
                if (result.current.getContent() === contentBefore2) break;
                undoCount++;
            }

            expect(undoCount).toBeLessThanOrEqual(1000);
            vi.useRealTimers();
        });

        it("should handle history overflow behavior", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            for (let i = 0; i < 1100; i++) {
                act(() => {
                    result.current.executeCommand({ type: "insert", text: `${i}` });
                });
                act(() => {
                    vi.advanceTimersByTime(301);
                });
            }

            let undoCount = 0;
            const maxUndos = 1500;
            while (undoCount < maxUndos) {
                const contentBefore = result.current.getContent();
                act(() => {
                    result.current.executeCommand({ type: "undo" });
                });
                // Stop if content didn't change (no more undo history)
                if (result.current.getContent() === contentBefore) break;
                undoCount++;
            }

            expect(undoCount).toBeLessThanOrEqual(1000);
            vi.useRealTimers();
        });

        it("should handle select all with large document", () => {
            const largeContent = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`).join("\n");
            const { result } = renderHook(() => useEditorState({ initialContent: largeContent }));

            act(() => {
                result.current.executeCommand({ type: "selectAll" });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection?.active.line).toBe(1000);
        });

        it("should handle cursor movement with very long lines", () => {
            const longLine = "a".repeat(10000);
            const { result } = renderHook(() => useEditorState({ initialContent: longLine }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 1, column: 5000 } });
            });

            expect(result.current.cursor.column).toBe(5000);

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "right" });
            });

            expect(result.current.cursor.column).toBe(5001);
        });

        it("should handle selection across multiple lines with extend", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2\nLine 3\nLine 4" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 1, column: 1 } });
            });

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 4, column: 1 }, extend: true });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.selection?.anchor).toEqual({ line: 1, column: 1 });
            expect(result.current.selection?.active).toEqual({ line: 4, column: 1 });
        });

        it("should handle delete at document start", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Hello World" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 1, column: 1 } });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteForward" });
            });

            expect(result.current.getContent()).toBe("ello World");
        });

        it("should handle delete at line boundaries", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 1, column: 7 } });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteForward" });
            });

            expect(result.current.getContent()).toBe("Line 1Line 2");
        });

        it("should handle backspace at line boundaries", () => {
            const { result } = renderHook(() => useEditorState({ initialContent: "Line 1\nLine 2" }));

            act(() => {
                result.current.executeCommand({ type: "moveCursorTo", position: { line: 2, column: 1 } });
            });

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe("Line 1Line 2");
        });
    });

    describe("Edit Metadata", () => {
        it("should clear edit metadata when requested", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            expect(result.current.getEditMetadata()).not.toBeNull();

            act(() => {
                result.current.clearEditMetadata();
            });

            expect(result.current.getEditMetadata()).toBeNull();
        });
    });
});

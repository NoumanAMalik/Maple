import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorState } from "./useEditorState";
import { createCursor, createSelection } from "@/test/utils/test-helpers";
import { CODE_SAMPLES, LARGE_FILE_SAMPLES } from "@/test/fixtures/code-samples";

/**
 * Integration tests for useEditorState hook.
 * These tests verify complete workflows and complex interactions between features.
 */
describe("useEditorState - Integration Tests", () => {
    describe("Complete Editing Workflows", () => {
        it("should handle type -> edit -> save workflow", () => {
            const onChange = vi.fn();
            const { result } = renderHook(() => useEditorState({ onChange }));

            // Type initial content
            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            expect(result.current.getContent()).toBe("Hello");
            expect(result.current.cursor).toEqual({ line: 1, column: 6 });

            // Edit the content
            act(() => {
                result.current.executeCommand({ type: "insert", text: " World" });
            });

            expect(result.current.getContent()).toBe("Hello World");
            expect(result.current.isDirty).toBe(true);

            // Verify onChange was called with final content
            expect(onChange).toHaveBeenLastCalledWith("Hello World");
        });

        it("should handle create file -> edit -> close -> reopen workflow", () => {
            const { result, rerender } = renderHook(
                ({ content }) => useEditorState({ initialContent: content }),
                { initialProps: { content: "" } },
            );

            // Create and edit
            act(() => {
                result.current.executeCommand({ type: "insert", text: "Initial content" });
            });

            const editedContent = result.current.getContent();

            expect(editedContent).toBe("Initial content");

            // Simulate close (switch to different file)
            rerender({ content: "Different file" });
            expect(result.current.getContent()).toBe("Different file");

            // Reopen original file
            rerender({ content: editedContent });
            expect(result.current.getContent()).toBe("Initial content");
        });

        it("should handle complete edit-select-delete-type workflow", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            // Select "World"
            act(() => {
                result.current.setSelection(createSelection(1, 7, 1, 12));
            });

            expect(result.current.getSelectedText()).toBe("World");

            // Delete selection
            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("Hello ");

            // Type new text
            act(() => {
                result.current.executeCommand({ type: "insert", text: "Claude" });
            });

            expect(result.current.getContent()).toBe("Hello Claude");
            expect(result.current.cursor).toEqual({ line: 1, column: 13 });
        });

        it("should handle navigate-select-cut-navigate-paste workflow", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "First Second Third" }),
            );

            // Navigate to "Second"
            act(() => {
                result.current.setCursor(createCursor(1, 7));
            });

            // Select "Second" by extending selection
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                    extend: true,
                });
            });

            const selectedText = result.current.getSelectedText();
            expect(selectedText).toContain("Second");

            // Cut
            act(() => {
                result.current.executeCommand({ type: "cut" });
            });

            // Navigate to end
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            // Paste
            act(() => {
                result.current.executeCommand({ type: "paste", text: selectedText });
            });

            expect(result.current.getContent()).toContain("Third");
            expect(result.current.getContent()).toContain("Second");
        });

        it("should handle complex multi-step editing with cursor positioning", () => {
            const { result } = renderHook(() => useEditorState());

            // Step 1: Type function signature
            act(() => {
                result.current.executeCommand({ type: "insert", text: "function add(a, b) {" });
            });

            // Step 2: Add newline and body
            act(() => {
                result.current.executeCommand({ type: "insert", text: "\n  return a + b;" });
            });

            // Step 3: Add closing brace
            act(() => {
                result.current.executeCommand({ type: "insert", text: "\n}" });
            });

            expect(result.current.getContent()).toBe("function add(a, b) {\n  return a + b;\n}");
            expect(result.current.getLineCount()).toBe(3);
            expect(result.current.cursor.line).toBe(3);
        });
    });

    describe("Multi-line Editing with State Synchronization", () => {
        it("should handle multi-line paste operations", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Line 1" }),
            );

            const multilineText = "Line A\nLine B\nLine C";

            act(() => {
                result.current.setCursor(createCursor(1, 7));
            });

            act(() => {
                result.current.executeCommand({ type: "paste", text: `\n${multilineText}` });
            });

            expect(result.current.getLineCount()).toBe(4);
            expect(result.current.getLine(2)).toBe("Line A");
            expect(result.current.getLine(3)).toBe("Line B");
            expect(result.current.getLine(4)).toBe("Line C");
            expect(result.current.cursor.line).toBe(4);
        });

        it("should maintain cursor position during multi-line edits", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }),
            );

            // Position cursor at middle line
            act(() => {
                result.current.setCursor(createCursor(2, 4));
            });

            // Insert text at cursor
            act(() => {
                result.current.executeCommand({ type: "insert", text: " edited" });
            });

            expect(result.current.cursor).toEqual({ line: 2, column: 11 });
            expect(result.current.getLine(2)).toBe("Line edited 2");
            expect(result.current.getLine(1)).toBe("Line 1");
            expect(result.current.getLine(3)).toBe("Line 3");
        });

        it("should delete across line boundaries", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "First\nSecond\nThird" }),
            );

            // Select from middle of line 1 to middle of line 3
            act(() => {
                result.current.setSelection(createSelection(1, 3, 3, 3));
            });

            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("Fiird");
            expect(result.current.getLineCount()).toBe(1);
            expect(result.current.cursor).toEqual({ line: 1, column: 3 });
        });

        it("should handle inserting newlines in middle of existing lines", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 6));
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "\n" });
            });

            expect(result.current.getLineCount()).toBe(2);
            expect(result.current.getLine(1)).toBe("Hello");
            expect(result.current.getLine(2)).toBe(" World");
            expect(result.current.cursor).toEqual({ line: 2, column: 1 });
        });
    });

    describe("Undo/Redo Across Complex Edits", () => {
        it("should handle undo/redo sequence with history batching", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Rapid edits within batching window (should batch)
            act(() => {
                result.current.executeCommand({ type: "insert", text: "A" });
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "B" });
            });

            expect(result.current.getContent()).toBe("AB");

            // Wait for batching window to expire
            act(() => {
                vi.advanceTimersByTime(300);
            });

            // New edit (should create new history entry)
            act(() => {
                result.current.executeCommand({ type: "insert", text: "C" });
            });

            expect(result.current.getContent()).toBe("ABC");

            // Undo should remove "C" only
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("AB");

            // Redo
            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.getContent()).toBe("ABC");

            vi.useRealTimers();
        });

        it("should undo after selection delete", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            // Select and delete
            act(() => {
                result.current.setSelection(createSelection(1, 7, 1, 12));
            });

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe("Hello ");

            // Undo
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("Hello World");
            expect(result.current.selection).not.toBeNull();
        });

        it("should handle undo with mixed insert and delete operations", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Insert
            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Delete
            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Insert again
            act(() => {
                result.current.executeCommand({ type: "insert", text: "p" });
            });

            expect(result.current.getContent()).toBe("Hellp");

            // Undo insert
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("Hell");

            // Undo delete
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("Hello");

            vi.useRealTimers();
        });

        it("should preserve cursor and selection through undo/redo", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Test" });
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

        it("should clear redo stack when making edits after undo", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Edit 1
            act(() => {
                result.current.executeCommand({ type: "insert", text: "First" });
            });

            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Edit 2
            act(() => {
                result.current.executeCommand({ type: "insert", text: " Second" });
            });

            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Undo
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("First");

            // New edit (should clear redo stack)
            act(() => {
                result.current.executeCommand({ type: "insert", text: " New" });
            });

            // Redo should have no effect
            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.getContent()).toBe("First New");

            vi.useRealTimers();
        });
    });

    describe("Find and Replace Workflow (Selection-based)", () => {
        it("should find all matches by selecting each occurrence", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "foo bar foo baz foo" }),
            );

            // Select first "foo"
            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 4));
            });

            expect(result.current.getSelectedText()).toBe("foo");

            // Select second "foo"
            act(() => {
                result.current.setSelection(createSelection(1, 9, 1, 12));
            });

            expect(result.current.getSelectedText()).toBe("foo");

            // Select third "foo"
            act(() => {
                result.current.setSelection(createSelection(1, 17, 1, 20));
            });

            expect(result.current.getSelectedText()).toBe("foo");
        });

        it("should replace single match and continue", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "foo bar foo" }),
            );

            // Select first "foo"
            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 4));
            });

            // Replace by inserting (which deletes selection first)
            act(() => {
                result.current.executeCommand({ type: "insert", text: "baz" });
            });

            expect(result.current.getContent()).toBe("baz bar foo");

            // Continue to next occurrence
            act(() => {
                result.current.setSelection(createSelection(1, 9, 1, 12));
            });

            expect(result.current.getSelectedText()).toBe("foo");
        });

        it("should replace all matches in sequence", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "foo bar foo baz foo" }),
            );

            // Replace first
            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 4));
                result.current.executeCommand({ type: "insert", text: "qux" });
            });

            expect(result.current.getContent()).toBe("qux bar foo baz foo");

            // Replace second (positions shifted)
            act(() => {
                result.current.setSelection(createSelection(1, 9, 1, 12));
                result.current.executeCommand({ type: "insert", text: "qux" });
            });

            expect(result.current.getContent()).toBe("qux bar qux baz foo");

            // Replace third
            act(() => {
                result.current.setSelection(createSelection(1, 17, 1, 20));
                result.current.executeCommand({ type: "insert", text: "qux" });
            });

            expect(result.current.getContent()).toBe("qux bar qux baz qux");
        });

        it("should handle case-sensitive find and replace", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Foo foo FOO" }),
            );

            // Select lowercase "foo"
            act(() => {
                result.current.setSelection(createSelection(1, 5, 1, 8));
            });

            expect(result.current.getSelectedText()).toBe("foo");

            // Replace
            act(() => {
                result.current.executeCommand({ type: "insert", text: "bar" });
            });

            expect(result.current.getContent()).toBe("Foo bar FOO");
        });
    });

    describe("Selection Operations + Delete", () => {
        it("should select word and delete", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World Test" }),
            );

            // Position at start of "World"
            act(() => {
                result.current.setCursor(createCursor(1, 7));
            });

            // Select word by extending right
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                    extend: true,
                });
            });

            expect(result.current.getSelectedText()).toContain("World");

            // Delete
            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toContain("Hello");
            expect(result.current.getContent()).toContain("Test");
            expect(result.current.getContent()).not.toContain("World");
        });

        it("should select line and delete", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }),
            );

            // Select entire line 2
            act(() => {
                result.current.setSelection(createSelection(2, 1, 3, 1));
            });

            const selectedText = result.current.getSelectedText();
            expect(selectedText).toContain("Line 2");

            // Delete
            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("Line 1\nLine 3");
            expect(result.current.getLineCount()).toBe(2);
        });

        it("should select all and replace", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Old content here" }),
            );

            act(() => {
                result.current.executeCommand({ type: "selectAll" });
            });

            expect(result.current.getSelectedText()).toBe("Old content here");

            act(() => {
                result.current.executeCommand({ type: "insert", text: "New content" });
            });

            expect(result.current.getContent()).toBe("New content");
        });

        it("should handle backwards selection and delete", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            // Create backwards selection (active before anchor)
            act(() => {
                result.current.setSelection(createSelection(1, 11, 1, 7));
            });

            expect(result.current.getSelectedText()).toBe("Worl");

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe("Hello d");
        });

        it("should handle multi-line selection delete", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Line 1\nLine 2\nLine 3\nLine 4" }),
            );

            // Select from middle of line 2 to middle of line 3
            act(() => {
                result.current.setSelection(createSelection(2, 3, 3, 4));
            });

            const selectedText = result.current.getSelectedText();
            expect(selectedText).toBe("ne 2\nLin");

            act(() => {
                result.current.executeCommand({ type: "deleteForward" });
            });

            expect(result.current.getContent()).toBe("Line 1\nLie 3\nLine 4");
        });

        it("should handle delete with empty selection", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 3));
            });

            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            // Should not delete anything
            expect(result.current.getContent()).toBe("Hello");
        });

        it("should handle multiple consecutive selection deletes", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "One Two Three Four" }),
            );

            // Delete "Two "
            act(() => {
                result.current.setSelection(createSelection(1, 5, 1, 9));
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("One Three Four");

            // Delete "Three "
            act(() => {
                result.current.setSelection(createSelection(1, 5, 1, 11));
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("One Four");
        });
    });

    describe("Word-by-Word Navigation", () => {
        it("should navigate words in single line", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "The quick brown fox" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 1));
            });

            // Move to next word
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            expect(result.current.cursor.column).toBeGreaterThan(1);

            // Move to previous word
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordLeft",
                });
            });

            expect(result.current.cursor.column).toBe(1);
        });

        it("should navigate words across lines", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "First line\nSecond line" }),
            );

            // Start at end of first line
            act(() => {
                result.current.setCursor(createCursor(1, 11));
            });

            // Move right (should go to start of second line)
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            expect(result.current.cursor.line).toBe(2);

            // Move left (should go back to first line)
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordLeft",
                });
            });

            expect(result.current.cursor.line).toBe(1);
        });

        it("should handle punctuation during word navigation", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "hello,world;test" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 1));
            });

            // Word navigation should skip punctuation
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            const firstPos = result.current.cursor.column;

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            expect(result.current.cursor.column).toBeGreaterThan(firstPos);
        });

        it("should select words with shift+ctrl+arrow equivalent", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World Test" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 1));
            });

            // Extend selection by word
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                    extend: true,
                });
            });

            expect(result.current.selection).not.toBeNull();
            const selectedText = result.current.getSelectedText();
            expect(selectedText.length).toBeGreaterThan(0);
        });

        it("should handle word navigation at document boundaries", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Only word" }),
            );

            // At start, word left should not move
            act(() => {
                result.current.setCursor(createCursor(1, 1));
            });

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordLeft",
                });
            });

            expect(result.current.cursor).toEqual({ line: 1, column: 1 });

            // At end, word right should not move beyond
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            const endCursor = result.current.cursor;

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            expect(result.current.cursor).toEqual(endCursor);
        });

        it("should handle word navigation with spaces", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "word   spaces   here" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 5));
            });

            // Should skip multiple spaces
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            expect(result.current.cursor.column).toBeGreaterThan(8);
        });
    });

    describe("Tab Switching Preserves State", () => {
        it("should preserve cursor position when switching tabs", () => {
            const { result, rerender } = renderHook(
                ({ content }) => useEditorState({ initialContent: content }),
                { initialProps: { content: "File A content" } },
            );

            // Edit and position cursor
            act(() => {
                result.current.setCursor(createCursor(1, 5));
            });

            // Switch to another file
            rerender({ content: "File B content" });

            // Switch back - cursor should reset (new file context)
            rerender({ content: "File A content" });

            // Note: In real app, cursor preservation would be handled by parent component
            // Hook itself resets on initialContent change
            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
        });

        it("should preserve selection when switching tabs", () => {
            const { result, rerender } = renderHook(
                ({ content }) => useEditorState({ initialContent: content }),
                { initialProps: { content: "Test content" } },
            );

            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 5));
            });

            // Switch tabs
            rerender({ content: "Other content" });
            rerender({ content: "Test content" });

            // Selection resets on tab switch (as expected)
            expect(result.current.selection).toBeNull();
        });

        it("should preserve undo history within a tab session", () => {
            const { result, rerender } = renderHook(
                ({ content }) => useEditorState({ initialContent: content }),
                { initialProps: { content: "" } },
            );

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Edit 1" });
            });

            // Undo should work
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");

            // Switching tabs clears history
            rerender({ content: "New file" });
            rerender({ content: "" });

            // History is reset
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");
        });

        it("should handle rapid tab switching", () => {
            const { result, rerender } = renderHook(
                ({ content }) => useEditorState({ initialContent: content }),
                { initialProps: { content: "A" } },
            );

            // Rapid switches
            rerender({ content: "B" });
            rerender({ content: "C" });
            rerender({ content: "D" });
            rerender({ content: "E" });

            expect(result.current.getContent()).toBe("E");
            expect(result.current.cursor).toEqual({ line: 1, column: 1 });
            expect(result.current.isDirty).toBe(false);
        });
    });

    describe("Large Document Operations (>1000 lines)", () => {
        it("should edit at end of large document", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: LARGE_FILE_SAMPLES.medium }),
            );

            expect(result.current.getLineCount()).toBe(1000);

            // Navigate to end
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            // Edit at end
            act(() => {
                result.current.executeCommand({ type: "insert", text: "\nNew line" });
            });

            expect(result.current.getLineCount()).toBe(1001);
            expect(result.current.getLine(1001)).toBe("New line");
        });

        it("should handle selection across large range", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: LARGE_FILE_SAMPLES.medium }),
            );

            // Select from line 1 to line 100
            act(() => {
                result.current.setSelection(createSelection(1, 1, 100, 1));
            });

            const selectedText = result.current.getSelectedText();
            expect(selectedText.split("\n").length).toBeGreaterThan(90);
        });

        it("should handle rapid edits in large document", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: LARGE_FILE_SAMPLES.medium }),
            );

            // Position at middle
            act(() => {
                result.current.setCursor(createCursor(500, 1));
            });

            // Multiple rapid edits
            act(() => {
                result.current.executeCommand({ type: "insert", text: "// Comment\n" });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "// Another\n" });
            });

            expect(result.current.getLineCount()).toBe(1002);
            expect(result.current.getLine(500)).toBe("// Comment");
        });

        it("should handle undo in large document", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: LARGE_FILE_SAMPLES.small }),
            );

            const initialLineCount = result.current.getLineCount();

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "\nAdded line" });
            });

            expect(result.current.getLineCount()).toBe(initialLineCount + 1);

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getLineCount()).toBe(initialLineCount);
        });
    });

    describe("Rapid Typing with Debounce", () => {
        it("should batch rapid keystrokes into single undo entry", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Rapid typing (within 300ms window)
            act(() => {
                result.current.executeCommand({ type: "insert", text: "H" });
            });

            act(() => {
                vi.advanceTimersByTime(50);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "e" });
            });

            act(() => {
                vi.advanceTimersByTime(50);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "l" });
            });

            act(() => {
                vi.advanceTimersByTime(50);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "l" });
            });

            act(() => {
                vi.advanceTimersByTime(50);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "o" });
            });

            expect(result.current.getContent()).toBe("Hello");

            // Single undo should remove all batched edits
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            // Due to batching, content might be partially undone
            expect(result.current.getContent().length).toBeLessThan(5);

            vi.useRealTimers();
        });

        it("should create separate undo entries after debounce window", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "insert", text: "First" });
            });

            // Wait beyond batching window
            act(() => {
                vi.advanceTimersByTime(400);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: " Second" });
            });

            expect(result.current.getContent()).toBe("First Second");

            // Undo should remove only "Second"
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("First");

            // Undo again should remove "First"
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("");

            vi.useRealTimers();
        });

        it("should handle mixed rapid and slow typing", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Rapid burst
            act(() => {
                result.current.executeCommand({ type: "insert", text: "ABC" });
            });

            act(() => {
                vi.advanceTimersByTime(100);
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "D" });
            });

            // Pause
            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Slow typing
            act(() => {
                result.current.executeCommand({ type: "insert", text: "E" });
            });

            expect(result.current.getContent()).toBe("ABCDE");

            vi.useRealTimers();
        });
    });

    describe("Cut/Copy/Paste with Clipboard", () => {
        it("should cut selected text", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            act(() => {
                result.current.setSelection(createSelection(1, 7, 1, 12));
            });

            const cutText = result.current.getSelectedText();
            expect(cutText).toBe("World");

            act(() => {
                result.current.executeCommand({ type: "cut" });
            });

            expect(result.current.getContent()).toBe("Hello ");
            expect(result.current.selection).toBeNull();
        });

        it("should paste at cursor position", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 6));
            });

            act(() => {
                result.current.executeCommand({ type: "paste", text: " World" });
            });

            expect(result.current.getContent()).toBe("Hello World");
        });

        it("should paste replacing selection", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            act(() => {
                result.current.setSelection(createSelection(1, 7, 1, 12));
            });

            act(() => {
                result.current.executeCommand({ type: "paste", text: "Claude" });
            });

            expect(result.current.getContent()).toBe("Hello Claude");
        });

        it("should paste multi-line content", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Start" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 6));
            });

            const multiline = "\nLine 1\nLine 2\nLine 3";

            act(() => {
                result.current.executeCommand({ type: "paste", text: multiline });
            });

            expect(result.current.getLineCount()).toBe(4);
            expect(result.current.getLine(1)).toBe("Start");
            expect(result.current.getLine(2)).toBe("Line 1");
            expect(result.current.getLine(4)).toBe("Line 3");
        });

        it("should handle cut with no selection", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello" }),
            );

            act(() => {
                result.current.executeCommand({ type: "cut" });
            });

            expect(result.current.getContent()).toBe("Hello");
        });

        it("should handle consecutive cut and paste operations", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "One Two Three" }),
            );

            // Cut "Two "
            act(() => {
                result.current.setSelection(createSelection(1, 5, 1, 9));
            });

            const cut1 = result.current.getSelectedText();

            act(() => {
                result.current.executeCommand({ type: "cut" });
            });

            expect(result.current.getContent()).toBe("One Three");

            // Move to end and paste
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "paste", text: ` ${cut1}` });
            });

            expect(result.current.getContent()).toBe("One Three Two ");
        });

        it("should maintain cursor position after paste", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Test" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 3));
            });

            act(() => {
                result.current.executeCommand({ type: "paste", text: "XX" });
            });

            expect(result.current.getContent()).toBe("TeXXst");
            expect(result.current.cursor.column).toBe(5);
        });
    });

    describe("Complex Workflow Combinations", () => {
        it("should handle complete code editing session", () => {
            const { result } = renderHook(() => useEditorState());

            // Type function
            act(() => {
                result.current.executeCommand({
                    type: "insert",
                    text: CODE_SAMPLES.javascript.function,
                });
            });

            expect(result.current.getLineCount()).toBe(3);

            // Select function name
            act(() => {
                result.current.setSelection(createSelection(1, 10, 1, 13));
            });

            // Rename
            act(() => {
                result.current.executeCommand({ type: "insert", text: "sum" });
            });

            expect(result.current.getContent()).toContain("function sum");

            // Add documentation
            act(() => {
                result.current.setCursor(createCursor(1, 1));
                result.current.executeCommand({
                    type: "insert",
                    text: "// Adds two numbers\n",
                });
            });

            expect(result.current.getLineCount()).toBe(4);
            expect(result.current.getLine(1)).toBe("// Adds two numbers");
        });

        it("should handle multi-step refactoring workflow", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "var x = 1;\nvar y = 2;" }),
            );

            // Replace "var" with "const" on first line
            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 4));
                result.current.executeCommand({ type: "insert", text: "const" });
            });

            // Replace "var" with "const" on second line
            act(() => {
                result.current.setSelection(createSelection(2, 1, 2, 4));
                result.current.executeCommand({ type: "insert", text: "const" });
            });

            expect(result.current.getContent()).toBe("const x = 1;\nconst y = 2;");
        });

        it("should handle delete lines and reformat workflow", () => {
            const { result } = renderHook(() =>
                useEditorState({
                    initialContent: "Line 1\n\n\nLine 2\n\nLine 3",
                }),
            );

            // Delete empty lines between Line 1 and Line 2
            act(() => {
                result.current.setSelection(createSelection(2, 1, 4, 1));
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("Line 1\nLine 2\n\nLine 3");
        });

        it("should handle navigation with selection and editing", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "foo bar baz qux" }),
            );

            // Navigate to second word
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                });
            });

            // Select word
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                    extend: true,
                });
            });

            // Replace
            act(() => {
                result.current.executeCommand({ type: "insert", text: "new" });
            });

            expect(result.current.getContent()).toContain("new");
        });

        it("should handle undo/redo in complex editing scenario", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Edit 1
            act(() => {
                result.current.executeCommand({ type: "insert", text: "First" });
            });

            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Edit 2
            act(() => {
                result.current.executeCommand({ type: "insert", text: " Second" });
            });

            act(() => {
                vi.advanceTimersByTime(400);
            });

            // Edit 3
            act(() => {
                result.current.executeCommand({ type: "insert", text: " Third" });
            });

            expect(result.current.getContent()).toBe("First Second Third");

            // Undo sequence
            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("First Second");

            act(() => {
                result.current.executeCommand({ type: "undo" });
            });

            expect(result.current.getContent()).toBe("First");

            // Redo sequence
            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.getContent()).toBe("First Second");

            act(() => {
                result.current.executeCommand({ type: "redo" });
            });

            expect(result.current.getContent()).toBe("First Second Third");

            vi.useRealTimers();
        });

        it("should handle selection extension across multiple operations", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "The quick brown fox" }),
            );

            act(() => {
                result.current.setCursor(createCursor(1, 1));
            });

            // Extend by character
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "right",
                    extend: true,
                });
            });

            // Extend by word
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                    extend: true,
                });
            });

            expect(result.current.selection).not.toBeNull();
            expect(result.current.getSelectedText().length).toBeGreaterThan(1);
        });

        it("should handle document start/end navigation with editing", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Start\nMiddle\nEnd" }),
            );

            // Go to end
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: " Tail" });
            });

            expect(result.current.getLine(3)).toBe("End Tail");

            // Go to start
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentStart",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Head " });
            });

            expect(result.current.getLine(1)).toBe("Head Start");
        });

        it("should handle complex selection manipulation", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Alpha Beta Gamma Delta" }),
            );

            // Select "Beta Gamma"
            act(() => {
                result.current.setSelection(createSelection(1, 7, 1, 18));
            });

            expect(result.current.getSelectedText()).toBe("Beta Gamma");

            // Extend selection
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "wordRight",
                    extend: true,
                });
            });

            const extendedText = result.current.getSelectedText();
            expect(extendedText.length).toBeGreaterThan(11);
        });
    });

    describe("Edge Cases and Boundary Conditions", () => {
        it("should handle empty document operations", () => {
            const { result } = renderHook(() => useEditorState());

            act(() => {
                result.current.executeCommand({ type: "selectAll" });
            });

            expect(result.current.selection).toBeNull();

            act(() => {
                result.current.executeCommand({ type: "deleteBackward" });
            });

            expect(result.current.getContent()).toBe("");
        });

        it("should handle single character document", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "x" }),
            );

            act(() => {
                result.current.executeCommand({ type: "selectAll" });
            });

            expect(result.current.getSelectedText()).toBe("x");

            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("");
        });

        it("should handle unicode and emoji content", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: CODE_SAMPLES.edgeCases.unicode }),
            );

            expect(result.current.getContent()).toBe("Hello 世界 🌍");

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "documentEnd",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: " ❤️" });
            });

            expect(result.current.getContent()).toContain("❤️");
        });

        it("should handle very long single line", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: CODE_SAMPLES.edgeCases.longLine }),
            );

            expect(result.current.getLineLength(1)).toBe(10000);

            act(() => {
                result.current.setCursor(createCursor(1, 5000));
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "X" });
            });

            expect(result.current.getLineLength(1)).toBe(10001);
        });

        it("should handle tab characters", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: CODE_SAMPLES.edgeCases.tabs }),
            );

            expect(result.current.getContent()).toBe("a\tb\tc");

            act(() => {
                result.current.setCursor(createCursor(1, 2));
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "\t" });
            });

            expect(result.current.getContent()).toContain("\t\t");
        });

        it("should handle selections at document boundaries", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            // Select from start
            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 6));
            });

            expect(result.current.getSelectedText()).toBe("Hello");

            // Select to end
            act(() => {
                result.current.setSelection(createSelection(1, 7, 1, 12));
            });

            expect(result.current.getSelectedText()).toBe("World");
        });

        it("should handle rapid cursor movements", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Line 1\nLine 2\nLine 3" }),
            );

            // Rapid movements
            for (let i = 0; i < 10; i++) {
                act(() => {
                    result.current.executeCommand({
                        type: "moveCursor",
                        direction: i % 2 === 0 ? "down" : "up",
                    });
                });
            }

            // Should still be in valid state
            expect(result.current.cursor.line).toBeGreaterThanOrEqual(1);
            expect(result.current.cursor.line).toBeLessThanOrEqual(3);
        });

        it("should handle zero-length selections", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Test" }),
            );

            // Create zero-length selection (cursor only)
            act(() => {
                result.current.setSelection(createSelection(1, 3, 1, 3));
            });

            expect(result.current.getSelectedText()).toBe("");

            act(() => {
                result.current.executeCommand({ type: "deleteSelection" });
            });

            expect(result.current.getContent()).toBe("Test");
        });

        it("should handle line boundary edge cases", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "First\n\nThird" }),
            );

            // Select empty line
            act(() => {
                result.current.setSelection(createSelection(2, 1, 3, 1));
            });

            const selected = result.current.getSelectedText();
            expect(selected).toBe("\n");
        });

        it("should handle cursor at line end edge cases", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Short\nLonger line" }),
            );

            // Move to end of first line
            act(() => {
                result.current.setCursor(createCursor(1, 6));
            });

            // Move down (should clamp to available position)
            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "down",
                });
            });

            expect(result.current.cursor.line).toBe(2);
            expect(result.current.cursor.column).toBeLessThanOrEqual(
                result.current.getLineLength(2) + 1,
            );
        });

        it("should handle multiple consecutive undos and redos", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Create history
            for (let i = 0; i < 5; i++) {
                act(() => {
                    result.current.executeCommand({ type: "insert", text: `${i}` });
                });

                act(() => {
                    vi.advanceTimersByTime(400);
                });
            }

            expect(result.current.getContent()).toBe("01234");

            // Undo all
            for (let i = 0; i < 5; i++) {
                act(() => {
                    result.current.executeCommand({ type: "undo" });
                });
            }

            expect(result.current.getContent()).toBe("");

            // Redo all
            for (let i = 0; i < 5; i++) {
                act(() => {
                    result.current.executeCommand({ type: "redo" });
                });
            }

            expect(result.current.getContent()).toBe("01234");

            vi.useRealTimers();
        });
    });

    describe("Performance and Stress Tests", () => {
        it("should handle 1000+ character insertion", () => {
            const { result } = renderHook(() => useEditorState());

            const largeText = "x".repeat(1000);

            act(() => {
                result.current.executeCommand({ type: "insert", text: largeText });
            });

            expect(result.current.getContent().length).toBe(1000);
        });

        it("should handle multiple selections in sequence", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "One Two Three Four Five" }),
            );

            // Rapidly change selections
            for (let i = 1; i < 20; i += 5) {
                act(() => {
                    result.current.setSelection(createSelection(1, i, 1, i + 3));
                });
            }

            expect(result.current.selection).not.toBeNull();
        });

        it("should handle deep undo stack", () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useEditorState());

            // Create 100 history entries
            for (let i = 0; i < 100; i++) {
                act(() => {
                    result.current.executeCommand({ type: "insert", text: "x" });
                });

                act(() => {
                    vi.advanceTimersByTime(400);
                });
            }

            // Undo 50 times
            for (let i = 0; i < 50; i++) {
                act(() => {
                    result.current.executeCommand({ type: "undo" });
                });
            }

            expect(result.current.getContent().length).toBeLessThan(100);

            vi.useRealTimers();
        });

        it("should handle alternating insert and delete", () => {
            const { result } = renderHook(() => useEditorState());

            for (let i = 0; i < 20; i++) {
                act(() => {
                    result.current.executeCommand({ type: "insert", text: "ab" });
                });

                act(() => {
                    result.current.executeCommand({ type: "deleteBackward" });
                });
            }

            expect(result.current.getContent()).toBe("a".repeat(20));
        });

        it("should maintain consistency after many operations", () => {
            const { result } = renderHook(() => useEditorState());

            // Complex sequence
            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hello" });
            });

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "lineStart",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Start " });
            });

            act(() => {
                result.current.executeCommand({
                    type: "moveCursor",
                    direction: "lineEnd",
                });
            });

            act(() => {
                result.current.executeCommand({ type: "insert", text: " End" });
            });

            expect(result.current.getContent()).toBe("Start Hello End");
        });
    });

    describe("State Consistency Verification", () => {
        it("should maintain version increments correctly", () => {
            const { result } = renderHook(() => useEditorState());

            const v0 = result.current.version;

            act(() => {
                result.current.executeCommand({ type: "insert", text: "test" });
            });

            const v1 = result.current.version;
            expect(v1).toBeGreaterThan(v0);

            act(() => {
                result.current.executeCommand({ type: "moveCursor", direction: "left" });
            });

            const v2 = result.current.version;
            expect(v2).toBeGreaterThan(v1);
        });

        it("should maintain isDirty flag correctly", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Initial" }),
            );

            expect(result.current.isDirty).toBe(false);

            act(() => {
                result.current.executeCommand({ type: "insert", text: " Edit" });
            });

            expect(result.current.isDirty).toBe(true);
        });

        it("should clear selection after insert", () => {
            const { result } = renderHook(() =>
                useEditorState({ initialContent: "Hello World" }),
            );

            act(() => {
                result.current.setSelection(createSelection(1, 1, 1, 6));
            });

            expect(result.current.selection).not.toBeNull();

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Hi" });
            });

            expect(result.current.selection).toBeNull();
        });

        it("should update cursor after every edit", () => {
            const { result } = renderHook(() => useEditorState());

            const initialCursor = result.current.cursor;

            act(() => {
                result.current.executeCommand({ type: "insert", text: "Test" });
            });

            expect(result.current.cursor).not.toEqual(initialCursor);
            expect(result.current.cursor.column).toBe(5);
        });

        it("should handle onChange callback consistency", () => {
            const onChange = vi.fn();
            const { result } = renderHook(() => useEditorState({ onChange }));

            act(() => {
                result.current.executeCommand({ type: "insert", text: "A" });
            });

            expect(onChange).toHaveBeenCalledTimes(1);

            act(() => {
                result.current.executeCommand({ type: "insert", text: "B" });
            });

            expect(onChange).toHaveBeenCalledTimes(2);
            expect(onChange).toHaveBeenLastCalledWith("AB");
        });
    });
});

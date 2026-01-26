import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CodeEditor } from "./CodeEditor";
import type { EditorConfig, ViewState } from "@/types/editor";
import type { EditorStateAPI } from "@/hooks/useEditorState";
import { useEditorState } from "@/hooks/useEditorState";
import type { CoordinateConverter } from "@/lib/editor/coordinates";
import { defaultEditorConfig } from "@/types/editor";
import { HiddenTextarea } from "./HiddenTextarea";

// Mock child components
vi.mock("./Gutter", () => ({
    Gutter: vi.fn(() => <div data-testid="gutter">Gutter</div>),
}));

vi.mock("./LineRenderer", () => ({
    LineRenderer: vi.fn(() => <div data-testid="line-renderer">LineRenderer</div>),
}));

vi.mock("./CursorRenderer", () => ({
    CursorRenderer: vi.fn(() => <div data-testid="cursor-renderer">CursorRenderer</div>),
}));

vi.mock("./SelectionRenderer", () => ({
    SelectionRenderer: vi.fn(() => <div data-testid="selection-renderer">SelectionRenderer</div>),
}));

vi.mock("./HiddenTextarea", () => ({
    HiddenTextarea: vi.fn(({ onCommand, getSelectedText, autoFocus, onFocusChange, tabSize }) => (
        <textarea
            data-testid="hidden-textarea"
            data-autofocus={autoFocus}
            data-tabsize={tabSize}
            onKeyDown={(e) => {
                // Simulate keyboard shortcuts
                const mod = e.ctrlKey || e.metaKey;
                if (mod && e.key === "a") {
                    e.preventDefault();
                    onCommand({ type: "selectAll" });
                } else if (mod && e.key === "z" && !e.shiftKey) {
                    e.preventDefault();
                    onCommand({ type: "undo" });
                } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
                    e.preventDefault();
                    onCommand({ type: "redo" });
                } else if (mod && e.key === "c") {
                    onCommand({ type: "copy" });
                } else if (mod && e.key === "x") {
                    onCommand({ type: "cut" });
                } else if (e.key === "Tab") {
                    e.preventDefault();
                    onCommand({ type: "insert", text: " ".repeat(tabSize) });
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    onCommand({ type: "insert", text: "\n" });
                } else if (e.key === "Backspace") {
                    e.preventDefault();
                    onCommand({ type: "deleteBackward" });
                } else if (e.key === "Delete") {
                    e.preventDefault();
                    onCommand({ type: "deleteForward" });
                }
            }}
            onCopy={(e) => {
                const text = getSelectedText();
                if (text) {
                    e.preventDefault();
                    e.clipboardData.setData("text/plain", text);
                    onCommand({ type: "copy" });
                }
            }}
            onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text/plain");
                if (text) {
                    onCommand({ type: "paste", text });
                }
            }}
            onFocus={() => onFocusChange?.(true)}
            onBlur={() => onFocusChange?.(false)}
            onCompositionStart={() => {
                // IME composition start
            }}
            onCompositionUpdate={() => {
                // IME composition update
            }}
            onCompositionEnd={(e) => {
                // IME composition end
                if (e.data) {
                    onCommand({ type: "insert", text: e.data });
                }
            }}
        />
    )),
}));

// Mock hooks
const mockExecuteCommand = vi.fn();
const mockSetCursor = vi.fn();
const mockSetSelection = vi.fn();
const mockGetLine = vi.fn((lineNumber: number) => `Line ${lineNumber} content`);
const mockGetLineCount = vi.fn(() => 10);
const mockGetLineLength = vi.fn((_lineNumber: number) => 20);
const mockGetSelectedText = vi.fn(() => "");
const mockGetContent = vi.fn(() => "test content");

const mockGetEditMetadata = vi.fn(() => null);
const mockClearEditMetadata = vi.fn();
const mockApplyRemoteOperations = vi.fn();

const mockEditorState: EditorStateAPI = {
    cursor: { line: 1, column: 1 },
    selection: null,
    isDirty: false,
    version: 0,
    config: { ...defaultEditorConfig },
    getContent: mockGetContent,
    getLine: mockGetLine,
    getLineCount: mockGetLineCount,
    getLineLength: mockGetLineLength,
    getSelectedText: mockGetSelectedText,
    executeCommand: mockExecuteCommand,
    setCursor: mockSetCursor,
    setSelection: mockSetSelection,
    getEditMetadata: mockGetEditMetadata,
    clearEditMetadata: mockClearEditMetadata,
    applyRemoteOperations: mockApplyRemoteOperations,
};

vi.mock("@/hooks/useEditorState", () => ({
    useEditorState: vi.fn(() => mockEditorState),
}));

const mockSetScroll = vi.fn();
const mockScrollToLine = vi.fn();
const mockScrollToPosition = vi.fn();

const mockViewState: ViewState = {
    scrollTop: 0,
    scrollLeft: 0,
    viewportWidth: 800,
    viewportHeight: 600,
    firstVisibleLine: 1,
    lastVisibleLine: 30,
};

vi.mock("@/hooks/useViewport", () => ({
    useViewport: vi.fn(() => ({
        viewState: mockViewState,
        setScroll: mockSetScroll,
        scrollToLine: mockScrollToLine,
        scrollToPosition: mockScrollToPosition,
    })),
}));

// Mock coordinate utilities
const mockCoordinateConverter: CoordinateConverter = {
    config: { ...defaultEditorConfig },
    charWidth: 8,
    gutterWidth: 60,
    padding: 8,
};

vi.mock("@/lib/editor/coordinates", () => ({
    createCoordinateConverter: vi.fn(() => mockCoordinateConverter),
    pixelToPosition: vi.fn((converter, x, y, scrollTop, scrollLeft, lineCount, _getLineLength) => {
        const lineHeight = converter.config.lineHeight;
        const adjustedY = y + scrollTop;
        const line = Math.floor(adjustedY / lineHeight) + 1;
        const adjustedX = x + scrollLeft - converter.gutterWidth - converter.padding;
        const column = Math.max(1, Math.round(adjustedX / converter.charWidth) + 1);
        return { line: Math.max(1, Math.min(line, lineCount)), column };
    }),
}));

describe("CodeEditor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock state
        Object.assign(mockEditorState, {
            cursor: { line: 1, column: 1 },
            selection: null,
            isDirty: false,
            version: 0,
            config: { ...defaultEditorConfig },
        });
        Object.assign(mockViewState, {
            scrollTop: 0,
            scrollLeft: 0,
            viewportWidth: 800,
            viewportHeight: 600,
            firstVisibleLine: 1,
            lastVisibleLine: 30,
        });
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Editor Mounting with Props", () => {
        it("should mount with default props", () => {
            render(<CodeEditor />);

            expect(screen.getByRole("application")).toBeInTheDocument();
            expect(screen.getByLabelText("Code editor")).toBeInTheDocument();
            expect(screen.getByTestId("hidden-textarea")).toBeInTheDocument();
            expect(screen.getByTestId("gutter")).toBeInTheDocument();
            expect(screen.getByTestId("line-renderer")).toBeInTheDocument();
            expect(screen.getByTestId("cursor-renderer")).toBeInTheDocument();
            expect(screen.getByTestId("selection-renderer")).toBeInTheDocument();
        });

        it("should mount with initial content", () => {
            render(<CodeEditor initialContent="const x = 123;" />);

            expect(useEditorState).toHaveBeenCalledWith(
                expect.objectContaining({
                    initialContent: "const x = 123;",
                }),
            );
        });

        it("should apply config overrides", () => {
            const config: Partial<EditorConfig> = {
                tabSize: 2,
                fontSize: 16,
                lineHeight: 24,
            };

            render(<CodeEditor config={config} />);

            expect(useEditorState).toHaveBeenCalledWith(
                expect.objectContaining({
                    config,
                }),
            );
        });

        it("should auto-focus when autoFocus is true", () => {
            render(<CodeEditor autoFocus={true} />);

            const textarea = screen.getByTestId("hidden-textarea");
            expect(textarea).toHaveAttribute("data-autofocus", "true");
        });

        it("should not auto-focus when autoFocus is false", () => {
            render(<CodeEditor autoFocus={false} />);

            const textarea = screen.getByTestId("hidden-textarea");
            expect(textarea).toHaveAttribute("data-autofocus", "false");
        });
    });

    describe("Keyboard Event Handling", () => {
        it("should delegate keyboard events to hidden textarea", () => {
            render(<CodeEditor />);

            const container = screen.getByRole("application");
            const textarea = screen.getByTestId("hidden-textarea");

            // Mock focus method
            const focusSpy = vi.spyOn(textarea, "focus");

            // Trigger keydown on container
            fireEvent.keyDown(container, { key: "a" });

            // Should focus the textarea
            expect(focusSpy).toHaveBeenCalled();
        });

        it("should focus textarea on container keydown", () => {
            render(<CodeEditor />);

            const container = screen.getByRole("application");
            const textarea = screen.getByTestId("hidden-textarea");

            const focusSpy = vi.spyOn(textarea, "focus");

            fireEvent.keyDown(container, { key: "Enter" });

            expect(focusSpy).toHaveBeenCalled();
        });
    });

    describe("Click-to-Position Cursor Movement", () => {
        it("should move cursor on click", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");
            expect(scrollContainer).toBeInTheDocument();

            // Simulate click
            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 200,
                clientY: 100,
            });

            expect(mockSetCursor).toHaveBeenCalled();
            expect(mockSetSelection).toHaveBeenCalled();
        });

        it("should calculate position from mouse coordinates", async () => {
            const { pixelToPosition } = await import("@/lib/editor/coordinates");

            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 150,
                clientY: 50,
            });

            expect(pixelToPosition).toHaveBeenCalled();
        });

        it("should focus editor on click", () => {
            render(<CodeEditor />);

            const container = screen.getByRole("application");
            const textarea = screen.getByTestId("hidden-textarea");

            const focusSpy = vi.spyOn(textarea, "focus");

            // Click on the container
            fireEvent.click(container);

            expect(focusSpy).toHaveBeenCalled();
        });
    });

    describe("Selection with Mouse Drag", () => {
        it("should start selection on mousedown", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 200,
                clientY: 100,
            });

            expect(mockSetCursor).toHaveBeenCalled();
            expect(mockSetSelection).toHaveBeenCalled();
        });

        it("should extend selection on mousemove", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            // Start dragging
            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 200,
                clientY: 100,
            });

            mockExecuteCommand.mockClear();

            // Move mouse
            fireEvent.mouseMove(scrollContainer!, {
                clientX: 300,
                clientY: 100,
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "moveCursorTo",
                    extend: true,
                }),
            );
        });

        it("should end selection on mouseup", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            // Start dragging
            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 200,
                clientY: 100,
            });

            // Move mouse
            fireEvent.mouseMove(scrollContainer!, {
                clientX: 300,
                clientY: 100,
            });

            // End drag
            fireEvent.mouseUp(scrollContainer!);

            // Mouse move should no longer extend selection
            mockExecuteCommand.mockClear();
            fireEvent.mouseMove(scrollContainer!, {
                clientX: 400,
                clientY: 100,
            });

            expect(mockExecuteCommand).not.toHaveBeenCalled();
        });

        it("should handle shift+click to extend selection", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            // Shift+click
            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                shiftKey: true,
                clientX: 200,
                clientY: 100,
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "moveCursorTo",
                    extend: true,
                }),
            );
        });
    });

    describe("Clipboard Operations (Copy/Paste)", () => {
        it("should trigger copy command", async () => {
            mockGetSelectedText.mockReturnValue("selected text");

            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            // Trigger copy
            fireEvent.copy(textarea, {
                clipboardData: {
                    setData: vi.fn(),
                    getData: vi.fn(),
                },
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({ type: "copy" });
        });

        it("should trigger paste command with clipboard data", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            // Trigger paste
            fireEvent.paste(textarea, {
                clipboardData: {
                    getData: () => "pasted content",
                    setData: vi.fn(),
                },
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "paste",
                text: "pasted content",
            });
        });
    });

    describe("IME Composition Events", () => {
        it("should handle composition start", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            // Should not throw
            expect(() => {
                fireEvent.compositionStart(textarea);
            }).not.toThrow();
        });

        it("should handle composition update", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            // Should not throw
            expect(() => {
                fireEvent.compositionUpdate(textarea);
            }).not.toThrow();
        });

        it("should handle composition end", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.compositionEnd(textarea, {
                data: "日本語",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "insert",
                text: "日本語",
            });
        });
    });

    describe("Auto-scroll on Typing", () => {
        it("should scroll to cursor when typing", () => {
            const { rerender } = render(<CodeEditor />);

            // Update cursor position
            Object.assign(mockEditorState, {
                cursor: { line: 5, column: 10 },
            });

            rerender(<CodeEditor />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(5, 10, mockCoordinateConverter.charWidth);
        });

        it("should scroll horizontally for long lines", () => {
            const { rerender } = render(<CodeEditor />);

            // Update cursor to a far right position
            Object.assign(mockEditorState, {
                cursor: { line: 1, column: 100 },
            });

            rerender(<CodeEditor />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(1, 100, mockCoordinateConverter.charWidth);
        });
    });

    describe("Focus Handling", () => {
        it("should update focus state on focus", async () => {
            const { CursorRenderer } = await import("./CursorRenderer");
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.focus(textarea);

            // Check that CursorRenderer was rendered with isFocused=true
            expect(CursorRenderer).toHaveBeenCalledWith(
                expect.objectContaining({
                    isFocused: true,
                }),
                expect.anything(),
            );
        });

        it("should update focus state on blur", async () => {
            const { CursorRenderer } = await import("./CursorRenderer");
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            // Focus first
            fireEvent.focus(textarea);

            // Then blur
            fireEvent.blur(textarea);

            // Check that CursorRenderer was last rendered with isFocused=false
            const calls = (CursorRenderer as any).mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0].isFocused).toBe(false);
        });

        it("should show cursor only when focused", async () => {
            const { CursorRenderer } = await import("./CursorRenderer");
            const { rerender } = render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            // Initially not focused
            expect(CursorRenderer).toHaveBeenCalledWith(
                expect.objectContaining({
                    isFocused: false,
                }),
                expect.anything(),
            );

            // Focus
            fireEvent.focus(textarea);
            rerender(<CodeEditor />);

            expect(CursorRenderer).toHaveBeenCalledWith(
                expect.objectContaining({
                    isFocused: true,
                }),
                expect.anything(),
            );
        });
    });

    describe("Keyboard Shortcuts", () => {
        it("should handle Ctrl+A for select all", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "a",
                ctrlKey: true,
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({ type: "selectAll" });
        });

        it("should handle Ctrl+Z for undo", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "z",
                ctrlKey: true,
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({ type: "undo" });
        });

        it("should handle Ctrl+Y for redo", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "y",
                ctrlKey: true,
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({ type: "redo" });
        });

        it("should handle Ctrl+C for copy", () => {
            mockGetSelectedText.mockReturnValue("selected");

            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "c",
                ctrlKey: true,
            });

            fireEvent.copy(textarea, {
                clipboardData: {
                    setData: vi.fn(),
                    getData: vi.fn(),
                },
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({ type: "copy" });
        });

        it("should handle Ctrl+V for paste", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.paste(textarea, {
                clipboardData: {
                    getData: () => "paste text",
                    setData: vi.fn(),
                },
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "paste",
                text: "paste text",
            });
        });

        it("should handle Ctrl+X for cut", () => {
            mockGetSelectedText.mockReturnValue("cut text");

            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "x",
                ctrlKey: true,
            });

            fireEvent.cut(textarea, {
                clipboardData: {
                    setData: vi.fn(),
                    getData: vi.fn(),
                },
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({ type: "cut" });
        });
    });

    describe("Tab Key Insertion", () => {
        it("should insert tab character", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Tab",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "insert",
                text: "    ", // Default tabSize is 4
            });
        });

        it("should respect tabSize setting", () => {
            Object.assign(mockEditorState, {
                config: { ...defaultEditorConfig, tabSize: 2 },
            });

            render(<CodeEditor />);

            // Check that HiddenTextarea received tabSize=2
            expect(HiddenTextarea).toHaveBeenCalledWith(
                expect.objectContaining({
                    tabSize: 2,
                }),
                expect.anything(),
            );
        });
    });

    describe("Enter Key Handling", () => {
        it("should insert newline", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Enter",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "insert",
                text: "\n",
            });
        });

        it("should handle auto-indent", () => {
            // This test verifies that newline insertion works
            // Auto-indent logic would be in the editor state handler
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Enter",
            });

            // Verify newline is inserted
            expect(mockExecuteCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "insert",
                    text: expect.stringContaining("\n"),
                }),
            );
        });
    });

    describe("Backspace/Delete Handling", () => {
        it("should delete character before cursor on backspace", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Backspace",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "deleteBackward",
            });
        });

        it("should delete character after cursor on delete", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Delete",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "deleteForward",
            });
        });

        it("should delete selection on backspace", () => {
            Object.assign(mockEditorState, {
                selection: {
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 10 },
                },
            });

            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Backspace",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "deleteBackward",
            });
        });

        it("should delete selection on delete", () => {
            Object.assign(mockEditorState, {
                selection: {
                    anchor: { line: 1, column: 1 },
                    active: { line: 1, column: 10 },
                },
            });

            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");

            fireEvent.keyDown(textarea, {
                key: "Delete",
            });

            expect(mockExecuteCommand).toHaveBeenCalledWith({
                type: "deleteForward",
            });
        });
    });

    describe("Search Match Navigation", () => {
        it("should scroll to current search match", () => {
            const searchMatches = [
                { line: 5, column: 10, length: 4, offset: 100 },
                { line: 10, column: 5, length: 4, offset: 200 },
                { line: 15, column: 1, length: 4, offset: 300 },
            ];

            render(<CodeEditor searchMatches={searchMatches} currentMatchIndex={1} />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(10, 5, mockCoordinateConverter.charWidth);
        });

        it("should update on currentMatchIndex change", () => {
            const searchMatches = [
                { line: 5, column: 10, length: 4, offset: 100 },
                { line: 10, column: 5, length: 4, offset: 200 },
                { line: 15, column: 1, length: 4, offset: 300 },
            ];

            const { rerender } = render(<CodeEditor searchMatches={searchMatches} currentMatchIndex={0} />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(5, 10, mockCoordinateConverter.charWidth);

            mockScrollToPosition.mockClear();

            // Update to next match
            rerender(<CodeEditor searchMatches={searchMatches} currentMatchIndex={2} />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(15, 1, mockCoordinateConverter.charWidth);
        });
    });

    describe("Scroll Event Handling", () => {
        it("should update scroll state on scroll", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            // Simulate scroll
            Object.defineProperty(scrollContainer, "scrollTop", { value: 100, writable: true });
            Object.defineProperty(scrollContainer, "scrollLeft", { value: 50, writable: true });

            fireEvent.scroll(scrollContainer!);

            expect(mockSetScroll).toHaveBeenCalledWith(100, 50);
        });

        it("should handle horizontal scroll", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            Object.defineProperty(scrollContainer, "scrollTop", { value: 0, writable: true });
            Object.defineProperty(scrollContainer, "scrollLeft", { value: 200, writable: true });

            fireEvent.scroll(scrollContainer!);

            expect(mockSetScroll).toHaveBeenCalledWith(0, 200);
        });
    });

    describe("Callback Props", () => {
        it("should call onChange when content changes", async () => {
            const { useEditorState } = await import("@/hooks/useEditorState");
            const onChange = vi.fn();

            render(<CodeEditor onChange={onChange} />);

            expect(useEditorState).toHaveBeenCalledWith(
                expect.objectContaining({
                    onChange,
                }),
            );
        });

        it("should call onCursorChange when cursor moves", () => {
            const onCursorChange = vi.fn();

            render(<CodeEditor onCursorChange={onCursorChange} />);

            // Cursor change should trigger callback
            expect(onCursorChange).toHaveBeenCalledWith({ line: 1, column: 1 });
        });

        it("should call onCursorChange with updated position", () => {
            const onCursorChange = vi.fn();

            const { rerender } = render(<CodeEditor onCursorChange={onCursorChange} />);

            onCursorChange.mockClear();

            // Update cursor
            Object.assign(mockEditorState, {
                cursor: { line: 3, column: 5 },
            });

            rerender(<CodeEditor onCursorChange={onCursorChange} />);

            expect(onCursorChange).toHaveBeenCalledWith({ line: 3, column: 5 });
        });
    });

    describe("Component Integration", () => {
        it("should pass correct props to Gutter", async () => {
            const { Gutter } = await import("./Gutter");
            render(<CodeEditor />);

            expect(Gutter).toHaveBeenCalledWith(
                expect.objectContaining({
                    lineCount: 10,
                    currentLine: 1,
                    config: expect.objectContaining({
                        lineHeight: 20,
                    }),
                }),
                expect.anything(),
            );
        });

        it("should pass correct props to LineRenderer", async () => {
            const { LineRenderer } = await import("./LineRenderer");
            render(<CodeEditor />);

            expect(LineRenderer).toHaveBeenCalledWith(
                expect.objectContaining({
                    getLine: mockGetLine,
                    lineCount: 10,
                    cursor: { line: 1, column: 1 },
                    version: 0,
                }),
                expect.anything(),
            );
        });

        it("should pass correct props to CursorRenderer", async () => {
            const { CursorRenderer } = await import("./CursorRenderer");
            render(<CodeEditor />);

            expect(CursorRenderer).toHaveBeenCalledWith(
                expect.objectContaining({
                    cursor: { line: 1, column: 1 },
                    charWidth: 8,
                    isFocused: false,
                }),
                expect.anything(),
            );
        });

        it("should pass correct props to SelectionRenderer", async () => {
            const { SelectionRenderer } = await import("./SelectionRenderer");
            render(<CodeEditor />);

            expect(SelectionRenderer).toHaveBeenCalledWith(
                expect.objectContaining({
                    selection: null,
                    getLine: mockGetLine,
                    charWidth: 8,
                }),
                expect.anything(),
            );
        });

        it("should pass correct props to HiddenTextarea", () => {
            render(<CodeEditor />);

            expect(HiddenTextarea).toHaveBeenCalledWith(
                expect.objectContaining({
                    onCommand: mockExecuteCommand,
                    getSelectedText: mockGetSelectedText,
                    autoFocus: true,
                    tabSize: 4,
                }),
                expect.anything(),
            );
        });
    });

    describe("Accessibility", () => {
        it("should have correct ARIA role", () => {
            render(<CodeEditor />);

            const editor = screen.getByRole("application");
            expect(editor).toHaveAttribute("aria-label", "Code editor");
        });

        it("should be keyboard navigable", () => {
            render(<CodeEditor />);

            const container = screen.getByRole("application");
            expect(container).toHaveAttribute("tabIndex", "-1");
        });

        it("should have accessible textarea", () => {
            render(<CodeEditor />);

            const textarea = screen.getByTestId("hidden-textarea");
            expect(textarea).toBeInTheDocument();
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty content", () => {
            render(<CodeEditor initialContent="" />);

            expect(screen.getByRole("application")).toBeInTheDocument();
        });

        it("should handle undefined searchMatches", () => {
            render(<CodeEditor searchMatches={undefined} />);

            // Should not crash
            expect(screen.getByRole("application")).toBeInTheDocument();
        });

        it("should handle empty searchMatches array", () => {
            render(<CodeEditor searchMatches={[]} currentMatchIndex={0} />);

            // Should not scroll to match
            expect(mockScrollToPosition).not.toHaveBeenCalled();
        });

        it("should ignore right-click mousedown", () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            mockSetCursor.mockClear();

            // Right click (button 2)
            fireEvent.mouseDown(scrollContainer!, {
                button: 2,
                clientX: 200,
                clientY: 100,
            });

            expect(mockSetCursor).not.toHaveBeenCalled();
        });

        it("should handle out-of-bounds currentMatchIndex", () => {
            const searchMatches = [
                { line: 5, column: 10, length: 4, offset: 100 },
                { line: 10, column: 5, length: 4, offset: 200 },
            ];

            render(<CodeEditor searchMatches={searchMatches} currentMatchIndex={10} />);

            // Should not scroll (index out of bounds)
            expect(mockScrollToPosition).not.toHaveBeenCalled();
        });

        it("should handle negative currentMatchIndex", () => {
            const searchMatches = [
                { line: 5, column: 10, length: 4, offset: 100 },
                { line: 10, column: 5, length: 4, offset: 200 },
            ];

            render(<CodeEditor searchMatches={searchMatches} currentMatchIndex={-1} />);

            // Should not scroll (index negative)
            expect(mockScrollToPosition).not.toHaveBeenCalled();
        });
    });

    describe("Global Mouse Events", () => {
        it("should listen for global mouseup during drag", async () => {
            render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            // Start drag
            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 200,
                clientY: 100,
            });

            mockExecuteCommand.mockClear();

            // Simulate global mouseup (outside editor)
            const globalMouseUpEvent = new MouseEvent("mouseup");
            await waitFor(() => {
                window.dispatchEvent(globalMouseUpEvent);
            });

            // Next mousemove should not extend selection
            fireEvent.mouseMove(scrollContainer!, {
                clientX: 300,
                clientY: 100,
            });

            expect(mockExecuteCommand).not.toHaveBeenCalled();
        });

        it("should cleanup global mouseup listener on unmount", () => {
            const { unmount } = render(<CodeEditor />);

            const scrollContainer = screen.getByRole("application").querySelector(".editor-scroll-container");

            // Start drag
            fireEvent.mouseDown(scrollContainer!, {
                button: 0,
                clientX: 200,
                clientY: 100,
            });

            // Unmount
            unmount();

            // Should not throw when global mouseup fires
            expect(() => {
                const globalMouseUpEvent = new MouseEvent("mouseup");
                window.dispatchEvent(globalMouseUpEvent);
            }).not.toThrow();
        });
    });

    describe("Cursor Position Tracking", () => {
        it("should only scroll when cursor actually moves", () => {
            const { rerender } = render(<CodeEditor />);

            mockScrollToPosition.mockClear();

            // Re-render with same cursor position
            rerender(<CodeEditor />);

            // Should not scroll again
            expect(mockScrollToPosition).not.toHaveBeenCalled();
        });

        it("should scroll when line changes", () => {
            const { rerender } = render(<CodeEditor />);

            mockScrollToPosition.mockClear();

            // Update cursor line
            Object.assign(mockEditorState, {
                cursor: { line: 2, column: 1 },
            });

            rerender(<CodeEditor />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(2, 1, mockCoordinateConverter.charWidth);
        });

        it("should scroll when column changes", () => {
            const { rerender } = render(<CodeEditor />);

            mockScrollToPosition.mockClear();

            // Update cursor column
            Object.assign(mockEditorState, {
                cursor: { line: 1, column: 5 },
            });

            rerender(<CodeEditor />);

            expect(mockScrollToPosition).toHaveBeenCalledWith(1, 5, mockCoordinateConverter.charWidth);
        });
    });
});

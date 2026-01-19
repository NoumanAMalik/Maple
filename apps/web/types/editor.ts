import type { LanguageId } from "@/lib/tokenizer/types";

export interface CursorPosition {
    line: number;
    column: number;
}

/**
 * Selection with anchor (start) and active (current cursor) positions.
 * Allows for both forward and backward selections.
 */
export interface Selection {
    /** Where the selection started (fixed point) */
    anchor: CursorPosition;
    /** Current cursor position (moves as user extends selection) */
    active: CursorPosition;
}

/**
 * Normalized selection with start always before end.
 */
export interface NormalizedSelection {
    start: CursorPosition;
    end: CursorPosition;
}

/**
 * Viewport state for virtual scrolling.
 */
export interface ViewState {
    scrollTop: number;
    scrollLeft: number;
    viewportWidth: number;
    viewportHeight: number;
    firstVisibleLine: number;
    lastVisibleLine: number;
}

/**
 * Full editor state.
 */
export interface EditorState {
    cursor: CursorPosition;
    selection: Selection | null;
    viewState: ViewState;
    isDirty: boolean;
    version: number;
}

export interface EditorConfig {
    tabSize: number;
    lineHeight: number;
    fontSize: number;
    fontFamily: string;
    wordWrap: boolean;
    showLineNumbers: boolean;
    showMinimap: boolean;
    language: LanguageId;
}

export const defaultEditorConfig: EditorConfig = {
    tabSize: 4,
    lineHeight: 20,
    fontSize: 14,
    // JetBrains Mono is loaded via next/font/local and applied via CSS variable
    fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
    wordWrap: false,
    showLineNumbers: true,
    showMinimap: false,
    language: "typescript",
};

/**
 * Editor command types for the command pattern.
 */
export type EditorCommand =
    | { type: "insert"; text: string }
    | { type: "deleteBackward" }
    | { type: "deleteForward" }
    | { type: "deleteSelection" }
    | { type: "moveCursor"; direction: CursorDirection; extend?: boolean }
    | { type: "moveCursorTo"; position: CursorPosition; extend?: boolean }
    | { type: "selectAll" }
    | { type: "undo" }
    | { type: "redo" }
    | { type: "copy" }
    | { type: "cut" }
    | { type: "paste"; text: string };

export type CursorDirection =
    | "left"
    | "right"
    | "up"
    | "down"
    | "lineStart"
    | "lineEnd"
    | "documentStart"
    | "documentEnd"
    | "wordLeft"
    | "wordRight";

/**
 * Normalize a selection so start is always before end.
 */
export function normalizeSelection(selection: Selection): NormalizedSelection {
    const { anchor, active } = selection;

    if (anchor.line < active.line || (anchor.line === active.line && anchor.column <= active.column)) {
        return { start: anchor, end: active };
    }

    return { start: active, end: anchor };
}

/**
 * Check if a selection is empty (cursor with no selected text).
 */
export function isSelectionEmpty(selection: Selection | null): boolean {
    if (!selection) return true;
    return selection.anchor.line === selection.active.line && selection.anchor.column === selection.active.column;
}

/**
 * Compare two cursor positions.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareCursorPositions(a: CursorPosition, b: CursorPosition): number {
    if (a.line !== b.line) {
        return a.line - b.line;
    }
    return a.column - b.column;
}

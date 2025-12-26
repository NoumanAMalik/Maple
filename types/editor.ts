export interface CursorPosition {
    line: number;
    column: number;
}

export interface Selection {
    start: CursorPosition;
    end: CursorPosition;
}

export interface EditorState {
    content: string;
    cursorPosition: CursorPosition;
    selections: Selection[];
    scrollTop: number;
    scrollLeft: number;
}

export interface EditorConfig {
    tabSize: number;
    lineHeight: number;
    fontSize: number;
    fontFamily: string;
    wordWrap: boolean;
    showLineNumbers: boolean;
    showMinimap: boolean;
}

export const defaultEditorConfig: EditorConfig = {
    tabSize: 4,
    lineHeight: 20,
    fontSize: 14,
    fontFamily: "var(--font-mono), monospace",
    wordWrap: false,
    showLineNumbers: true,
    showMinimap: false,
};

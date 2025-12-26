export const EDITOR_CONSTANTS = {
    TAB_SIZE: 4,
    LINE_HEIGHT: 20,
    GUTTER_WIDTH: 60,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    TOKENIZE_DEBOUNCE: 16, // ms - minimal debounce since worker handles heavy lifting
    AUTO_SAVE_DELAY: 500, // ms
} as const;

export const SUPPORTED_LANGUAGES = ["typescript", "javascript", "css", "html", "json", "markdown", "python"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FILE_EXTENSIONS: Record<string, SupportedLanguage> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".css": "css",
    ".html": "html",
    ".htm": "html",
    ".json": "json",
    ".md": "markdown",
    ".markdown": "markdown",
    ".py": "python",
};

export const KEYBOARD_SHORTCUTS = {
    SAVE: { key: "s", meta: true },
    OPEN_FILE: { key: "p", meta: true },
    COMMAND_PALETTE: { key: "p", meta: true, shift: true },
    FIND: { key: "f", meta: true },
    NEW_FILE: { key: "n", meta: true },
    CLOSE_TAB: { key: "w", meta: true },
} as const;

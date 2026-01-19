import type { CursorPosition, Selection } from "@/types/editor";

export function createCursor(line: number, column: number): CursorPosition {
    return { line, column };
}

export function createSelection(
    anchorLine: number,
    anchorCol: number,
    activeLine: number,
    activeCol: number,
): Selection {
    return {
        anchor: { line: anchorLine, column: anchorCol },
        active: { line: activeLine, column: activeCol },
    };
}

export function waitForDebounce(ms = 400): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

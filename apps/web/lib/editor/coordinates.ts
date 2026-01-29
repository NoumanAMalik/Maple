import type { CursorPosition, EditorConfig } from "@/types/editor";
import { EDITOR_CONSTANTS } from "@/utils/constants";

/**
 * Coordinate converter for translating between pixel positions
 * and document positions. Uses canvas for accurate text measurement.
 */
export interface CoordinateConverter {
    config: EditorConfig;
    charWidth: number;
    gutterWidth: number;
    padding: number;
}

/**
 * Create a coordinate converter with the given configuration.
 * Uses monospace font assumption for character width calculation.
 */
export function createCoordinateConverter(config: EditorConfig): CoordinateConverter {
    // Calculate character width using canvas measurement
    const charWidth = measureCharWidth(config.fontFamily, config.fontSize);

    return {
        config,
        charWidth,
        gutterWidth: EDITOR_CONSTANTS.GUTTER_WIDTH,
        padding: 8,
    };
}

/**
 * Measure the width of a single character for the given font.
 * Uses DOM measurement for accurate results that match CSS rendering.
 * Assumes monospace font for consistent character widths.
 */
function measureCharWidth(fontFamily: string, fontSize: number): number {
    if (typeof document === "undefined") {
        // SSR fallback
        return fontSize * 0.6;
    }

    // Create a temporary element that matches the Line component structure exactly
    const measureElement = document.createElement("div");
    measureElement.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre;
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        line-height: 1;
        padding: 0;
        margin: 0;
        border: 0;
    `;
    // Use lowercase characters that are common in code - these should all be same width in monospace
    measureElement.textContent = "0123456789";
    document.body.appendChild(measureElement);

    const width = measureElement.getBoundingClientRect().width / 10;

    document.body.removeChild(measureElement);

    return width;
}

/**
 * Convert pixel coordinates to a cursor position.
 *
 * @param converter - The coordinate converter
 * @param x - X coordinate relative to editor content area
 * @param y - Y coordinate relative to editor content area
 * @param scrollTop - Current vertical scroll offset
 * @param scrollLeft - Current horizontal scroll offset
 * @param lineCount - Total number of lines in the document
 * @param getLineLength - Function to get the length of a specific line
 * @returns The cursor position at the given pixel coordinates
 */
export function pixelToPosition(
    converter: CoordinateConverter,
    x: number,
    y: number,
    scrollTop: number,
    scrollLeft: number,
    lineCount: number,
    getLineLength: (lineNumber: number) => number,
): CursorPosition {
    const { config, charWidth, gutterWidth, padding } = converter;
    const lineHeight = config.lineHeight;

    // Calculate line number from y coordinate
    const adjustedY = y + scrollTop;
    let line = Math.floor(adjustedY / lineHeight) + 1;
    line = Math.max(1, Math.min(line, lineCount));

    // Calculate column from x coordinate
    const adjustedX = x + scrollLeft - gutterWidth - padding;

    if (adjustedX <= 0) {
        return { line, column: 1 };
    }

    // Calculate column based on character width
    const lineLength = getLineLength(line);
    let column = Math.round(adjustedX / charWidth) + 1;
    column = Math.max(1, Math.min(column, lineLength + 1));

    return { line, column };
}

/**
 * Convert a cursor position to pixel coordinates.
 *
 * @param converter - The coordinate converter
 * @param position - The cursor position (1-indexed)
 * @param scrollTop - Current vertical scroll offset
 * @param scrollLeft - Current horizontal scroll offset
 * @returns The pixel coordinates for the cursor
 */
export function positionToPixel(
    converter: CoordinateConverter,
    position: CursorPosition,
    scrollTop: number,
    scrollLeft: number,
): { x: number; y: number } {
    const { config, charWidth, gutterWidth, padding } = converter;
    const lineHeight = config.lineHeight;

    // Calculate y from line number
    const y = (position.line - 1) * lineHeight - scrollTop;

    // Calculate x from column
    const x = gutterWidth + padding + (position.column - 1) * charWidth - scrollLeft;

    return { x, y };
}

/**
 * Calculate the visible line range for virtual scrolling.
 *
 * @param scrollTop - Current vertical scroll offset
 * @param viewportHeight - Height of the visible viewport
 * @param lineHeight - Height of each line
 * @param lineCount - Total number of lines
 * @param buffer - Number of extra lines to render above/below (default: 5)
 * @returns The range of lines that should be rendered
 */
export function getVisibleLineRange(
    scrollTop: number,
    viewportHeight: number,
    lineHeight: number,
    lineCount: number,
    buffer = 5,
): { firstVisibleLine: number; lastVisibleLine: number } {
    if (lineCount <= 0 || lineHeight <= 0) {
        return { firstVisibleLine: 0, lastVisibleLine: 0 };
    }

    const firstVisible = Math.floor(scrollTop / lineHeight) + 1;
    const visibleLines = Math.ceil(viewportHeight / lineHeight);
    const lastVisible = firstVisible + visibleLines - 1;

    return {
        firstVisibleLine: Math.max(1, firstVisible - buffer),
        lastVisibleLine: Math.min(lineCount, lastVisible + buffer),
    };
}

/**
 * Calculate the pixel offset for the first rendered line.
 * Used for positioning the virtual scroll container.
 *
 * @param firstVisibleLine - The first line being rendered
 * @param lineHeight - Height of each line
 * @returns The top offset in pixels
 */
export function getScrollOffset(firstVisibleLine: number, lineHeight: number): number {
    return (firstVisibleLine - 1) * lineHeight;
}

/**
 * Calculate the total content height for the scroll container.
 *
 * @param lineCount - Total number of lines
 * @param lineHeight - Height of each line
 * @returns The total content height in pixels
 */
export function getTotalContentHeight(lineCount: number, lineHeight: number): number {
    return lineCount * lineHeight;
}

/**
 * Calculate the width needed to display a line without wrapping.
 *
 * @param lineLength - Number of characters in the line
 * @param charWidth - Width of a single character
 * @param padding - Padding on each side
 * @returns The width needed for the line in pixels
 */
export function getLineWidth(lineLength: number, charWidth: number, padding: number): number {
    return lineLength * charWidth + padding * 2;
}

/**
 * Get the maximum content width across all visible lines.
 * Used for horizontal scrolling.
 *
 * @param lines - Array of line content strings
 * @param charWidth - Width of a single character
 * @param padding - Padding on each side
 * @param gutterWidth - Width of the line number gutter
 * @returns The maximum content width in pixels
 */
export function getMaxContentWidth(lines: string[], charWidth: number, padding: number, gutterWidth: number): number {
    let maxLength = 0;
    for (const line of lines) {
        maxLength = Math.max(maxLength, line.length);
    }
    return gutterWidth + maxLength * charWidth + padding * 2;
}

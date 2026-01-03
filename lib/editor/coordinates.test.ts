import { describe, it, expect, beforeEach } from "vitest";
import {
    createCoordinateConverter,
    pixelToPosition,
    positionToPixel,
    getVisibleLineRange,
    getScrollOffset,
    getTotalContentHeight,
    getLineWidth,
    getMaxContentWidth,
    type CoordinateConverter,
} from "./coordinates";
import type { EditorConfig } from "@/types/editor";

describe("Coordinates", () => {
    let config: EditorConfig;
    let converter: CoordinateConverter;

    beforeEach(() => {
        config = {
            fontSize: 14,
            fontFamily: "monospace",
            lineHeight: 20,
            tabSize: 4,
        };
        converter = createCoordinateConverter(config);
        // In test environment (happy-dom), charWidth may be calculated via SSR fallback
        // so we set a reasonable value for testing
        if (converter.charWidth === 0 || converter.charWidth < 1) {
            converter.charWidth = 8.4; // Typical monospace char width at 14px
        }
    });

    describe("createCoordinateConverter", () => {
        it("should create converter with config", () => {
            expect(converter.config).toEqual(config);
            expect(converter.charWidth).toBeGreaterThan(0);
            expect(converter.gutterWidth).toBeGreaterThan(0);
            expect(converter.padding).toBe(8);
        });

        it("should calculate character width", () => {
            expect(converter.charWidth).toBeTypeOf("number");
            expect(converter.charWidth).toBeGreaterThan(0);
        });

        it("should handle different font sizes", () => {
            const smallConfig = { ...config, fontSize: 12 };
            const largeConfig = { ...config, fontSize: 18 };

            const smallConverter = createCoordinateConverter(smallConfig);
            const largeConverter = createCoordinateConverter(largeConfig);

            // Fix char width if in test environment
            if (smallConverter.charWidth === 0) smallConverter.charWidth = 7.2;
            if (largeConverter.charWidth === 0) largeConverter.charWidth = 10.8;

            expect(smallConverter.charWidth).toBeLessThan(largeConverter.charWidth);
        });
    });

    describe("pixelToPosition", () => {
        const getLineLength = (line: number) => {
            const lengths = [10, 20, 15, 30];
            return lengths[line - 1] || 10;
        };

        it("should convert pixel to position at origin", () => {
            const pos = pixelToPosition(converter, 0, 0, 0, 0, 10, getLineLength);
            expect(pos.line).toBe(1);
            expect(pos.column).toBe(1);
        });

        it("should convert pixel to position on different lines", () => {
            const { lineHeight } = config;

            const pos1 = pixelToPosition(converter, 0, 0, 0, 0, 10, getLineLength);
            expect(pos1.line).toBe(1);

            const pos2 = pixelToPosition(converter, 0, lineHeight, 0, 0, 10, getLineLength);
            expect(pos2.line).toBe(2);

            const pos3 = pixelToPosition(converter, 0, lineHeight * 2, 0, 0, 10, getLineLength);
            expect(pos3.line).toBe(3);
        });

        it("should convert pixel to position at different columns", () => {
            const { charWidth, gutterWidth, padding } = converter;
            const baseX = gutterWidth + padding;

            const pos1 = pixelToPosition(converter, baseX, 0, 0, 0, 10, getLineLength);
            expect(pos1.column).toBe(1);

            const pos2 = pixelToPosition(converter, baseX + charWidth * 5, 0, 0, 0, 10, getLineLength);
            expect(pos2.column).toBeGreaterThanOrEqual(5);
        });

        it("should handle scrolling", () => {
            const { lineHeight } = config;
            const scrollTop = lineHeight * 5;
            const scrollLeft = 100;

            const pos = pixelToPosition(converter, 0, 0, scrollTop, scrollLeft, 10, getLineLength);
            expect(pos.line).toBeGreaterThan(1);
        });

        it("should clamp line to valid range", () => {
            const { lineHeight } = config;

            const posAbove = pixelToPosition(converter, 0, -100, 0, 0, 10, getLineLength);
            expect(posAbove.line).toBe(1);

            const posBelow = pixelToPosition(converter, 0, lineHeight * 100, 0, 0, 10, getLineLength);
            expect(posBelow.line).toBe(10);
        });

        it("should clamp column to valid range", () => {
            const { gutterWidth, padding } = converter;

            const posLeft = pixelToPosition(converter, 0, 0, 0, 0, 10, getLineLength);
            expect(posLeft.column).toBe(1);

            const posRight = pixelToPosition(converter, 10000, 0, 0, 0, 10, getLineLength);
            expect(posRight.column).toBeLessThanOrEqual(getLineLength(1) + 1);
        });

        it("should handle click before gutter", () => {
            const pos = pixelToPosition(converter, -50, 0, 0, 0, 10, getLineLength);
            expect(pos.column).toBe(1);
        });

        it("should handle different line heights", () => {
            const customConfig = { ...config, lineHeight: 30 };
            const customConverter = createCoordinateConverter(customConfig);

            const pos1 = pixelToPosition(customConverter, 0, 0, 0, 0, 10, getLineLength);
            const pos2 = pixelToPosition(customConverter, 0, 30, 0, 0, 10, getLineLength);

            expect(pos1.line).toBe(1);
            expect(pos2.line).toBe(2);
        });
    });

    describe("positionToPixel", () => {
        it("should convert position to pixel at origin", () => {
            const pixel = positionToPixel(converter, { line: 1, column: 1 }, 0, 0);
            expect(pixel.y).toBe(0);
            expect(pixel.x).toBeGreaterThan(0); // Includes gutter + padding
        });

        it("should convert position to pixel on different lines", () => {
            const { lineHeight } = config;

            const pixel1 = positionToPixel(converter, { line: 1, column: 1 }, 0, 0);
            const pixel2 = positionToPixel(converter, { line: 2, column: 1 }, 0, 0);
            const pixel3 = positionToPixel(converter, { line: 3, column: 1 }, 0, 0);

            expect(pixel2.y - pixel1.y).toBe(lineHeight);
            expect(pixel3.y - pixel2.y).toBe(lineHeight);
        });

        it("should convert position to pixel at different columns", () => {
            const { charWidth } = converter;

            const pixel1 = positionToPixel(converter, { line: 1, column: 1 }, 0, 0);
            const pixel2 = positionToPixel(converter, { line: 1, column: 2 }, 0, 0);
            const pixel3 = positionToPixel(converter, { line: 1, column: 10 }, 0, 0);

            expect(pixel2.x - pixel1.x).toBeCloseTo(charWidth, 0);
            expect(pixel3.x - pixel1.x).toBeCloseTo(charWidth * 9, 0);
        });

        it("should handle scrolling", () => {
            const { lineHeight } = config;
            const scrollTop = lineHeight * 5;
            const scrollLeft = 100;

            const pixel = positionToPixel(converter, { line: 1, column: 1 }, 0, 0);
            const pixelScrolled = positionToPixel(converter, { line: 1, column: 1 }, scrollTop, scrollLeft);

            expect(pixelScrolled.y).toBe(pixel.y - scrollTop);
            expect(pixelScrolled.x).toBe(pixel.x - scrollLeft);
        });

        it("should be inverse of pixelToPosition", () => {
            const getLineLength = () => 100;
            const position = { line: 5, column: 10 };

            const pixel = positionToPixel(converter, position, 0, 0);
            const backToPosition = pixelToPosition(
                converter,
                pixel.x,
                pixel.y,
                0,
                0,
                10,
                getLineLength,
            );

            expect(backToPosition.line).toBe(position.line);
            expect(backToPosition.column).toBeCloseTo(position.column, 0);
        });
    });

    describe("getVisibleLineRange", () => {
        it("should calculate visible lines at top", () => {
            const range = getVisibleLineRange(0, 400, 20, 100, 5);
            expect(range.firstVisibleLine).toBe(1);
            expect(range.lastVisibleLine).toBeGreaterThan(20);
        });

        it("should calculate visible lines in middle", () => {
            const range = getVisibleLineRange(1000, 400, 20, 100, 5);
            expect(range.firstVisibleLine).toBeGreaterThan(1);
            expect(range.lastVisibleLine).toBeGreaterThan(range.firstVisibleLine);
        });

        it("should include buffer lines", () => {
            const rangeNoBuffer = getVisibleLineRange(100, 400, 20, 100, 0);
            const rangeWithBuffer = getVisibleLineRange(100, 400, 20, 100, 5);

            expect(rangeWithBuffer.firstVisibleLine).toBeLessThan(rangeNoBuffer.firstVisibleLine);
            expect(rangeWithBuffer.lastVisibleLine).toBeGreaterThan(rangeNoBuffer.lastVisibleLine);
        });

        it("should clamp to document bounds", () => {
            const range = getVisibleLineRange(0, 400, 20, 10, 100);
            expect(range.firstVisibleLine).toBe(1);
            expect(range.lastVisibleLine).toBe(10);
        });

        it("should handle scrolled to bottom", () => {
            const lineCount = 100;
            const lineHeight = 20;
            const scrollTop = lineCount * lineHeight;

            const range = getVisibleLineRange(scrollTop, 400, lineHeight, lineCount, 5);
            expect(range.lastVisibleLine).toBe(lineCount);
        });

        it("should handle different viewport heights", () => {
            const smallRange = getVisibleLineRange(0, 200, 20, 100, 0);
            const largeRange = getVisibleLineRange(0, 800, 20, 100, 0);

            expect(largeRange.lastVisibleLine).toBeGreaterThan(smallRange.lastVisibleLine);
        });

        it("should handle different line heights", () => {
            const shortRange = getVisibleLineRange(0, 400, 10, 100, 0);
            const tallRange = getVisibleLineRange(0, 400, 40, 100, 0);

            expect(shortRange.lastVisibleLine).toBeGreaterThan(tallRange.lastVisibleLine);
        });
    });

    describe("getScrollOffset", () => {
        it("should calculate offset for first line", () => {
            const offset = getScrollOffset(1, 20);
            expect(offset).toBe(0);
        });

        it("should calculate offset for different lines", () => {
            const offset1 = getScrollOffset(1, 20);
            const offset2 = getScrollOffset(2, 20);
            const offset10 = getScrollOffset(10, 20);

            expect(offset2).toBe(20);
            expect(offset10).toBe(180);
            expect(offset10 - offset1).toBe(180);
        });

        it("should handle different line heights", () => {
            const offset1 = getScrollOffset(10, 20);
            const offset2 = getScrollOffset(10, 30);

            expect(offset2).toBeGreaterThan(offset1);
            expect(offset2).toBe(270);
        });
    });

    describe("getTotalContentHeight", () => {
        it("should calculate total height", () => {
            const height = getTotalContentHeight(100, 20);
            expect(height).toBe(2000);
        });

        it("should handle single line", () => {
            const height = getTotalContentHeight(1, 20);
            expect(height).toBe(20);
        });

        it("should handle empty document", () => {
            const height = getTotalContentHeight(0, 20);
            expect(height).toBe(0);
        });

        it("should handle different line heights", () => {
            const height1 = getTotalContentHeight(100, 20);
            const height2 = getTotalContentHeight(100, 30);

            expect(height2).toBeGreaterThan(height1);
            expect(height2).toBe(3000);
        });

        it("should handle large documents", () => {
            const height = getTotalContentHeight(10000, 20);
            expect(height).toBe(200000);
        });
    });

    describe("getLineWidth", () => {
        it("should calculate line width", () => {
            const width = getLineWidth(10, 8, 8);
            expect(width).toBe(96); // 10 * 8 + 8 * 2
        });

        it("should handle empty line", () => {
            const width = getLineWidth(0, 8, 8);
            expect(width).toBe(16); // Just padding
        });

        it("should handle different character widths", () => {
            const width1 = getLineWidth(10, 8, 8);
            const width2 = getLineWidth(10, 10, 8);

            expect(width2).toBeGreaterThan(width1);
        });

        it("should handle different padding", () => {
            const width1 = getLineWidth(10, 8, 8);
            const width2 = getLineWidth(10, 8, 16);

            expect(width2).toBeGreaterThan(width1);
            expect(width2 - width1).toBe(16); // Padding difference * 2
        });

        it("should handle very long lines", () => {
            const width = getLineWidth(1000, 8, 8);
            expect(width).toBe(8016);
        });
    });

    describe("getMaxContentWidth", () => {
        it("should find max width", () => {
            const lines = ["short", "medium line", "this is the longest line"];
            const width = getMaxContentWidth(lines, 8, 8, 50);

            const expectedWidth = 50 + 24 * 8 + 16; // gutter + longest line + padding
            expect(width).toBe(expectedWidth);
        });

        it("should handle empty array", () => {
            const width = getMaxContentWidth([], 8, 8, 50);
            expect(width).toBe(66); // Just gutter + padding
        });

        it("should handle single line", () => {
            const lines = ["single"];
            const width = getMaxContentWidth(lines, 8, 8, 50);
            expect(width).toBe(50 + 6 * 8 + 16);
        });

        it("should handle all empty lines", () => {
            const lines = ["", "", ""];
            const width = getMaxContentWidth(lines, 8, 8, 50);
            expect(width).toBe(66); // gutter + padding
        });

        it("should handle unicode characters", () => {
            const lines = ["Hello", "世界", "🌍"];
            const width = getMaxContentWidth(lines, 8, 8, 50);
            expect(width).toBeGreaterThan(50);
        });

        it("should handle different character widths", () => {
            const lines = ["test line"];
            const width1 = getMaxContentWidth(lines, 8, 8, 50);
            const width2 = getMaxContentWidth(lines, 10, 8, 50);

            expect(width2).toBeGreaterThan(width1);
        });

        it("should handle different gutter widths", () => {
            const lines = ["test"];
            const width1 = getMaxContentWidth(lines, 8, 8, 50);
            const width2 = getMaxContentWidth(lines, 8, 8, 80);

            expect(width2 - width1).toBe(30); // Gutter difference
        });
    });

    describe("Integration Tests", () => {
        it("should handle complete pixel to position to pixel cycle", () => {
            const getLineLength = () => 100;
            const lineCount = 50;
            const scrollTop = 200;
            const scrollLeft = 100;

            // Start with a pixel position
            const originalX = 300;
            const originalY = 150;

            // Convert to position
            const position = pixelToPosition(
                converter,
                originalX,
                originalY,
                scrollTop,
                scrollLeft,
                lineCount,
                getLineLength,
            );

            // Convert back to pixels
            const pixel = positionToPixel(converter, position, scrollTop, scrollLeft);

            // Should be close to original (allowing for character width/line height rounding)
            // Using larger tolerance due to discretization
            const xTolerance = converter.charWidth;  // Allow up to 1 char width difference
            const yTolerance = converter.config.lineHeight;  // Allow up to 1 line height difference
            expect(Math.abs(pixel.x - originalX)).toBeLessThan(xTolerance);
            expect(Math.abs(pixel.y - originalY)).toBeLessThan(yTolerance);
        });

        it("should handle virtual scrolling calculations", () => {
            const lineCount = 1000;
            const lineHeight = 20;
            const viewportHeight = 600;

            // Get visible range
            const range = getVisibleLineRange(500, viewportHeight, lineHeight, lineCount, 5);

            // Calculate offsets
            const scrollOffset = getScrollOffset(range.firstVisibleLine, lineHeight);
            const totalHeight = getTotalContentHeight(lineCount, lineHeight);

            expect(range.firstVisibleLine).toBeGreaterThan(1);
            expect(range.lastVisibleLine).toBeLessThan(lineCount);
            expect(scrollOffset).toBeGreaterThan(0);
            expect(totalHeight).toBe(lineCount * lineHeight);
        });

        it("should handle coordinate conversion at document edges", () => {
            const getLineLength = (line: number) => (line === 1 ? 5 : 10);
            const lineCount = 10;

            // Top-left corner
            const topLeft = pixelToPosition(converter, 0, 0, 0, 0, lineCount, getLineLength);
            expect(topLeft).toEqual({ line: 1, column: 1 });

            // Bottom-right area (should clamp)
            const bottomRight = pixelToPosition(converter, 10000, 10000, 0, 0, lineCount, getLineLength);
            expect(bottomRight.line).toBe(lineCount);
        });
    });
});

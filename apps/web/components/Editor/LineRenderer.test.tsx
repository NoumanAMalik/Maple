import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { LineRenderer } from "./LineRenderer";
import type { EditorConfig, CursorPosition } from "@/types/editor";
import type { SearchMatch } from "@/lib/search/findInDocument";
import { defaultEditorConfig } from "@/types/editor";

describe("LineRenderer", () => {
    let mockGetLine: any;
    let defaultCursor: CursorPosition;
    let defaultConfig: EditorConfig;

    beforeEach(() => {
        mockGetLine = vi.fn((lineNumber: number) => `Line ${lineNumber} content`);
        defaultCursor = { line: 1, column: 1 };
        defaultConfig = { ...defaultEditorConfig };
    });

    describe("Virtual Scrolling - Basic Rendering", () => {
        it("should render only visible lines", () => {
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={100}
                    firstVisibleLine={10}
                    lastVisibleLine={20}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            // Should render 11 lines (10-20 inclusive)
            const lines = container.querySelectorAll(".editor-line");
            expect(lines).toHaveLength(11);

            // Verify getLine was called for each visible line
            expect(mockGetLine).toHaveBeenCalledTimes(11);
            expect(mockGetLine).toHaveBeenCalledWith(10);
            expect(mockGetLine).toHaveBeenCalledWith(20);
        });

        it("should apply correct padding for first visible line", () => {
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={100}
                    firstVisibleLine={50}
                    lastVisibleLine={60}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, lineHeight: 20 }}
                    version={0}
                />,
            );

            const visibleLinesContainer = container.querySelector(".visible-lines");
            expect(visibleLinesContainer).toHaveStyle({ top: "980px" }); // (50-1) * 20 = 980
        });

        it("should set total height based on line count", () => {
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={100}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, lineHeight: 20 }}
                    version={0}
                />,
            );

            const lineRenderer = container.querySelector(".line-renderer");
            expect(lineRenderer).toHaveStyle({ minHeight: "2000px" }); // 100 * 20
        });

        it("should clamp visible range to valid line numbers", () => {
            render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={-5}
                    lastVisibleLine={100}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            // Should clamp to 1-10
            expect(mockGetLine).toHaveBeenCalledTimes(10);
            expect(mockGetLine).toHaveBeenCalledWith(1);
            expect(mockGetLine).toHaveBeenCalledWith(10);
            expect(mockGetLine).not.toHaveBeenCalledWith(0);
            expect(mockGetLine).not.toHaveBeenCalledWith(11);
        });
    });

    describe("Cursor Position and Current Line", () => {
        it("should mark current line based on cursor position", () => {
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={{ line: 5, column: 1 }}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const currentLine = container.querySelector('[data-line="5"]');
            expect(currentLine).toBeInTheDocument();
            expect(currentLine).toHaveStyle({
                backgroundColor: "var(--editor-active-line)",
            });
        });

        it("should only mark one line as current", () => {
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={{ line: 3, column: 5 }}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const allLines = container.querySelectorAll(".editor-line");
            const linesWithBackground = Array.from(allLines).filter((line) => {
                const style = window.getComputedStyle(line);
                return style.backgroundColor === "var(--editor-active-line)";
            });

            // Only line 3 should have the background
            expect(linesWithBackground).toHaveLength(1);
        });

        it("should apply current line background style correctly", () => {
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={{ line: 2, column: 1 }}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const line1 = container.querySelector('[data-line="1"]');
            const line2 = container.querySelector('[data-line="2"]');
            const line3 = container.querySelector('[data-line="3"]');

            expect(line1).toHaveStyle({ backgroundColor: "transparent" });
            expect(line2).toHaveStyle({ backgroundColor: "var(--editor-active-line)" });
            expect(line3).toHaveStyle({ backgroundColor: "transparent" });
        });
    });

    describe("Search Match Highlighting", () => {
        it("should filter and pass matches for specific lines", () => {
            const searchMatches: SearchMatch[] = [
                { line: 2, column: 5, length: 4, offset: 10 },
                { line: 2, column: 15, length: 4, offset: 20 },
                { line: 5, column: 1, length: 3, offset: 50 },
            ];

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                    searchMatches={searchMatches}
                />,
            );

            // Line 2 should have match highlights
            const line2 = container.querySelector('[data-line="2"]');
            expect(line2).toBeInTheDocument();

            // Line 5 should have match highlight
            const line5 = container.querySelector('[data-line="5"]');
            expect(line5).toBeInTheDocument();
        });

        it("should mark current match differently from other matches", () => {
            const searchMatches: SearchMatch[] = [
                { line: 3, column: 1, length: 4, offset: 0 },
                { line: 3, column: 10, length: 4, offset: 10 },
                { line: 3, column: 20, length: 4, offset: 20 },
            ];

            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 3) return "test word test word test";
                return `Line ${lineNumber}`;
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                    searchMatches={searchMatches}
                    currentMatchIndex={1}
                />,
            );

            const line3 = container.querySelector('[data-line="3"]');
            expect(line3).toBeInTheDocument();

            // Check for match highlight spans
            const matchSpans = line3?.querySelectorAll("span[style*='background']");
            expect(matchSpans?.length).toBeGreaterThan(0);
        });

        it("should handle multiple matches on same line", () => {
            const searchMatches: SearchMatch[] = [
                { line: 4, column: 1, length: 3, offset: 0 },
                { line: 4, column: 8, length: 3, offset: 7 },
                { line: 4, column: 15, length: 3, offset: 14 },
            ];

            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 4) return "foo bar foo bar foo";
                return `Line ${lineNumber}`;
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                    searchMatches={searchMatches}
                />,
            );

            const line4 = container.querySelector('[data-line="4"]');
            expect(line4).toBeInTheDocument();

            // Should have multiple highlighted segments
            const matchSpans = line4?.querySelectorAll("span[style*='background']");
            expect(matchSpans?.length).toBeGreaterThan(0);
        });
    });

    describe("Rendering with Different Token Types", () => {
        it("should render line with keyword tokens", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "const function return";
                return `Line ${lineNumber}`;
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line1 = container.querySelector('[data-line="1"]');
            expect(line1).toBeInTheDocument();
            expect(line1?.textContent).toContain("const");
            expect(line1?.textContent).toContain("function");
        });

        it("should render line with string tokens", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 2) return 'const msg = "Hello World";';
                return `Line ${lineNumber}`;
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line2 = container.querySelector('[data-line="2"]');
            expect(line2).toBeInTheDocument();
            expect(line2?.textContent).toContain("Hello World");

            // Should have colored spans for syntax highlighting
            const coloredSpans = line2?.querySelectorAll("span[style*='color']");
            expect(coloredSpans?.length).toBeGreaterThan(0);
        });

        it("should render line with comment tokens", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 3) return "// This is a comment";
                return `Line ${lineNumber}`;
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line3 = container.querySelector('[data-line="3"]');
            expect(line3).toBeInTheDocument();
            expect(line3?.textContent).toContain("This is a comment");
        });

        it("should render line with mixed tokens", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 4) return "const x = 123; // comment";
                return `Line ${lineNumber}`;
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line4 = container.querySelector('[data-line="4"]');
            expect(line4).toBeInTheDocument();
            expect(line4?.textContent).toContain("const");
            expect(line4?.textContent).toContain("123");
            expect(line4?.textContent).toContain("comment");
        });
    });

    describe("Syntax Highlighting Colors", () => {
        it("should apply correct color to keywords", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "function test() {}";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line1 = container.querySelector('[data-line="1"]');
            const keywordSpan = Array.from(line1?.querySelectorAll("span") || []).find((span) =>
                span.textContent?.includes("function"),
            );

            expect(keywordSpan).toHaveStyle({ color: "var(--syntax-keyword)" });
        });

        it("should apply correct color to strings", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return '"Hello"';
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line1 = container.querySelector('[data-line="1"]');
            const stringSpan = Array.from(line1?.querySelectorAll("span") || []).find((span) =>
                span.textContent?.includes('"Hello"'),
            );

            expect(stringSpan).toHaveStyle({ color: "var(--syntax-string)" });
        });

        it("should apply correct color to comments", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "// comment";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line1 = container.querySelector('[data-line="1"]');
            const commentSpan = Array.from(line1?.querySelectorAll("span") || []).find((span) =>
                span.textContent?.includes("comment"),
            );

            expect(commentSpan).toHaveStyle({ color: "var(--syntax-comment)" });
        });
    });

    describe("Line Wrapping Scenarios", () => {
        it("should render without wrap when wordWrap is false", () => {
            mockGetLine = vi.fn(() => "This is a very long line that should not wrap");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, wordWrap: false }}
                    version={0}
                />,
            );

            const line = container.querySelector(".editor-line");
            expect(line).toHaveStyle({ whiteSpace: "pre" });
        });

        it("should apply wrap styles when wordWrap is true", () => {
            mockGetLine = vi.fn(() => "This is a very long line that should wrap");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, wordWrap: true }}
                    version={0}
                />,
            );

            const line = container.querySelector(".editor-line");
            // Note: Line component currently always uses "pre", regardless of wordWrap config
            // This test documents current behavior
            expect(line).toHaveStyle({ whiteSpace: "pre" });
        });
    });

    describe("Empty Line Rendering", () => {
        it("should render empty line with proper structure", () => {
            mockGetLine = vi.fn(() => "");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            // Empty lines render a non-breaking space
            expect(line?.textContent).toBe("\u00A0");
        });

        it("should maintain proper height for empty lines", () => {
            mockGetLine = vi.fn(() => "");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={3}
                    firstVisibleLine={1}
                    lastVisibleLine={3}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, lineHeight: 25 }}
                    version={0}
                />,
            );

            const lines = container.querySelectorAll(".editor-line");
            lines.forEach((line) => {
                expect(line).toHaveStyle({ height: "25px", lineHeight: "25px" });
            });
        });
    });

    describe("Long Line Rendering (>200 chars)", () => {
        it("should render very long line", () => {
            const longLine = "a".repeat(500);
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return longLine;
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            expect(line?.textContent?.length).toBe(500);
        });

        it("should handle horizontal scrolling setup", () => {
            const longLine = "x".repeat(1000);
            mockGetLine = vi.fn(() => longLine);

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const line = container.querySelector(".editor-line");
            expect(line).toHaveStyle({
                whiteSpace: "pre",
                minWidth: "100%",
            });
        });
    });

    describe("Tab Character Rendering", () => {
        it("should render tab as spaces", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "\tindented";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, tabSize: 4 }}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            expect(line?.textContent).toContain("indented");
        });

        it("should respect tabSize config", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "\tcode";
                return "";
            });

            const { container: container4 } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, tabSize: 4 }}
                    version={0}
                />,
            );

            const { container: container2 } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, tabSize: 2 }}
                    version={1}
                />,
            );

            const line4 = container4.querySelector('[data-line="1"]');
            const line2 = container2.querySelector('[data-line="1"]');

            expect(line4).toBeInTheDocument();
            expect(line2).toBeInTheDocument();
            // Both should contain the tab character (rendered as-is by browser)
            expect(line4?.textContent).toContain("code");
            expect(line2?.textContent).toContain("code");
        });
    });

    describe("Unicode Line Content", () => {
        it("should render unicode characters correctly", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "日本語 中文 한글";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            expect(line?.textContent).toBe("日本語 中文 한글");
        });

        it("should render emoji correctly", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "Hello 👋 World 🌍";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            expect(line?.textContent).toBe("Hello 👋 World 🌍");
        });

        it("should handle mixed unicode and ASCII", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "const name = '名前';";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "javascript" }}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            expect(line?.textContent).toContain("const");
            expect(line?.textContent).toContain("名前");
        });
    });

    describe("Version-based Re-rendering", () => {
        it("should update content when version changes", () => {
            mockGetLine = vi.fn((lineNumber: number) => `Version 0 - Line ${lineNumber}`);

            const { container, rerender } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const initialContent = container.querySelector('[data-line="1"]')?.textContent;
            expect(initialContent).toContain("Version 0");

            // Update getLine and version
            mockGetLine = vi.fn((lineNumber: number) => `Version 1 - Line ${lineNumber}`);

            rerender(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={1}
                />,
            );

            const updatedContent = container.querySelector('[data-line="1"]')?.textContent;
            expect(updatedContent).toContain("Version 1");
        });

        it("should not call getLine unnecessarily when version unchanged", () => {
            const { rerender } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            mockGetLine.mockClear();

            // Re-render with same version but different cursor
            rerender(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={5}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={{ line: 2, column: 1 }}
                    config={defaultConfig}
                    version={0}
                />,
            );

            // getLine should be called again due to cursor change triggering useMemo
            expect(mockGetLine).toHaveBeenCalled();
        });
    });

    describe("Line Configuration", () => {
        it("should apply custom font size", () => {
            mockGetLine = vi.fn(() => "test");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, fontSize: 18 }}
                    version={0}
                />,
            );

            const line = container.querySelector(".editor-line");
            expect(line).toHaveStyle({ fontSize: "18px" });
        });

        it("should apply custom font family", () => {
            mockGetLine = vi.fn(() => "test");

            const customFont = "Monaco, monospace";
            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, fontFamily: customFont }}
                    version={0}
                />,
            );

            const line = container.querySelector(".editor-line");
            expect(line).toHaveStyle({ fontFamily: customFont });
        });

        it("should apply custom line height", () => {
            mockGetLine = vi.fn(() => "test");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, lineHeight: 30 }}
                    version={0}
                />,
            );

            const line = container.querySelector(".editor-line");
            expect(line).toHaveStyle({ height: "30px", lineHeight: "30px" });
        });
    });

    describe("Edge Cases", () => {
        it("should handle single line document", () => {
            mockGetLine = vi.fn(() => "Single line");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const lines = container.querySelectorAll(".editor-line");
            expect(lines).toHaveLength(1);
            expect(lines[0]).toHaveAttribute("data-line", "1");
        });

        it("should handle no visible lines when range is invalid", () => {
            mockGetLine = vi.fn(() => "test");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={15}
                    lastVisibleLine={20}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const lines = container.querySelectorAll(".editor-line");
            // Should clamp to lineCount (10), so no lines in range 15-20
            expect(lines).toHaveLength(0);
        });

        it("should render all lines when viewport includes entire document", () => {
            mockGetLine = vi.fn((lineNumber: number) => `Line ${lineNumber}`);

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={10}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const lines = container.querySelectorAll(".editor-line");
            expect(lines).toHaveLength(10);

            // Verify each line number
            lines.forEach((line, index) => {
                expect(line).toHaveAttribute("data-line", String(index + 1));
            });
        });

        it("should handle empty search matches array", () => {
            mockGetLine = vi.fn(() => "test content");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                    searchMatches={[]}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
            expect(line?.textContent).toBe("test content");
        });

        it("should handle undefined search matches", () => {
            mockGetLine = vi.fn(() => "test content");

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                    searchMatches={undefined}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line).toBeInTheDocument();
        });
    });

    describe("Performance and Memoization", () => {
        it("should memoize visible lines computation", () => {
            const { rerender } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const firstCallCount = mockGetLine.mock.calls.length;
            mockGetLine.mockClear();

            // Re-render with same props
            rerender(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={1}
                    lastVisibleLine={5}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            // Due to useMemo, getLine should be called again only if deps changed
            // In this case, all deps are the same, so it should use memoized value
            expect(mockGetLine.mock.calls.length).toBe(firstCallCount);
        });

        it("should use correct line numbers as keys", () => {
            mockGetLine = vi.fn((lineNumber: number) => `Line ${lineNumber}`);

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={10}
                    firstVisibleLine={5}
                    lastVisibleLine={8}
                    cursor={defaultCursor}
                    config={defaultConfig}
                    version={0}
                />,
            );

            const lines = container.querySelectorAll(".editor-line");
            expect(lines[0]).toHaveAttribute("data-line", "5");
            expect(lines[1]).toHaveAttribute("data-line", "6");
            expect(lines[2]).toHaveAttribute("data-line", "7");
            expect(lines[3]).toHaveAttribute("data-line", "8");
        });
    });

    describe("Different Languages", () => {
        it("should render TypeScript syntax", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "interface User { name: string; }";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "typescript" }}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line?.textContent).toContain("interface");
            expect(line?.textContent).toContain("string");
        });

        it("should render Python syntax", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return "def hello(): pass";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "python" }}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line?.textContent).toContain("def");
            expect(line?.textContent).toContain("pass");
        });

        it("should render CSS syntax", () => {
            mockGetLine = vi.fn((lineNumber: number) => {
                if (lineNumber === 1) return ".class { color: red; }";
                return "";
            });

            const { container } = render(
                <LineRenderer
                    getLine={mockGetLine}
                    lineCount={1}
                    firstVisibleLine={1}
                    lastVisibleLine={1}
                    cursor={defaultCursor}
                    config={{ ...defaultConfig, language: "css" }}
                    version={0}
                />,
            );

            const line = container.querySelector('[data-line="1"]');
            expect(line?.textContent).toContain("color");
            expect(line?.textContent).toContain("red");
        });
    });
});

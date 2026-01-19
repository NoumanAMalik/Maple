import { describe, it, expect } from "vitest";
import { markdownTokenizer } from "./markdown";
import type { LineState } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

describe("Markdown Tokenizer", () => {
    describe("Ordered Lists", () => {
        it("should tokenize ordered list with 1.", () => {
            const result = markdownTokenizer.tokenizeLine("1. First item", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize ordered list with 2.", () => {
            const result = markdownTokenizer.tokenizeLine("2. Second item", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize ordered list with 100.", () => {
            const result = markdownTokenizer.tokenizeLine("100. One hundredth item", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize multi-digit ordered lists", () => {
            const result = markdownTokenizer.tokenizeLine("999. Large number", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Unordered Lists", () => {
        it("should tokenize unordered list with -", () => {
            const result = markdownTokenizer.tokenizeLine("- Item with dash", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize unordered list with *", () => {
            const result = markdownTokenizer.tokenizeLine("* Item with asterisk", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize unordered list with +", () => {
            const result = markdownTokenizer.tokenizeLine("+ Item with plus", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Nested Lists", () => {
        it("should tokenize nested list with proper indentation (2 spaces)", () => {
            const result = markdownTokenizer.tokenizeLine("  - Nested item", INITIAL_STATE);
            const whitespace = result.tokens.find((t) => t.type === "whitespace");
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(whitespace).toBeDefined();
            expect(keyword).toBeDefined();
        });

        it("should tokenize nested list with proper indentation (4 spaces)", () => {
            const result = markdownTokenizer.tokenizeLine("    1. Nested numbered", INITIAL_STATE);
            const whitespace = result.tokens.find((t) => t.type === "whitespace");
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(whitespace).toBeDefined();
            expect(keyword).toBeDefined();
        });

        it("should tokenize deeply nested lists", () => {
            const result = markdownTokenizer.tokenizeLine("        - Very nested", INITIAL_STATE);
            const whitespace = result.tokens.find((t) => t.type === "whitespace");
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(whitespace).toBeDefined();
            expect(keyword).toBeDefined();
        });
    });

    describe("Task Lists", () => {
        it("should tokenize unchecked task list - [ ]", () => {
            const result = markdownTokenizer.tokenizeLine("- [ ] Unchecked task", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize checked task list - [x]", () => {
            const result = markdownTokenizer.tokenizeLine("- [x] Checked task", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize checked task list - [X]", () => {
            const result = markdownTokenizer.tokenizeLine("- [X] Checked task uppercase", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Mixed Lists", () => {
        it("should handle mixed task and regular lists", () => {
            const result1 = markdownTokenizer.tokenizeLine("- Regular item", INITIAL_STATE);
            const result2 = markdownTokenizer.tokenizeLine("- [ ] Task item", INITIAL_STATE);
            expect(result1.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result2.tokens.find((t) => t.type === "keyword")).toBeDefined();
        });

        it("should handle ordered and unordered lists together", () => {
            const result1 = markdownTokenizer.tokenizeLine("1. First", INITIAL_STATE);
            const result2 = markdownTokenizer.tokenizeLine("- Second", INITIAL_STATE);
            expect(result1.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result2.tokens.find((t) => t.type === "keyword")).toBeDefined();
        });
    });

    describe("Code Blocks", () => {
        it("should tokenize code block with language", () => {
            const result = markdownTokenizer.tokenizeLine("```typescript", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should tokenize code block without language", () => {
            const result = markdownTokenizer.tokenizeLine("```", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should handle code block content", () => {
            const result = markdownTokenizer.tokenizeLine("const x = 5;", {
                kind: "block-comment",
                templateExpressionDepth: 0,
            });
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should close code block", () => {
            const result = markdownTokenizer.tokenizeLine("```", { kind: "block-comment", templateExpressionDepth: 0 });
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle indented code blocks", () => {
            const result = markdownTokenizer.tokenizeLine("  ```javascript", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });
    });

    describe("Inline Code", () => {
        it("should tokenize inline code", () => {
            const result = markdownTokenizer.tokenizeLine("Use `const` for constants", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize multiple inline code sections", () => {
            const result = markdownTokenizer.tokenizeLine("Use `const` or `let` for variables", INITIAL_STATE);
            const stringTokens = result.tokens.filter((t) => t.type === "string");
            expect(stringTokens.length).toBe(2);
        });

        it("should handle code with backticks", () => {
            const result = markdownTokenizer.tokenizeLine("Use `code` in markdown", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should handle unclosed inline code", () => {
            const result = markdownTokenizer.tokenizeLine("Unclosed `code", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Links", () => {
        it("should tokenize basic link [text](url)", () => {
            const result = markdownTokenizer.tokenizeLine("[Google](https://google.com)", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(stringToken).toBeDefined();
            expect(constantToken).toBeDefined();
        });

        it("should tokenize link with title [text](url 'title')", () => {
            const result = markdownTokenizer.tokenizeLine("[Google](https://google.com 'Search')", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize multiple links", () => {
            const result = markdownTokenizer.tokenizeLine("[Link1](url1) and [Link2](url2)", INITIAL_STATE);
            const stringTokens = result.tokens.filter((t) => t.type === "string");
            expect(stringTokens.length).toBe(2);
        });

        it("should tokenize link with empty text [](url)", () => {
            const result = markdownTokenizer.tokenizeLine("[](https://example.com)", INITIAL_STATE);
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(constantToken).toBeDefined();
        });
    });

    describe("Reference Links", () => {
        it("should tokenize reference link [text][ref]", () => {
            const result = markdownTokenizer.tokenizeLine("[Google][1]", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize reference definition [ref]: url", () => {
            const result = markdownTokenizer.tokenizeLine("[1]: https://google.com", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Images", () => {
        it("should tokenize image ![alt](url)", () => {
            const result = markdownTokenizer.tokenizeLine("![Logo](logo.png)", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const stringToken = result.tokens.find((t) => t.type === "string");
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(keywordToken).toBeDefined();
            expect(stringToken).toBeDefined();
            expect(constantToken).toBeDefined();
        });

        it("should tokenize image with title ![alt](url 'title')", () => {
            const result = markdownTokenizer.tokenizeLine("![Logo](logo.png 'Company Logo')", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize image reference ![alt][ref]", () => {
            const result = markdownTokenizer.tokenizeLine("![Logo][logo]", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Blockquotes", () => {
        it("should tokenize blockquote >", () => {
            const result = markdownTokenizer.tokenizeLine("> This is a quote", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize blockquote with space", () => {
            const result = markdownTokenizer.tokenizeLine("> Quote with space", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize nested blockquote >>", () => {
            const result = markdownTokenizer.tokenizeLine(">> Nested quote", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize blockquote with inline elements", () => {
            const result = markdownTokenizer.tokenizeLine("> Quote with *italic*", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Horizontal Rules", () => {
        it("should tokenize horizontal rule with ---", () => {
            const result = markdownTokenizer.tokenizeLine("---", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize horizontal rule with ***", () => {
            const result = markdownTokenizer.tokenizeLine("***", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize horizontal rule with ___", () => {
            const result = markdownTokenizer.tokenizeLine("___", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize horizontal rule with extra dashes", () => {
            const result = markdownTokenizer.tokenizeLine("-----", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize horizontal rule with spaces", () => {
            const result = markdownTokenizer.tokenizeLine("  ---  ", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Strikethrough", () => {
        it("should tokenize strikethrough ~~text~~", () => {
            const result = markdownTokenizer.tokenizeLine("~~deleted text~~", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(2); // Opening and closing ~~
        });

        it("should tokenize multiple strikethroughs", () => {
            const result = markdownTokenizer.tokenizeLine("~~first~~ and ~~second~~", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(4);
        });

        it("should handle unclosed strikethrough", () => {
            const result = markdownTokenizer.tokenizeLine("~~unclosed", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Escaped Characters", () => {
        it("should handle escaped asterisk \\*", () => {
            const result = markdownTokenizer.tokenizeLine("\\*not italic\\*", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle escaped underscore \\_", () => {
            const result = markdownTokenizer.tokenizeLine("\\_not italic\\_", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle escaped backtick \\`", () => {
            const result = markdownTokenizer.tokenizeLine("\\`not code\\`", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Headings", () => {
        it("should tokenize h1 heading", () => {
            const result = markdownTokenizer.tokenizeLine("# Heading 1", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const identifierToken = result.tokens.find((t) => t.type === "identifier");
            expect(keywordToken).toBeDefined();
            expect(identifierToken).toBeDefined();
        });

        it("should tokenize h2 heading", () => {
            const result = markdownTokenizer.tokenizeLine("## Heading 2", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize h3 heading", () => {
            const result = markdownTokenizer.tokenizeLine("### Heading 3", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize h4 heading", () => {
            const result = markdownTokenizer.tokenizeLine("#### Heading 4", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize h5 heading", () => {
            const result = markdownTokenizer.tokenizeLine("##### Heading 5", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize h6 heading", () => {
            const result = markdownTokenizer.tokenizeLine("###### Heading 6", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should handle heading without space", () => {
            const result = markdownTokenizer.tokenizeLine("#NoSpace", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Bold Text", () => {
        it("should tokenize bold with **", () => {
            const result = markdownTokenizer.tokenizeLine("**bold text**", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(2); // Opening and closing
        });

        it("should tokenize bold with __", () => {
            const result = markdownTokenizer.tokenizeLine("__bold text__", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(2);
        });

        it("should tokenize multiple bold sections", () => {
            const result = markdownTokenizer.tokenizeLine("**first** and **second**", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(4);
        });
    });

    describe("Italic Text", () => {
        it("should tokenize italic with *", () => {
            const result = markdownTokenizer.tokenizeLine("*italic text*", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(2);
        });

        it("should tokenize italic with _", () => {
            const result = markdownTokenizer.tokenizeLine("_italic text_", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(2);
        });

        it("should tokenize multiple italic sections", () => {
            const result = markdownTokenizer.tokenizeLine("*first* and *second*", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBe(4);
        });
    });

    describe("Tables", () => {
        it("should tokenize table header row", () => {
            const result = markdownTokenizer.tokenizeLine("| Header 1 | Header 2 |", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize table separator with alignment", () => {
            const result = markdownTokenizer.tokenizeLine("| :--- | :---: | ---: |", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize table data row", () => {
            const result = markdownTokenizer.tokenizeLine("| Cell 1 | Cell 2 |", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("HTML in Markdown", () => {
        it("should handle HTML tags", () => {
            const result = markdownTokenizer.tokenizeLine("<div>HTML content</div>", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle self-closing HTML tags", () => {
            const result = markdownTokenizer.tokenizeLine("<br />", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle HTML comments", () => {
            const result = markdownTokenizer.tokenizeLine("<!-- HTML comment -->", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty lines", () => {
            const result = markdownTokenizer.tokenizeLine("", INITIAL_STATE);
            expect(result.tokens.length).toBe(0);
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle whitespace-only lines", () => {
            const result = markdownTokenizer.tokenizeLine("    ", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThanOrEqual(0);
        });

        it("should handle tabs", () => {
            const result = markdownTokenizer.tokenizeLine("\t# Heading", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle mixed bold and italic", () => {
            const result = markdownTokenizer.tokenizeLine("***bold and italic***", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle nested formatting", () => {
            const result = markdownTokenizer.tokenizeLine("**bold with *italic* inside**", INITIAL_STATE);
            const keywordTokens = result.tokens.filter((t) => t.type === "keyword");
            expect(keywordTokens.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("Complex Examples", () => {
        it("should handle complex line with multiple elements", () => {
            const result = markdownTokenizer.tokenizeLine(
                "# Title with **bold** and *italic* and `code`",
                INITIAL_STATE,
            );
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle list with inline elements", () => {
            const result = markdownTokenizer.tokenizeLine("- Item with **bold** and [link](url)", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should handle blockquote with code", () => {
            const result = markdownTokenizer.tokenizeLine("> Quote with `code` inside", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(keywordToken).toBeDefined();
            expect(stringToken).toBeDefined();
        });
    });
});

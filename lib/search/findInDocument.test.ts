import { describe, it, expect } from "vitest";
import { findAllMatches, replaceMatch, replaceAllMatches } from "./findInDocument";

describe("findInDocument", () => {
    describe("findAllMatches", () => {
        it("should find literal matches", () => {
            const content = "Hello World Hello";
            const matches = findAllMatches(content, "Hello", false, false);

            expect(matches.length).toBe(2);
            expect(matches[0].line).toBe(1);
            expect(matches[0].column).toBe(1);
            expect(matches[1].column).toBe(13);
        });

        it("should find matches case-insensitively", () => {
            const content = "Hello HELLO hello";
            const matches = findAllMatches(content, "hello", false, false);

            expect(matches.length).toBe(3);
        });

        it("should find matches case-sensitively", () => {
            const content = "Hello HELLO hello";
            const matches = findAllMatches(content, "hello", true, false);

            expect(matches.length).toBe(1);
            expect(matches[0].column).toBe(13);
        });

        it("should find regex matches", () => {
            const content = "test123 test456";
            const matches = findAllMatches(content, "test\\d+", false, true);

            expect(matches.length).toBe(2);
        });

        it("should escape special characters in literal mode", () => {
            const content = "x.y x*y x+y";
            const matches = findAllMatches(content, "x.y", false, false);

            expect(matches.length).toBe(1);
        });

        it("should find matches across multiple lines", () => {
            const content = "Line 1\nLine 2\nLine 3";
            const matches = findAllMatches(content, "Line", false, false);

            expect(matches.length).toBe(3);
            expect(matches[0].line).toBe(1);
            expect(matches[1].line).toBe(2);
            expect(matches[2].line).toBe(3);
        });

        it("should calculate offsets correctly", () => {
            const content = "ABC\nDEF\nGHI";
            const matches = findAllMatches(content, "D", false, false);

            expect(matches[0].offset).toBe(4); // After "ABC\n"
        });

        it("should return empty array for empty query", () => {
            const content = "Hello World";
            const matches = findAllMatches(content, "", false, false);

            expect(matches).toEqual([]);
        });

        it("should handle invalid regex gracefully", () => {
            const content = "test";
            const matches = findAllMatches(content, "[invalid", false, true);

            expect(matches).toEqual([]);
        });

        it("should handle zero-length matches", () => {
            const content = "abc";
            const matches = findAllMatches(content, "\\b", false, true);

            // Should not hang, should find word boundaries
            expect(matches.length).toBeGreaterThan(0);
        });

        it("should find overlapping matches", () => {
            const content = "aaa";
            const matches = findAllMatches(content, "aa", false, false);

            // Non-overlapping: should find 1 match
            expect(matches.length).toBe(1);
        });
    });

    describe("replaceMatch", () => {
        it("should replace a single match", () => {
            const content = "Hello World";
            const match = { line: 1, column: 1, length: 5, offset: 0 };
            const result = replaceMatch(content, match, "Hi");

            expect(result).toBe("Hi World");
        });

        it("should replace match in middle", () => {
            const content = "Hello World Test";
            const match = { line: 1, column: 7, length: 5, offset: 6 };
            const result = replaceMatch(content, match, "Universe");

            expect(result).toBe("Hello Universe Test");
        });

        it("should replace match at end", () => {
            const content = "Hello World";
            const match = { line: 1, column: 7, length: 5, offset: 6 };
            const result = replaceMatch(content, match, "!");

            expect(result).toBe("Hello !");
        });

        it("should preserve surrounding content", () => {
            const content = "Before TARGET After";
            const match = { line: 1, column: 8, length: 6, offset: 7 };
            const result = replaceMatch(content, match, "REPLACED");

            expect(result).toBe("Before REPLACED After");
        });
    });

    describe("replaceAllMatches", () => {
        it("should replace all literal matches", () => {
            const content = "foo bar foo baz foo";
            const result = replaceAllMatches(content, "foo", "qux", false, false);

            expect(result).toBe("qux bar qux baz qux");
        });

        it("should replace with regex", () => {
            const content = "test123 test456";
            const result = replaceAllMatches(content, "test\\d+", "REPLACED", false, true);

            expect(result).toBe("REPLACED REPLACED");
        });

        it("should replace case-insensitively", () => {
            const content = "Hello HELLO hello";
            const result = replaceAllMatches(content, "hello", "Hi", false, false);

            expect(result).toBe("Hi Hi Hi");
        });

        it("should replace case-sensitively", () => {
            const content = "Hello HELLO hello";
            const result = replaceAllMatches(content, "hello", "Hi", true, false);

            expect(result).toBe("Hello HELLO Hi");
        });

        it("should handle regex capture groups", () => {
            const content = "John Doe, Jane Smith";
            const result = replaceAllMatches(content, "(\\w+) (\\w+)", "$2, $1", false, true);

            expect(result).toBe("Doe, John, Smith, Jane");
        });

        it("should return original content for empty query", () => {
            const content = "Hello World";
            const result = replaceAllMatches(content, "", "X", false, false);

            expect(result).toBe("Hello World");
        });

        it("should handle invalid regex gracefully", () => {
            const content = "test";
            const result = replaceAllMatches(content, "[invalid", "X", false, true);

            expect(result).toBe("test");
        });

        it("should escape special characters in literal mode", () => {
            const content = "x.y z.w";
            const result = replaceAllMatches(content, ".", "!", false, false);

            expect(result).toBe("x!y z!w");
        });

        it("should handle multiline replacements", () => {
            const content = "Line 1\nLine 2\nLine 3";
            const result = replaceAllMatches(content, "Line", "Row", false, false);

            expect(result).toBe("Row 1\nRow 2\nRow 3");
        });

        it("should handle replacement with special characters", () => {
            const content = "test test test";
            const result = replaceAllMatches(content, "test", "$&-replaced", false, false);

            expect(result).toBe("test-replaced test-replaced test-replaced");
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty content", () => {
            const matches = findAllMatches("", "test", false, false);
            expect(matches).toEqual([]);
        });

        it("should handle single character search", () => {
            const content = "a b a c a";
            const matches = findAllMatches(content, "a", false, false);
            expect(matches.length).toBe(3);
        });

        it("should handle unicode content", () => {
            const content = "Hello 世界";
            const matches = findAllMatches(content, "世界", false, false);
            expect(matches.length).toBe(1);
        });

        it("should handle very long content", () => {
            const content = "test ".repeat(1000);
            const matches = findAllMatches(content, "test", false, false);
            expect(matches.length).toBe(1000);
        });

        it("should handle newlines in search query", () => {
            const content = "Line 1\nLine 2";
            const result = replaceAllMatches(content, "1\\nLine", "1 and", false, true);
            expect(result).toBe("Line 1 and 2");
        });
    });

    describe("Real-World Scenarios", () => {
        it("should find function declarations", () => {
            const content = `
function foo() {}
function bar() {}
const baz = function() {}
            `.trim();

            const matches = findAllMatches(content, "function\\s+\\w+", false, true);
            expect(matches.length).toBe(2); // foo and bar
        });

        it("should replace import statements", () => {
            const content = `
import { foo } from "old-package";
import { bar } from "old-package";
            `.trim();

            const result = replaceAllMatches(content, "old-package", "new-package", false, false);
            expect(result).toContain("new-package");
            expect(result).not.toContain("old-package");
        });

        it("should find console.log statements", () => {
            const content = `
console.log("test");
console.error("error");
console.log("another");
            `.trim();

            const matches = findAllMatches(content, "console\\.log", false, true);
            expect(matches.length).toBe(2);
        });

        it("should replace variable names", () => {
            const content = "const oldName = 1; return oldName + oldName;";
            const result = replaceAllMatches(content, "oldName", "newName", false, false);
            expect(result).toBe("const newName = 1; return newName + newName;");
        });
    });
});

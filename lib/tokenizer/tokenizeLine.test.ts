import { describe, it, expect } from "vitest";
import { getInitialLineState, tokenizeSingleLine, getLanguageFromFilename } from "./tokenizeLine";
import type { LanguageId } from "./types";

describe("tokenizeLine", () => {
    describe("getInitialLineState", () => {
        it("should return normal state for all languages", () => {
            const languages: LanguageId[] = [
                "javascript",
                "typescript",
                "css",
                "json",
                "html",
                "python",
                "markdown",
                "plaintext",
            ];

            for (const lang of languages) {
                const state = getInitialLineState(lang);
                expect(state).toEqual({
                    kind: "normal",
                    templateExpressionDepth: 0,
                });
            }
        });
    });

    describe("tokenizeSingleLine", () => {
        it("should tokenize simple JavaScript", () => {
            const result = tokenizeSingleLine("javascript", "const x = 1;");
            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle empty line", () => {
            const result = tokenizeSingleLine("javascript", "");
            expect(result.tokens).toEqual([]);
            expect(result.endState.kind).toBe("normal");
        });

        it("should use provided start state", () => {
            const startState = { kind: "block-comment" as const, templateExpressionDepth: 0 };
            const result = tokenizeSingleLine("javascript", "still in comment */", startState);
            expect(result.tokens[0].type).toBe("comment");
        });

        it("should handle unknown language gracefully", () => {
            const result = tokenizeSingleLine("unknown" as LanguageId, "test code");
            expect(result.tokens).toEqual([]);
            expect(result.endState.kind).toBe("normal");
        });

        it("should tokenize JSON", () => {
            const result = tokenizeSingleLine("json", '{"key": "value"}');
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize CSS", () => {
            const result = tokenizeSingleLine("css", "body { color: red; }");
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize HTML", () => {
            const result = tokenizeSingleLine("html", "<div class='test'>hello</div>");
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize Python", () => {
            const result = tokenizeSingleLine("python", "def foo():");
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize Markdown", () => {
            const result = tokenizeSingleLine("markdown", "# Heading");
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle plaintext", () => {
            const result = tokenizeSingleLine("plaintext", "any text at all");
            expect(result.tokens).toEqual([]);
            expect(result.endState.kind).toBe("normal");
        });
    });

    describe("getLanguageFromFilename", () => {
        it("should detect JavaScript extensions", () => {
            expect(getLanguageFromFilename("file.js")).toBe("javascript");
            expect(getLanguageFromFilename("file.jsx")).toBe("javascript");
            expect(getLanguageFromFilename("file.mjs")).toBe("javascript");
            expect(getLanguageFromFilename("file.cjs")).toBe("javascript");
        });

        it("should detect TypeScript extensions", () => {
            expect(getLanguageFromFilename("file.ts")).toBe("typescript");
            expect(getLanguageFromFilename("file.tsx")).toBe("typescript");
            expect(getLanguageFromFilename("file.mts")).toBe("typescript");
            expect(getLanguageFromFilename("file.cts")).toBe("typescript");
        });

        it("should detect CSS extensions", () => {
            expect(getLanguageFromFilename("file.css")).toBe("css");
            expect(getLanguageFromFilename("file.scss")).toBe("css");
        });

        it("should detect JSON extension", () => {
            expect(getLanguageFromFilename("file.json")).toBe("json");
            expect(getLanguageFromFilename("package.json")).toBe("json");
        });

        it("should detect HTML extensions", () => {
            expect(getLanguageFromFilename("file.html")).toBe("html");
            expect(getLanguageFromFilename("file.htm")).toBe("html");
        });

        it("should detect Markdown extensions", () => {
            expect(getLanguageFromFilename("file.md")).toBe("markdown");
            expect(getLanguageFromFilename("file.markdown")).toBe("markdown");
        });

        it("should detect Python extensions", () => {
            expect(getLanguageFromFilename("file.py")).toBe("python");
            expect(getLanguageFromFilename("file.pyw")).toBe("python");
            expect(getLanguageFromFilename("file.pyi")).toBe("python");
        });

        it("should default to plaintext for unknown extensions", () => {
            expect(getLanguageFromFilename("file.txt")).toBe("plaintext");
            expect(getLanguageFromFilename("file.xyz")).toBe("plaintext");
            expect(getLanguageFromFilename("README")).toBe("plaintext");
        });

        it("should be case insensitive", () => {
            expect(getLanguageFromFilename("file.JS")).toBe("javascript");
            expect(getLanguageFromFilename("file.TS")).toBe("typescript");
            expect(getLanguageFromFilename("file.CSS")).toBe("css");
        });

        it("should handle filenames with multiple dots", () => {
            expect(getLanguageFromFilename("file.test.js")).toBe("javascript");
            expect(getLanguageFromFilename("file.d.ts")).toBe("typescript");
        });

        it("should handle no extension", () => {
            expect(getLanguageFromFilename("Makefile")).toBe("plaintext");
            expect(getLanguageFromFilename("file")).toBe("plaintext");
        });
    });
});

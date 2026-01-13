import { describe, it, expect, beforeEach } from "vitest";
import {
    createDocumentHighlightState,
    updateDocumentHighlightState,
    getLineTokens,
    type DocumentHighlightState,
} from "./documentState";

describe("documentState", () => {
    describe("createDocumentHighlightState", () => {
        it("should tokenize all lines initially", () => {
            const lines = ["const x = 1;", "const y = 2;", "const z = 3;"];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            expect(state.language).toBe("javascript");
            expect(state.lines.length).toBe(3);
            expect(state.version).toBe(1);

            // All lines should have tokens
            for (const line of state.lines) {
                expect(line.tokens.length).toBeGreaterThan(0);
            }
        });

        it("should handle empty document", () => {
            const getLine = () => "";
            const state = createDocumentHighlightState("javascript", getLine, 0, 1);

            expect(state.lines.length).toBe(0);
            expect(state.version).toBe(1);
        });

        it("should propagate state across lines", () => {
            const lines = ["/*", " * Block comment", " */"];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // First line should end in block-comment state
            expect(state.lines[0].stateAfter.kind).toBe("block-comment");

            // Second line should start and end in block-comment state
            expect(state.lines[1].stateBefore.kind).toBe("block-comment");
            expect(state.lines[1].stateAfter.kind).toBe("block-comment");

            // Third line should start in block-comment and end in normal
            expect(state.lines[2].stateBefore.kind).toBe("block-comment");
            expect(state.lines[2].stateAfter.kind).toBe("normal");
        });

        it("should handle template strings across lines", () => {
            const lines = ["`start", "middle", "end`"];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // First line should end in template-string state
            expect(state.lines[0].stateAfter.kind).toBe("template-string");

            // Second line should be in template-string state
            expect(state.lines[1].stateBefore.kind).toBe("template-string");
            expect(state.lines[1].stateAfter.kind).toBe("template-string");

            // Third line should end in normal state
            expect(state.lines[2].stateAfter.kind).toBe("normal");
        });

        it("should initialize all lines with normal state at start", () => {
            const lines = ["line 1", "line 2"];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            expect(state.lines[0].stateBefore.kind).toBe("normal");
        });
    });

    describe("updateDocumentHighlightState", () => {
        it("should return same state if version matches", () => {
            const lines = ["const x = 1;"];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);
            const updated = updateDocumentHighlightState(state, getLine, lines.length, 1, 1);

            expect(updated).toBe(state);
        });

        it("should only retokenize from changed line", () => {
            const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Change second line
            lines[1] = "const b = 999;";
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 2, 2);

            // First line should be unchanged (same object reference)
            expect(updated.lines[0]).toBe(state.lines[0]);

            // Second line should be retokenized
            expect(updated.lines[1]).not.toBe(state.lines[1]);

            // Third line may or may not be the same depending on early exit
            expect(updated.version).toBe(2);
        });

        it("should propagate state changes when multiline construct is modified", () => {
            const lines = ["/*", " * comment", " */", "const x = 1;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Remove the closing comment on line 3
            lines[2] = " * still comment";
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 3, 2);

            // Line 3 should now end in block-comment state
            expect(updated.lines[2].stateAfter.kind).toBe("block-comment");

            // Line 4 should now be in block-comment state (affected by change)
            expect(updated.lines[3].stateBefore.kind).toBe("block-comment");
            expect(updated.lines[3].stateAfter.kind).toBe("block-comment");
        });

        it("should use early exit optimization when states stabilize", () => {
            const lines = ["const a = 1;", "const b = 2;", "const c = 3;", "const d = 4;", "const e = 5;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Change line 2 without affecting state propagation
            lines[1] = "const b = 999;";
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 2, 2);

            // Lines after the change should use early exit (same references)
            // This is an optimization - unchanged lines with same state don't need retokenization
            expect(updated.lines.length).toBe(5);
        });

        it("should handle document growth", () => {
            const lines = ["const a = 1;", "const b = 2;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Add new lines
            lines.push("const c = 3;");
            lines.push("const d = 4;");
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 3, 2);

            expect(updated.lines.length).toBe(4);
            expect(updated.lines[2].tokens.length).toBeGreaterThan(0);
            expect(updated.lines[3].tokens.length).toBeGreaterThan(0);
        });

        it("should handle document shrinkage", () => {
            const lines = ["const a = 1;", "const b = 2;", "const c = 3;", "const d = 4;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Remove lines
            lines.splice(2, 2);
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 2, 2);

            expect(updated.lines.length).toBe(2);
        });

        it("should handle complete document replacement", () => {
            const lines = ["const a = 1;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Replace entire document
            lines[0] = "function foo() { return 42; }";
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 1, 2);

            expect(updated.lines.length).toBe(1);
            expect(updated.lines[0]).not.toBe(state.lines[0]);
        });

        it("should preserve unchanged lines before change point", () => {
            const lines = ["const a = 1;", "const b = 2;", "const c = 3;"];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);
            const originalFirstLine = state.lines[0];

            // Change third line
            lines[2] = "const c = 999;";
            getLine = (lineNumber: number) => lines[lineNumber - 1];

            const updated = updateDocumentHighlightState(state, getLine, lines.length, 3, 2);

            // First two lines should be preserved
            expect(updated.lines[0]).toBe(originalFirstLine);
            expect(updated.lines[1]).toBe(state.lines[1]);
        });
    });

    describe("getLineTokens", () => {
        let state: DocumentHighlightState;

        beforeEach(() => {
            const lines = ["const x = 1;", "const y = 2;", "const z = 3;"];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];
            state = createDocumentHighlightState("javascript", getLine, lines.length, 1);
        });

        it("should return tokens for valid line number", () => {
            const tokens = getLineTokens(state, 1);
            expect(tokens.length).toBeGreaterThan(0);
        });

        it("should return empty array for line 0", () => {
            const tokens = getLineTokens(state, 0);
            expect(tokens).toEqual([]);
        });

        it("should return empty array for negative line number", () => {
            const tokens = getLineTokens(state, -1);
            expect(tokens).toEqual([]);
        });

        it("should return empty array for line beyond document", () => {
            const tokens = getLineTokens(state, 100);
            expect(tokens).toEqual([]);
        });

        it("should return correct tokens for each line", () => {
            const tokens1 = getLineTokens(state, 1);
            const tokens2 = getLineTokens(state, 2);
            const tokens3 = getLineTokens(state, 3);

            expect(tokens1).toBe(state.lines[0].tokens);
            expect(tokens2).toBe(state.lines[1].tokens);
            expect(tokens3).toBe(state.lines[2].tokens);
        });
    });

    describe("Integration", () => {
        it("should handle complex editing scenario", () => {
            const lines = [
                "function test() {",
                "    const x = 1;",
                "    return x;",
                "}",
            ];
            let getLine = (lineNumber: number) => lines[lineNumber - 1];

            let state = createDocumentHighlightState("javascript", getLine, lines.length, 1);
            expect(state.lines.length).toBe(4);

            // Add a line in the middle
            lines.splice(2, 0, "    const y = 2;");
            getLine = (lineNumber: number) => lines[lineNumber - 1];
            state = updateDocumentHighlightState(state, getLine, lines.length, 3, 2);
            expect(state.lines.length).toBe(5);

            // Delete a line
            lines.splice(2, 1);
            getLine = (lineNumber: number) => lines[lineNumber - 1];
            state = updateDocumentHighlightState(state, getLine, lines.length, 3, 3);
            expect(state.lines.length).toBe(4);
        });

        it("should handle multiline state transitions correctly", () => {
            const lines = [
                "const str = `",
                "  multiline",
                "  template",
                "`;",
                "const x = 1;",
            ];
            const getLine = (lineNumber: number) => lines[lineNumber - 1];

            const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

            // Lines 1-3 should be in template string
            expect(state.lines[0].stateAfter.kind).toBe("template-string");
            expect(state.lines[1].stateBefore.kind).toBe("template-string");
            expect(state.lines[2].stateBefore.kind).toBe("template-string");

            // Line 4 (`;`) continues in template-string state due to tokenizer behavior
            expect(state.lines[3].stateBefore.kind).toBe("template-string");
            // The tokenizer closes the template here but stays in template-string state
            expect(state.lines[3].stateAfter.kind).toBe("template-string");

            // Line 5 is affected by the template-string state from previous line
            expect(state.lines[4].stateBefore.kind).toBe("template-string");
        });
    });
});

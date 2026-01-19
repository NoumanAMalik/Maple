import { describe, it, expect } from "vitest";
import { PieceTable } from "./pieceTable";

describe("PieceTable", () => {
    describe("Construction", () => {
        it("should create empty document", () => {
            const pt = new PieceTable();
            expect(pt.getText()).toBe("");
            expect(pt.getLineCount()).toBe(1);
            expect(pt.getTotalLength()).toBe(0);
        });

        it("should initialize with content", () => {
            const pt = new PieceTable("Hello\nWorld");
            expect(pt.getText()).toBe("Hello\nWorld");
            expect(pt.getLineCount()).toBe(2);
            expect(pt.getTotalLength()).toBe(11);
        });

        it("should handle content with multiple newlines", () => {
            const pt = new PieceTable("a\n\nb\n");
            expect(pt.getLineCount()).toBe(4);
            expect(pt.getLine(1)).toBe("a");
            expect(pt.getLine(2)).toBe("");
            expect(pt.getLine(3)).toBe("b");
            expect(pt.getLine(4)).toBe("");
        });

        it("should handle single line without newline", () => {
            const pt = new PieceTable("single line");
            expect(pt.getLineCount()).toBe(1);
            expect(pt.getLine(1)).toBe("single line");
        });
    });

    describe("Insert Operations", () => {
        it("should insert at beginning", () => {
            const pt = new PieceTable("World");
            pt.insert(0, "Hello ");
            expect(pt.getText()).toBe("Hello World");
            expect(pt.getTotalLength()).toBe(11);
        });

        it("should insert at end", () => {
            const pt = new PieceTable("Hello");
            pt.insert(5, " World");
            expect(pt.getText()).toBe("Hello World");
            expect(pt.getTotalLength()).toBe(11);
        });

        it("should insert in middle", () => {
            const pt = new PieceTable("HelloWorld");
            pt.insert(5, " ");
            expect(pt.getText()).toBe("Hello World");
        });

        it("should insert newlines", () => {
            const pt = new PieceTable("HelloWorld");
            pt.insert(5, "\n");
            expect(pt.getLineCount()).toBe(2);
            expect(pt.getLine(1)).toBe("Hello");
            expect(pt.getLine(2)).toBe("World");
        });

        it("should handle multiple inserts", () => {
            const pt = new PieceTable();
            pt.insert(0, "a");
            pt.insert(1, "b");
            pt.insert(2, "c");
            expect(pt.getText()).toBe("abc");
        });

        it("should insert empty string (no-op)", () => {
            const pt = new PieceTable("test");
            pt.insert(2, "");
            expect(pt.getText()).toBe("test");
        });

        it("should handle insert at very large offset", () => {
            const pt = new PieceTable("test");
            pt.insert(1000, "!");
            expect(pt.getText()).toBe("test!");
        });

        it("should handle insert at negative offset", () => {
            const pt = new PieceTable("test");
            pt.insert(-10, "!");
            expect(pt.getText()).toBe("!test");
        });

        it("should insert into empty document", () => {
            const pt = new PieceTable();
            pt.insert(0, "first");
            expect(pt.getText()).toBe("first");
        });
    });

    describe("Delete Operations", () => {
        it("should delete from beginning", () => {
            const pt = new PieceTable("Hello World");
            pt.delete(0, 6);
            expect(pt.getText()).toBe("World");
            expect(pt.getTotalLength()).toBe(5);
        });

        it("should delete from end", () => {
            const pt = new PieceTable("Hello World");
            pt.delete(5, 6);
            expect(pt.getText()).toBe("Hello");
        });

        it("should delete in middle", () => {
            const pt = new PieceTable("Hello World");
            pt.delete(5, 1);
            expect(pt.getText()).toBe("HelloWorld");
        });

        it("should delete across multiple pieces", () => {
            const pt = new PieceTable("Original");
            pt.insert(4, "XXX");
            expect(pt.getText()).toBe("OrigXXXinal");
            pt.delete(3, 5);
            expect(pt.getText()).toBe("Orinal");
        });

        it("should delete newlines", () => {
            const pt = new PieceTable("Hello\nWorld");
            pt.delete(5, 1);
            expect(pt.getText()).toBe("HelloWorld");
            expect(pt.getLineCount()).toBe(1);
        });

        it("should handle delete with zero length (no-op)", () => {
            const pt = new PieceTable("test");
            pt.delete(2, 0);
            expect(pt.getText()).toBe("test");
        });

        it("should handle delete with negative length (no-op)", () => {
            const pt = new PieceTable("test");
            pt.delete(2, -5);
            expect(pt.getText()).toBe("test");
        });

        it("should handle delete beyond end of document", () => {
            const pt = new PieceTable("test");
            pt.delete(2, 100);
            expect(pt.getText()).toBe("te");
        });

        it("should handle delete at offset beyond document", () => {
            const pt = new PieceTable("test");
            pt.delete(100, 5);
            expect(pt.getText()).toBe("test");
        });

        it("should delete entire document", () => {
            const pt = new PieceTable("Hello World");
            pt.delete(0, 100);
            expect(pt.getText()).toBe("");
            expect(pt.getLineCount()).toBe(1);
        });

        it("should delete range within single piece", () => {
            const pt = new PieceTable("HelloWorld");
            pt.delete(2, 3);
            expect(pt.getText()).toBe("HeWorld");
        });
    });

    describe("Position Conversion", () => {
        it("should convert offset to position", () => {
            const pt = new PieceTable("Hello\nWorld");
            expect(pt.offsetToPosition(0)).toEqual({ line: 1, column: 1 });
            expect(pt.offsetToPosition(5)).toEqual({ line: 1, column: 6 });
            expect(pt.offsetToPosition(6)).toEqual({ line: 2, column: 1 });
            expect(pt.offsetToPosition(11)).toEqual({ line: 2, column: 6 });
        });

        it("should convert position to offset", () => {
            const pt = new PieceTable("Hello\nWorld");
            expect(pt.positionToOffset({ line: 1, column: 1 })).toBe(0);
            expect(pt.positionToOffset({ line: 1, column: 6 })).toBe(5);
            expect(pt.positionToOffset({ line: 2, column: 1 })).toBe(6);
            expect(pt.positionToOffset({ line: 2, column: 6 })).toBe(11);
        });

        it("should handle out-of-bounds positions", () => {
            const pt = new PieceTable("Hello");
            expect(pt.offsetToPosition(-1)).toEqual({ line: 1, column: 1 });
            expect(pt.offsetToPosition(100)).toEqual({ line: 1, column: 6 });
        });

        it("should handle out-of-bounds line numbers", () => {
            const pt = new PieceTable("Hello");
            expect(pt.positionToOffset({ line: 0, column: 1 })).toBe(0);
            expect(pt.positionToOffset({ line: 100, column: 1 })).toBe(5);
        });

        it("should handle out-of-bounds columns", () => {
            const pt = new PieceTable("Hello\nWorld");
            expect(pt.positionToOffset({ line: 1, column: 100 })).toBe(5);
            expect(pt.positionToOffset({ line: 2, column: 100 })).toBe(11);
        });

        it("should handle empty document", () => {
            const pt = new PieceTable();
            expect(pt.offsetToPosition(0)).toEqual({ line: 1, column: 1 });
            expect(pt.positionToOffset({ line: 1, column: 1 })).toBe(0);
        });

        it("should handle multiline document", () => {
            const pt = new PieceTable("Line 1\nLine 2\nLine 3");
            expect(pt.offsetToPosition(0)).toEqual({ line: 1, column: 1 });
            expect(pt.offsetToPosition(7)).toEqual({ line: 2, column: 1 });
            expect(pt.offsetToPosition(14)).toEqual({ line: 3, column: 1 });
        });

        it("should be bidirectional", () => {
            const pt = new PieceTable("Hello\nWorld\nTest");
            for (let offset = 0; offset <= pt.getTotalLength(); offset++) {
                const pos = pt.offsetToPosition(offset);
                const backToOffset = pt.positionToOffset(pos);
                expect(backToOffset).toBe(offset);
            }
        });
    });

    describe("Line Operations", () => {
        it("should get line content", () => {
            const pt = new PieceTable("Line 1\nLine 2\nLine 3");
            expect(pt.getLine(1)).toBe("Line 1");
            expect(pt.getLine(2)).toBe("Line 2");
            expect(pt.getLine(3)).toBe("Line 3");
        });

        it("should handle empty lines", () => {
            const pt = new PieceTable("a\n\nb");
            expect(pt.getLine(1)).toBe("a");
            expect(pt.getLine(2)).toBe("");
            expect(pt.getLine(3)).toBe("b");
        });

        it("should return empty string for invalid line numbers", () => {
            const pt = new PieceTable("test");
            expect(pt.getLine(0)).toBe("");
            expect(pt.getLine(100)).toBe("");
            expect(pt.getLine(-1)).toBe("");
        });

        it("should get line info", () => {
            const pt = new PieceTable("Hello\nWorld");
            const info = pt.getLineInfo(2);
            expect(info).toBeTruthy();
            expect(info?.startOffset).toBe(6);
            expect(info?.length).toBe(5);
        });

        it("should return null for invalid line info", () => {
            const pt = new PieceTable("test");
            expect(pt.getLineInfo(0)).toBeNull();
            expect(pt.getLineInfo(100)).toBeNull();
        });

        it("should handle last line without newline", () => {
            const pt = new PieceTable("line1\nline2");
            expect(pt.getLine(2)).toBe("line2");
        });
    });

    describe("getText with Range", () => {
        it("should get substring", () => {
            const pt = new PieceTable("Hello World");
            expect(pt.getText(0, 5)).toBe("Hello");
            expect(pt.getText(6, 11)).toBe("World");
            expect(pt.getText(0, 11)).toBe("Hello World");
        });

        it("should handle out-of-bounds range", () => {
            const pt = new PieceTable("Hello");
            expect(pt.getText(0, 100)).toBe("Hello");
            expect(pt.getText(10, 20)).toBe("");
        });

        it("should handle inverted range", () => {
            const pt = new PieceTable("Hello");
            expect(pt.getText(5, 0)).toBe("");
        });

        it("should handle negative start", () => {
            const pt = new PieceTable("Hello");
            expect(pt.getText(-5, 3)).toBe("Hel");
        });
    });

    describe("Snapshot & Restore", () => {
        it("should create snapshot", () => {
            const pt = new PieceTable("Hello");
            const snapshot = pt.snapshot();
            expect(snapshot.totalLength).toBe(5);
            expect(snapshot.pieces.length).toBe(1);
        });

        it("should restore from snapshot", () => {
            const pt = new PieceTable("Hello");
            const snapshot = pt.snapshot();
            pt.insert(5, " World");
            expect(pt.getText()).toBe("Hello World");
            pt.restore(snapshot);
            expect(pt.getText()).toBe("Hello");
        });

        it("should handle multiple snapshots", () => {
            const pt = new PieceTable("v1");
            const s1 = pt.snapshot();
            pt.insert(2, " -> v2");
            const s2 = pt.snapshot();
            pt.insert(8, " -> v3");

            pt.restore(s2);
            expect(pt.getText()).toBe("v1 -> v2");
            pt.restore(s1);
            expect(pt.getText()).toBe("v1");
        });

        it("should restore line count correctly", () => {
            const pt = new PieceTable("line1\nline2\nline3");
            const snapshot = pt.snapshot();
            pt.delete(0, 100);
            expect(pt.getLineCount()).toBe(1);
            pt.restore(snapshot);
            expect(pt.getLineCount()).toBe(3);
        });

        it("should preserve snapshot independence", () => {
            const pt = new PieceTable("test");
            const s1 = pt.snapshot();
            pt.insert(4, "!");
            const s2 = pt.snapshot();

            // Modify after taking snapshots
            pt.insert(5, "?");

            // Snapshots should be unchanged
            pt.restore(s1);
            expect(pt.getText()).toBe("test");
            pt.restore(s2);
            expect(pt.getText()).toBe("test!");
        });
    });

    describe("Word Boundaries", () => {
        it("should get word boundaries", () => {
            const pt = new PieceTable("hello world");
            expect(pt.getWordBoundaries(7)).toEqual({ start: 6, end: 11 });
            expect(pt.getWordBoundaries(2)).toEqual({ start: 0, end: 5 });
        });

        it("should handle offset at word boundary", () => {
            const pt = new PieceTable("hello world");
            expect(pt.getWordBoundaries(0)).toEqual({ start: 0, end: 5 });
            // Position 5 is the space - not a word char, so boundaries are at that position
            expect(pt.getWordBoundaries(5)).toEqual({ start: 0, end: 5 });
            expect(pt.getWordBoundaries(6)).toEqual({ start: 6, end: 11 });
        });

        it("should handle non-word characters", () => {
            const pt = new PieceTable("hello, world!");
            // Position 5 is comma - finds word before it
            expect(pt.getWordBoundaries(5)).toEqual({ start: 0, end: 5 });
            // Position 6 is space - expands to next non-word boundary
            expect(pt.getWordBoundaries(6)).toEqual({ start: 6, end: 6 });
        });

        it("should handle single word", () => {
            const pt = new PieceTable("hello");
            expect(pt.getWordBoundaries(2)).toEqual({ start: 0, end: 5 });
        });
    });

    describe("Line Boundaries", () => {
        it("should get line boundaries", () => {
            const pt = new PieceTable("Line 1\nLine 2\nLine 3");
            expect(pt.getLineBoundaries(1)).toEqual({ start: 0, end: 7 });
            expect(pt.getLineBoundaries(2)).toEqual({ start: 7, end: 14 });
            expect(pt.getLineBoundaries(3)).toEqual({ start: 14, end: 20 });
        });

        it("should not include newline for last line", () => {
            const pt = new PieceTable("line1\nline2");
            expect(pt.getLineBoundaries(2)).toEqual({ start: 6, end: 11 });
        });

        it("should handle invalid line numbers", () => {
            const pt = new PieceTable("test");
            expect(pt.getLineBoundaries(0)).toEqual({ start: 0, end: 0 });
            expect(pt.getLineBoundaries(100)).toEqual({ start: 0, end: 0 });
        });

        it("should handle empty lines", () => {
            const pt = new PieceTable("a\n\nb");
            expect(pt.getLineBoundaries(2)).toEqual({ start: 2, end: 3 });
        });
    });

    describe("Edge Cases", () => {
        it("should handle very long lines", () => {
            const longLine = "a".repeat(10000);
            const pt = new PieceTable(longLine);
            expect(pt.getTotalLength()).toBe(10000);
            expect(pt.getLine(1).length).toBe(10000);
        });

        it("should handle many small inserts", () => {
            const pt = new PieceTable();
            for (let i = 0; i < 100; i++) {
                pt.insert(i, "x");
            }
            expect(pt.getTotalLength()).toBe(100);
            expect(pt.getText()).toBe("x".repeat(100));
        });

        it("should handle unicode characters", () => {
            const pt = new PieceTable("Hello 世界 🌍");
            expect(pt.getText()).toBe("Hello 世界 🌍");
            pt.insert(6, "美丽");
            expect(pt.getText()).toContain("美丽");
        });

        it("should handle tabs", () => {
            const pt = new PieceTable("a\tb\tc");
            expect(pt.getText()).toBe("a\tb\tc");
            expect(pt.getTotalLength()).toBe(5);
        });

        it("should handle mixed operations", () => {
            const pt = new PieceTable("initial");
            pt.insert(7, " text");
            expect(pt.getText()).toBe("initial text");
            pt.delete(0, 8);
            expect(pt.getText()).toBe("text");
            pt.insert(0, "new ");
            expect(pt.getText()).toBe("new text");
        });

        it("should handle rapid insert/delete cycles", () => {
            const pt = new PieceTable("test");
            for (let i = 0; i < 10; i++) {
                pt.insert(4, "!");
                pt.delete(4, 1);
            }
            expect(pt.getText()).toBe("test");
        });

        it("should maintain consistency after complex edits", () => {
            const pt = new PieceTable("The quick brown fox");
            pt.insert(4, "very ");
            // After insert: "The very quick brown fox"
            pt.delete(9, 16);
            // After delete: delete "quick brown fox" -> "The very "
            pt.insert(9, "red fox");
            // After insert: "The very red fox"
            expect(pt.getText()).toBe("The very red fox");
            expect(pt.getLineCount()).toBe(1);
        });

        it("should handle document with only newlines", () => {
            const pt = new PieceTable("\n\n\n");
            expect(pt.getLineCount()).toBe(4);
            expect(pt.getLine(1)).toBe("");
            expect(pt.getLine(2)).toBe("");
        });

        it("should handle carriage returns", () => {
            const pt = new PieceTable("line1\r\nline2");
            expect(pt.getText()).toBe("line1\r\nline2");
        });
    });

    describe("Complex Scenarios", () => {
        it("should handle realistic typing scenario", () => {
            const pt = new PieceTable();

            // Type "Hello World"
            pt.insert(0, "H");
            pt.insert(1, "e");
            pt.insert(2, "l");
            pt.insert(3, "l");
            pt.insert(4, "o");
            pt.insert(5, " ");
            pt.insert(6, "W");
            pt.insert(7, "o");
            pt.insert(8, "r");
            pt.insert(9, "l");
            pt.insert(10, "d");

            expect(pt.getText()).toBe("Hello World");
        });

        it("should handle backspace scenario", () => {
            const pt = new PieceTable("Hello Worldd");
            pt.delete(11, 1); // Delete extra 'd'
            expect(pt.getText()).toBe("Hello World");
        });

        it("should handle paste operation", () => {
            const pt = new PieceTable("Hello");
            pt.insert(5, " World from paste");
            expect(pt.getText()).toBe("Hello World from paste");
        });

        it("should handle cut operation", () => {
            const pt = new PieceTable("Hello World");
            const snapshot = pt.snapshot();
            pt.delete(6, 5); // Cut "World"
            expect(pt.getText()).toBe("Hello ");
            // Can restore if needed
            pt.restore(snapshot);
            expect(pt.getText()).toBe("Hello World");
        });

        it("should handle find and replace", () => {
            const pt = new PieceTable("foo bar foo baz");
            // Find "foo" at position 0
            pt.delete(0, 3);
            pt.insert(0, "qux");
            expect(pt.getText()).toBe("qux bar foo baz");
            // Find "foo" at position 8
            pt.delete(8, 3);
            pt.insert(8, "qux");
            expect(pt.getText()).toBe("qux bar qux baz");
        });
    });
});

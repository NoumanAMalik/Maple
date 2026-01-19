import { bench, describe } from "vitest";
import { PieceTable } from "./pieceTable";

describe("PieceTable Performance", () => {
    describe("Insert Operations", () => {
        bench("insert 10,000 characters at end", () => {
            const pt = new PieceTable();
            for (let i = 0; i < 10000; i++) {
                pt.insert(i, "x");
            }
        });

        bench("insert 1,000 lines", () => {
            const pt = new PieceTable();
            for (let i = 0; i < 1000; i++) {
                pt.insert(pt.getTotalLength(), "line\n");
            }
        });

        bench("insert at beginning (worst case)", () => {
            const pt = new PieceTable("initial");
            for (let i = 0; i < 100; i++) {
                pt.insert(0, "x");
            }
        });

        bench("insert in middle", () => {
            const pt = new PieceTable("a".repeat(1000));
            for (let i = 0; i < 100; i++) {
                pt.insert(500, "x");
            }
        });
    });

    describe("Delete Operations", () => {
        bench("delete from end", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);
            for (let i = 0; i < 1000; i++) {
                pt.delete(pt.getTotalLength() - 1, 1);
            }
        });

        bench("delete from beginning", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);
            for (let i = 0; i < 1000; i++) {
                pt.delete(0, 1);
            }
        });

        bench("delete large chunks", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);
            for (let i = 0; i < 10; i++) {
                pt.delete(0, 100);
            }
        });
    });

    describe("Random Edits", () => {
        bench("random edits on 10,000 char document", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);

            for (let i = 0; i < 100; i++) {
                const pos = Math.floor(Math.random() * pt.getTotalLength());
                if (Math.random() > 0.5) {
                    pt.insert(pos, "!");
                } else {
                    pt.delete(pos, 1);
                }
            }
        });

        bench("mixed operations (insert/delete)", () => {
            const pt = new PieceTable("initial content");
            for (let i = 0; i < 1000; i++) {
                pt.insert(pt.getTotalLength(), "x");
                if (i % 10 === 0 && pt.getTotalLength() > 10) {
                    pt.delete(5, 2);
                }
            }
        });
    });

    describe("Position Conversion", () => {
        bench("offsetToPosition on 10,000 line document", () => {
            const lines = Array(10000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 0; i < 1000; i++) {
                const offset = Math.floor(Math.random() * pt.getTotalLength());
                pt.offsetToPosition(offset);
            }
        });

        bench("positionToOffset on 10,000 line document", () => {
            const lines = Array(10000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 0; i < 1000; i++) {
                const line = Math.floor(Math.random() * pt.getLineCount()) + 1;
                const column = Math.floor(Math.random() * 10) + 1;
                pt.positionToOffset({ line, column });
            }
        });

        bench("bidirectional conversion", () => {
            const lines = Array(1000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 0; i < 500; i++) {
                const offset = Math.floor(Math.random() * pt.getTotalLength());
                const pos = pt.offsetToPosition(offset);
                pt.positionToOffset(pos);
            }
        });
    });

    describe("Line Access", () => {
        bench("getLine on 10,000 line document", () => {
            const lines = Array(10000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 0; i < 1000; i++) {
                const lineNum = Math.floor(Math.random() * pt.getLineCount()) + 1;
                pt.getLine(lineNum);
            }
        });

        bench("sequential line access", () => {
            const lines = Array(1000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 1; i <= pt.getLineCount(); i++) {
                pt.getLine(i);
            }
        });

        bench("getLineInfo", () => {
            const lines = Array(10000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 0; i < 1000; i++) {
                const lineNum = Math.floor(Math.random() * pt.getLineCount()) + 1;
                pt.getLineInfo(lineNum);
            }
        });
    });

    describe("getText Operations", () => {
        bench("getText full document (10,000 chars)", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);

            for (let i = 0; i < 100; i++) {
                pt.getText();
            }
        });

        bench("getText substring", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);

            for (let i = 0; i < 1000; i++) {
                const start = Math.floor(Math.random() * 9000);
                pt.getText(start, start + 100);
            }
        });

        bench("getText after many edits", () => {
            const pt = new PieceTable("initial");
            for (let i = 0; i < 100; i++) {
                pt.insert(pt.getTotalLength(), "x");
            }
            for (let i = 0; i < 100; i++) {
                pt.getText();
            }
        });
    });

    describe("Snapshot & Restore", () => {
        bench("snapshot creation", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);

            for (let i = 0; i < 100; i++) {
                pt.snapshot();
            }
        });

        bench("restore from snapshot", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);
            const snapshot = pt.snapshot();

            for (let i = 0; i < 100; i++) {
                pt.insert(5000, "!");
                pt.restore(snapshot);
            }
        });

        bench("snapshot after many edits", () => {
            const pt = new PieceTable("initial");
            for (let i = 0; i < 1000; i++) {
                pt.insert(pt.getTotalLength(), "x");
            }
            pt.snapshot();
        });
    });

    describe("Word & Line Boundaries", () => {
        bench("getWordBoundaries", () => {
            const content = "hello world test foo bar baz qux ".repeat(100);
            const pt = new PieceTable(content);

            for (let i = 0; i < 1000; i++) {
                const offset = Math.floor(Math.random() * pt.getTotalLength());
                pt.getWordBoundaries(offset);
            }
        });

        bench("getLineBoundaries", () => {
            const lines = Array(1000).fill("line content\n").join("");
            const pt = new PieceTable(lines);

            for (let i = 0; i < 1000; i++) {
                const lineNum = Math.floor(Math.random() * pt.getLineCount()) + 1;
                pt.getLineBoundaries(lineNum);
            }
        });
    });

    describe("Large Document Operations", () => {
        bench("initialize with 100,000 character document", () => {
            const content = "x".repeat(100000);
            new PieceTable(content);
        });

        bench("initialize with 10,000 line document", () => {
            const content = Array(10000).fill("line content\n").join("");
            new PieceTable(content);
        });

        bench("edit 100,000 char document", () => {
            const content = "x".repeat(100000);
            const pt = new PieceTable(content);
            pt.insert(50000, "TEST");
            pt.delete(50000, 4);
        });
    });

    describe("Realistic Editing Scenarios", () => {
        bench("typing simulation (character by character)", () => {
            const pt = new PieceTable();
            const text = "The quick brown fox jumps over the lazy dog";

            for (let i = 0; i < text.length; i++) {
                pt.insert(i, text[i]);
            }
        });

        bench("backspace simulation", () => {
            const pt = new PieceTable("x".repeat(1000));

            for (let i = 0; i < 500; i++) {
                pt.delete(pt.getTotalLength() - 1, 1);
            }
        });

        bench("paste large block", () => {
            const pt = new PieceTable("Some initial content\n");
            const largeBlock = "Pasted line\n".repeat(100);

            for (let i = 0; i < 10; i++) {
                pt.insert(pt.getTotalLength(), largeBlock);
            }
        });

        bench("find and replace simulation", () => {
            const content = "foo bar foo baz foo qux ".repeat(100);
            const pt = new PieceTable(content);

            // Replace all "foo" with "REPLACED"
            for (let i = 0; i < 100; i++) {
                const text = pt.getText();
                const index = text.indexOf("foo");
                if (index !== -1) {
                    pt.delete(index, 3);
                    pt.insert(index, "REPLACED");
                }
            }
        });
    });
});

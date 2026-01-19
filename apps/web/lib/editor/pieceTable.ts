import type { CursorPosition } from "@/types/editor";

/**
 * Represents a piece in the piece table.
 * Each piece references a contiguous range of text from either
 * the original buffer or the add buffer.
 */
interface Piece {
    /** Which buffer this piece references */
    source: "original" | "add";
    /** Start index in the source buffer */
    start: number;
    /** Number of characters in this piece */
    length: number;
}

/**
 * Cached information about a line for O(log n) line access.
 */
interface LineInfo {
    /** Character offset where this line starts in the document */
    startOffset: number;
    /** Length of the line (excluding newline character) */
    length: number;
    /** The piece index where this line starts */
    pieceIndex: number;
    /** Offset within the starting piece */
    pieceOffset: number;
}

/**
 * Snapshot of the piece table state for undo/redo.
 */
export interface PieceTableSnapshot {
    pieces: Piece[];
    addBuffer: string;
    lineCache: LineInfo[];
    totalLength: number;
}

/**
 * PieceTable - An efficient data structure for text editing.
 *
 * The piece table maintains two buffers:
 * - original: The immutable original content (never modified)
 * - add: An append-only buffer for all new text
 *
 * The document is represented as an ordered sequence of "pieces",
 * where each piece references a contiguous range in one of the buffers.
 *
 * Benefits:
 * - O(1) append for typing
 * - Efficient undo/redo via snapshots
 * - Memory efficient (original content never duplicated)
 */
export class PieceTable {
    private original: string;
    private add: string;
    private pieces: Piece[];
    private lineCache: LineInfo[];
    private totalLength: number;

    constructor(content = "") {
        this.original = content;
        this.add = "";
        this.totalLength = content.length;

        // Initialize with a single piece pointing to original buffer
        if (content.length > 0) {
            this.pieces = [{ source: "original", start: 0, length: content.length }];
        } else {
            this.pieces = [];
        }

        // Build initial line cache
        this.lineCache = [];
        this.rebuildLineCache();
    }

    /**
     * Rebuild the entire line cache from scratch.
     * Called on initialization and after major changes.
     */
    private rebuildLineCache(): void {
        this.lineCache = [];

        if (this.totalLength === 0) {
            // Empty document has one empty line
            this.lineCache.push({
                startOffset: 0,
                length: 0,
                pieceIndex: 0,
                pieceOffset: 0,
            });
            return;
        }

        let offset = 0;
        let lineStart = 0;
        let currentPieceIndex = 0;
        let currentPieceOffset = 0;

        for (let pieceIdx = 0; pieceIdx < this.pieces.length; pieceIdx++) {
            const piece = this.pieces[pieceIdx];
            const buffer = piece.source === "original" ? this.original : this.add;
            const pieceText = buffer.substring(piece.start, piece.start + piece.length);

            for (let i = 0; i < pieceText.length; i++) {
                if (pieceText[i] === "\n") {
                    this.lineCache.push({
                        startOffset: lineStart,
                        length: offset - lineStart,
                        pieceIndex: currentPieceIndex,
                        pieceOffset: currentPieceOffset,
                    });
                    lineStart = offset + 1;
                    currentPieceIndex = pieceIdx;
                    currentPieceOffset = i + 1;
                }
                offset++;
            }
        }

        // Add final line (or only line if no newlines)
        this.lineCache.push({
            startOffset: lineStart,
            length: offset - lineStart,
            pieceIndex: currentPieceIndex,
            pieceOffset: currentPieceOffset,
        });
    }

    /**
     * Get the total document length in characters.
     */
    getTotalLength(): number {
        return this.totalLength;
    }

    /**
     * Get the number of lines in the document.
     */
    getLineCount(): number {
        return this.lineCache.length;
    }

    /**
     * Get the full document text, or a substring.
     */
    getText(start = 0, end: number = this.totalLength): string {
        if (start >= end || start >= this.totalLength) {
            return "";
        }

        const clampedEnd = Math.min(end, this.totalLength);
        let result = "";
        let currentOffset = 0;

        for (const piece of this.pieces) {
            if (currentOffset >= clampedEnd) break;

            const pieceEnd = currentOffset + piece.length;

            if (pieceEnd > start) {
                const buffer = piece.source === "original" ? this.original : this.add;
                const localStart = Math.max(0, start - currentOffset);
                const localEnd = Math.min(piece.length, clampedEnd - currentOffset);
                result += buffer.substring(piece.start + localStart, piece.start + localEnd);
            }

            currentOffset = pieceEnd;
        }

        return result;
    }

    /**
     * Get the content of a specific line (1-indexed).
     * Does not include the trailing newline.
     */
    getLine(lineNumber: number): string {
        if (lineNumber < 1 || lineNumber > this.lineCache.length) {
            return "";
        }

        const lineInfo = this.lineCache[lineNumber - 1];

        if (lineInfo.length === 0) {
            return "";
        }

        return this.getText(lineInfo.startOffset, lineInfo.startOffset + lineInfo.length);
    }

    /**
     * Get information about a specific line (1-indexed).
     */
    getLineInfo(lineNumber: number): LineInfo | null {
        if (lineNumber < 1 || lineNumber > this.lineCache.length) {
            return null;
        }
        return this.lineCache[lineNumber - 1];
    }

    /**
     * Convert a document offset to a cursor position (1-indexed line/column).
     */
    offsetToPosition(offset: number): CursorPosition {
        if (offset <= 0) {
            return { line: 1, column: 1 };
        }

        if (offset >= this.totalLength) {
            const lastLine = this.lineCache.length;
            const lastLineInfo = this.lineCache[lastLine - 1];
            return { line: lastLine, column: lastLineInfo.length + 1 };
        }

        // Binary search for the line containing this offset
        let low = 0;
        let high = this.lineCache.length - 1;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const lineInfo = this.lineCache[mid];
            const lineEnd = lineInfo.startOffset + lineInfo.length;

            if (offset < lineInfo.startOffset) {
                high = mid - 1;
            } else if (offset > lineEnd) {
                low = mid + 1;
            } else {
                // Found the line
                return {
                    line: mid + 1,
                    column: offset - lineInfo.startOffset + 1,
                };
            }
        }

        const lineInfo = this.lineCache[low];
        return {
            line: low + 1,
            column: offset - lineInfo.startOffset + 1,
        };
    }

    /**
     * Convert a cursor position (1-indexed) to a document offset.
     */
    positionToOffset(position: CursorPosition): number {
        const { line, column } = position;

        if (line < 1) {
            return 0;
        }

        if (line > this.lineCache.length) {
            return this.totalLength;
        }

        const lineInfo = this.lineCache[line - 1];
        const lineOffset = lineInfo.startOffset;
        const maxColumn = lineInfo.length + 1; // +1 for position after last char

        return lineOffset + Math.min(column - 1, maxColumn - 1);
    }

    /**
     * Find the piece and offset within that piece for a given document offset.
     */
    private findPieceAtOffset(offset: number): { pieceIndex: number; pieceOffset: number } {
        let currentOffset = 0;

        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i];
            if (currentOffset + piece.length > offset) {
                return { pieceIndex: i, pieceOffset: offset - currentOffset };
            }
            currentOffset += piece.length;
        }

        // Offset is at or past the end
        return { pieceIndex: this.pieces.length, pieceOffset: 0 };
    }

    /**
     * Insert text at the given offset.
     */
    insert(insertOffset: number, text: string): void {
        if (text.length === 0) return;

        // Clamp offset to valid range
        const offset = Math.max(0, Math.min(insertOffset, this.totalLength));

        // Add text to the add buffer
        const addStart = this.add.length;
        this.add += text;

        const newPiece: Piece = {
            source: "add",
            start: addStart,
            length: text.length,
        };

        if (this.pieces.length === 0) {
            // Empty document
            this.pieces.push(newPiece);
        } else if (offset === 0) {
            // Insert at beginning
            this.pieces.unshift(newPiece);
        } else if (offset === this.totalLength) {
            // Insert at end
            this.pieces.push(newPiece);
        } else {
            // Insert in the middle - need to split a piece
            const { pieceIndex, pieceOffset } = this.findPieceAtOffset(offset);
            const piece = this.pieces[pieceIndex];

            if (pieceOffset === 0) {
                // Insert before this piece
                this.pieces.splice(pieceIndex, 0, newPiece);
            } else if (pieceOffset === piece.length) {
                // Insert after this piece
                this.pieces.splice(pieceIndex + 1, 0, newPiece);
            } else {
                // Split the piece
                const firstHalf: Piece = {
                    source: piece.source,
                    start: piece.start,
                    length: pieceOffset,
                };
                const secondHalf: Piece = {
                    source: piece.source,
                    start: piece.start + pieceOffset,
                    length: piece.length - pieceOffset,
                };
                this.pieces.splice(pieceIndex, 1, firstHalf, newPiece, secondHalf);
            }
        }

        this.totalLength += text.length;
        this.rebuildLineCache();
    }

    /**
     * Delete text starting at the given offset.
     */
    delete(deleteOffset: number, deleteLength: number): void {
        if (deleteLength <= 0 || deleteOffset >= this.totalLength) return;

        // Clamp to valid range
        const offset = Math.max(0, deleteOffset);
        const length = Math.min(deleteLength, this.totalLength - offset);

        const deleteEnd = offset + length;
        const newPieces: Piece[] = [];
        let currentOffset = 0;

        for (const piece of this.pieces) {
            const pieceEnd = currentOffset + piece.length;

            if (pieceEnd <= offset || currentOffset >= deleteEnd) {
                // Piece is entirely outside the delete range - keep it
                newPieces.push(piece);
            } else if (currentOffset >= offset && pieceEnd <= deleteEnd) {
                // Piece is entirely within the delete range - remove it
                // (don't add to newPieces)
            } else if (currentOffset < offset && pieceEnd > deleteEnd) {
                // Delete range is entirely within this piece - split into two
                const firstLength = offset - currentOffset;
                const secondStart = piece.start + (deleteEnd - currentOffset);
                const secondLength = pieceEnd - deleteEnd;

                newPieces.push({
                    source: piece.source,
                    start: piece.start,
                    length: firstLength,
                });
                newPieces.push({
                    source: piece.source,
                    start: secondStart,
                    length: secondLength,
                });
            } else if (currentOffset < offset) {
                // Delete starts in this piece - keep the beginning
                newPieces.push({
                    source: piece.source,
                    start: piece.start,
                    length: offset - currentOffset,
                });
            } else {
                // Delete ends in this piece - keep the end
                const deleteInPiece = deleteEnd - currentOffset;
                newPieces.push({
                    source: piece.source,
                    start: piece.start + deleteInPiece,
                    length: piece.length - deleteInPiece,
                });
            }

            currentOffset = pieceEnd;
        }

        this.pieces = newPieces;
        this.totalLength -= length;
        this.rebuildLineCache();
    }

    /**
     * Create a snapshot of the current state for undo/redo.
     */
    snapshot(): PieceTableSnapshot {
        return {
            pieces: this.pieces.map((p) => ({ ...p })),
            addBuffer: this.add,
            lineCache: this.lineCache.map((l) => ({ ...l })),
            totalLength: this.totalLength,
        };
    }

    /**
     * Restore state from a snapshot.
     */
    restore(snapshot: PieceTableSnapshot): void {
        this.pieces = snapshot.pieces.map((p) => ({ ...p }));
        this.add = snapshot.addBuffer;
        this.lineCache = snapshot.lineCache.map((l) => ({ ...l }));
        this.totalLength = snapshot.totalLength;
    }

    /**
     * Get word boundaries around a position for double-click selection.
     */
    getWordBoundaries(offset: number): { start: number; end: number } {
        const text = this.getText();
        const wordChars = /[\w]/;

        let start = offset;
        let end = offset;

        // Find start of word
        while (start > 0 && wordChars.test(text[start - 1])) {
            start--;
        }

        // Find end of word
        while (end < text.length && wordChars.test(text[end])) {
            end++;
        }

        return { start, end };
    }

    /**
     * Get line boundaries for triple-click selection.
     */
    getLineBoundaries(lineNumber: number): { start: number; end: number } {
        if (lineNumber < 1 || lineNumber > this.lineCache.length) {
            return { start: 0, end: 0 };
        }

        const lineInfo = this.lineCache[lineNumber - 1];
        const start = lineInfo.startOffset;
        let end = lineInfo.startOffset + lineInfo.length;

        // Include the newline if not the last line
        if (lineNumber < this.lineCache.length) {
            end += 1;
        }

        return { start, end };
    }
}

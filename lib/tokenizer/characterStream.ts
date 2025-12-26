/**
 * CharacterStream - Input abstraction for the tokenizer.
 *
 * Provides character-by-character access with position tracking,
 * lookahead, and pattern matching capabilities.
 */
export class CharacterStream {
    private source: string;
    private pos = 0;
    private lineNum = 1;
    private colNum = 1;
    private lineStarts: number[] = [0];

    constructor(source: string) {
        this.source = source;
        // Pre-compute line start positions for efficient line lookup
        for (let i = 0; i < source.length; i++) {
            if (source[i] === "\n") {
                this.lineStarts.push(i + 1);
            }
        }
    }

    /** Current character position in source */
    get position(): number {
        return this.pos;
    }

    /** Current line number (1-indexed) */
    get line(): number {
        return this.lineNum;
    }

    /** Current column number (1-indexed) */
    get column(): number {
        return this.colNum;
    }

    /** Get current character without consuming */
    current(): string {
        return this.source[this.pos] ?? "";
    }

    /** Look ahead by offset characters without consuming */
    peek(offset = 1): string {
        return this.source[this.pos + offset] ?? "";
    }

    /** Consume and return current character, advancing position */
    next(): string {
        const char = this.source[this.pos] ?? "";
        if (char) {
            this.pos++;
            if (char === "\n") {
                this.lineNum++;
                this.colNum = 1;
            } else {
                this.colNum++;
            }
        }
        return char;
    }

    /** Check if at end of file */
    eof(): boolean {
        return this.pos >= this.source.length;
    }

    /** Check if at start of line */
    sol(): boolean {
        return this.colNum === 1;
    }

    /** Check if at end of line */
    eol(): boolean {
        return this.current() === "\n" || this.eof();
    }

    /**
     * Match a string or regex pattern at current position.
     * @param pattern - String or RegExp to match
     * @param consume - If true, advance position past the match
     * @returns Matched string or null if no match
     */
    match(pattern: string | RegExp, consume = true): string | null {
        if (typeof pattern === "string") {
            const slice = this.source.slice(this.pos, this.pos + pattern.length);
            if (slice === pattern) {
                if (consume) {
                    for (let i = 0; i < pattern.length; i++) {
                        this.next();
                    }
                }
                return pattern;
            }
            return null;
        }

        // RegExp match - must start at current position
        const regex = new RegExp(`^(?:${pattern.source})`, pattern.flags);
        const remaining = this.source.slice(this.pos);
        const result = regex.exec(remaining);

        if (result) {
            const matched = result[0];
            if (consume) {
                for (let i = 0; i < matched.length; i++) {
                    this.next();
                }
            }
            return matched;
        }
        return null;
    }

    /**
     * Skip whitespace characters (space, tab).
     * Does NOT skip newlines.
     * @returns Number of characters skipped
     */
    skipSpaces(): number {
        let count = 0;
        while (this.current() === " " || this.current() === "\t") {
            this.next();
            count++;
        }
        return count;
    }

    /**
     * Skip all whitespace including newlines.
     * @returns Number of characters skipped
     */
    skipWhitespace(): number {
        let count = 0;
        while (/\s/.test(this.current())) {
            this.next();
            count++;
        }
        return count;
    }

    /** Save current position for backtracking */
    mark(): { pos: number; line: number; col: number } {
        return {
            pos: this.pos,
            line: this.lineNum,
            col: this.colNum,
        };
    }

    /** Restore to a previously marked position */
    reset(marker: { pos: number; line: number; col: number }): void {
        this.pos = marker.pos;
        this.lineNum = marker.line;
        this.colNum = marker.col;
    }

    /** Get a slice of the source */
    slice(start: number, end: number): string {
        return this.source.slice(start, end);
    }

    /** Get content of a specific line (0-indexed) */
    getLine(lineIndex: number): string {
        const start = this.lineStarts[lineIndex];
        const end = this.lineStarts[lineIndex + 1] ?? this.source.length;
        // Remove trailing newline if present
        const line = this.source.slice(start, end);
        return line.endsWith("\n") ? line.slice(0, -1) : line;
    }

    /** Get total number of lines */
    get lineCount(): number {
        return this.lineStarts.length;
    }

    /** Check if a character is a digit */
    static isDigit(char: string): boolean {
        return char >= "0" && char <= "9";
    }

    /** Check if a character is a hex digit */
    static isHexDigit(char: string): boolean {
        return (char >= "0" && char <= "9") || (char >= "a" && char <= "f") || (char >= "A" && char <= "F");
    }

    /** Check if a character is whitespace */
    static isWhitespace(char: string): boolean {
        return char === " " || char === "\t" || char === "\n" || char === "\r";
    }
}

/**
 * Create a new CharacterStream from source code.
 */
export function createCharacterStream(source: string): CharacterStream {
    return new CharacterStream(source);
}

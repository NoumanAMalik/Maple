import type { LineTokenizer, LineState, Token, TokenizeLineResult, TokenType } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

function createToken(type: TokenType, start: number, length: number): Token {
    return { type, start, length };
}

function tokenizeNormal(line: string, tokens: Token[]): void {
    let pos = 0;

    while (pos < line.length) {
        const ch = line[pos];

        // Whitespace
        if (/\s/.test(ch)) {
            let end = pos + 1;
            while (end < line.length && /\s/.test(line[end])) end++;
            tokens.push(createToken("whitespace", pos, end - pos));
            pos = end;
            continue;
        }

        // Strings (both keys and values)
        if (ch === '"') {
            let end = pos + 1;
            while (end < line.length) {
                if (line[end] === "\\") {
                    // Skip escape sequence
                    if (end + 1 < line.length) {
                        end += 2;
                        continue;
                    }
                    end++;
                    break;
                }
                if (line[end] === '"') {
                    end++;
                    break;
                }
                end++;
            }

            // Check if this is a property key (followed by :)
            let afterString = end;
            while (afterString < line.length && /\s/.test(line[afterString])) afterString++;

            if (line[afterString] === ":") {
                tokens.push(createToken("property", pos, end - pos));
            } else {
                tokens.push(createToken("string", pos, end - pos));
            }
            pos = end;
            continue;
        }

        // Numbers (including negative and scientific notation)
        if (/[-\d]/.test(ch)) {
            const start = pos;
            let end = pos;

            // Optional negative sign
            if (line[end] === "-") {
                end++;
            }

            // Must have at least one digit
            if (end >= line.length || !/\d/.test(line[end])) {
                // Not a number, treat as unknown
                tokens.push(createToken("unknown", pos, 1));
                pos++;
                continue;
            }

            // Integer part
            while (end < line.length && /\d/.test(line[end])) end++;

            // Decimal part
            if (end < line.length && line[end] === ".") {
                end++;
                while (end < line.length && /\d/.test(line[end])) end++;
            }

            // Exponent part
            if (end < line.length && (line[end] === "e" || line[end] === "E")) {
                end++;
                if (end < line.length && (line[end] === "+" || line[end] === "-")) {
                    end++;
                }
                while (end < line.length && /\d/.test(line[end])) end++;
            }

            tokens.push(createToken("number", start, end - start));
            pos = end;
            continue;
        }

        // Keywords: true, false, null
        if (line[pos] === "t" && line.slice(pos, pos + 4) === "true") {
            tokens.push(createToken("constant", pos, 4));
            pos += 4;
            continue;
        }

        if (line[pos] === "f" && line.slice(pos, pos + 5) === "false") {
            tokens.push(createToken("constant", pos, 5));
            pos += 5;
            continue;
        }

        if (line[pos] === "n" && line.slice(pos, pos + 4) === "null") {
            tokens.push(createToken("constant", pos, 4));
            pos += 4;
            continue;
        }

        // Punctuation: {, }, [, ], :, ,
        if (/[{}[\]:,]/.test(ch)) {
            tokens.push(createToken("punctuation", pos, 1));
            pos++;
            continue;
        }

        // Unknown character
        tokens.push(createToken("unknown", pos, 1));
        pos++;
    }
}

export const jsonTokenizer: LineTokenizer = {
    languageId: "json",
    initialState: INITIAL_STATE,
    tokenizeLine(line: string, _startState: LineState): TokenizeLineResult {
        const tokens: Token[] = [];
        tokenizeNormal(line, tokens);
        return { tokens, endState: INITIAL_STATE };
    },
};

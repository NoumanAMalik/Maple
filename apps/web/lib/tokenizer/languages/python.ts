import type { LineTokenizer, LineState, Token, TokenizeLineResult, TokenType } from "../types";

const KEYWORDS = new Set([
    "False",
    "None",
    "True",
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield",
]);

const BUILTINS = new Set([
    "print",
    "len",
    "range",
    "str",
    "int",
    "float",
    "list",
    "dict",
    "set",
    "tuple",
    "bool",
    "type",
    "isinstance",
    "hasattr",
    "getattr",
    "setattr",
    "open",
    "input",
    "sum",
    "min",
    "max",
    "abs",
    "round",
    "sorted",
    "reversed",
    "enumerate",
    "zip",
    "map",
    "filter",
    "any",
    "all",
    "iter",
    "next",
]);

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

function createToken(type: TokenType, start: number, length: number): Token {
    return { type, start, length };
}

function tokenizeNormal(line: string, startPos: number, tokens: Token[]): { pos: number; newState?: LineState } {
    let pos = startPos;

    while (pos < line.length) {
        const ch = line[pos];
        const next = line[pos + 1];

        // Whitespace
        if (/\s/.test(ch)) {
            let end = pos + 1;
            while (end < line.length && /\s/.test(line[end])) end++;
            tokens.push(createToken("whitespace", pos, end - pos));
            pos = end;
            continue;
        }

        // Line comment #
        if (ch === "#") {
            tokens.push(createToken("comment", pos, line.length - pos));
            return { pos: line.length };
        }

        // Decorator @
        if (ch === "@") {
            tokens.push(createToken("keyword", pos, 1));
            pos++;
            // Skip whitespace after @
            while (pos < line.length && /\s/.test(line[pos])) {
                tokens.push(createToken("whitespace", pos, 1));
                pos++;
            }
            // Tokenize decorator name
            if (pos < line.length && /[A-Za-z_]/.test(line[pos])) {
                let end = pos + 1;
                while (end < line.length && /[\w]/.test(line[end])) end++;
                tokens.push(createToken("function", pos, end - pos));
                pos = end;
            }
            continue;
        }

        // Triple-quoted strings (must check before single quotes)
        if ((ch === '"' || ch === "'") && line.slice(pos, pos + 3) === ch.repeat(3)) {
            const quote = ch.repeat(3);
            const closeIndex = line.indexOf(quote, pos + 3);
            if (closeIndex !== -1) {
                tokens.push(createToken("string", pos, closeIndex + 3 - pos));
                pos = closeIndex + 3;
                continue;
            }
            // Unclosed triple-quoted string - continues to next line
            tokens.push(createToken("string", pos, line.length - pos));
            return {
                pos: line.length,
                newState: { kind: "triple-string", templateExpressionDepth: ch === '"' ? 1 : 2 },
            };
        }

        // String prefixes (f, r, b, u) followed by strings
        if (/[fFrRbBuU]/.test(ch) && (line[pos + 1] === '"' || line[pos + 1] === "'")) {
            const quote = line[pos + 1];

            // Check for triple-quoted string with prefix
            if (line.slice(pos + 1, pos + 4) === quote.repeat(3)) {
                const tripleQuote = quote.repeat(3);
                const closeIndex = line.indexOf(tripleQuote, pos + 4);
                if (closeIndex !== -1) {
                    tokens.push(createToken("string", pos, closeIndex + 4 - pos));
                    pos = closeIndex + 4;
                    continue;
                }
                tokens.push(createToken("string", pos, line.length - pos));
                return {
                    pos: line.length,
                    newState: { kind: "triple-string", templateExpressionDepth: quote === '"' ? 1 : 2 },
                };
            }

            // Regular string with prefix
            let end = pos + 2;
            while (end < line.length) {
                if (line[end] === "\\" && end + 1 < line.length) {
                    end += 2;
                    continue;
                }
                if (line[end] === quote) {
                    end++;
                    break;
                }
                end++;
            }
            tokens.push(createToken("string", pos, end - pos));
            pos = end;
            continue;
        }

        // Regular strings
        if (ch === '"' || ch === "'") {
            let end = pos + 1;
            while (end < line.length) {
                if (line[end] === "\\" && end + 1 < line.length) {
                    end += 2;
                    continue;
                }
                if (line[end] === ch) {
                    end++;
                    break;
                }
                end++;
            }
            tokens.push(createToken("string", pos, end - pos));
            pos = end;
            continue;
        }

        // Numbers
        if (/\d/.test(ch) || (ch === "." && /\d/.test(next || ""))) {
            let end = pos;

            // Hex: 0x or 0X
            if (line[end] === "0" && (line[end + 1] === "x" || line[end + 1] === "X")) {
                end += 2;
                while (end < line.length && /[\da-fA-F_]/.test(line[end])) end++;
            }
            // Binary: 0b or 0B
            else if (line[end] === "0" && (line[end + 1] === "b" || line[end + 1] === "B")) {
                end += 2;
                while (end < line.length && /[01_]/.test(line[end])) end++;
            }
            // Octal: 0o or 0O
            else if (line[end] === "0" && (line[end + 1] === "o" || line[end + 1] === "O")) {
                end += 2;
                while (end < line.length && /[0-7_]/.test(line[end])) end++;
            }
            // Decimal or float
            else {
                while (end < line.length && /[\d_]/.test(line[end])) end++;

                // Decimal point
                if (line[end] === "." && /\d/.test(line[end + 1] || "")) {
                    end++;
                    while (end < line.length && /[\d_]/.test(line[end])) end++;
                }

                // Scientific notation
                if ((line[end] === "e" || line[end] === "E") && /[\d+-]/.test(line[end + 1] || "")) {
                    end++;
                    if (line[end] === "+" || line[end] === "-") end++;
                    while (end < line.length && /[\d_]/.test(line[end])) end++;
                }
            }

            // Complex number suffix (j)
            if (line[end] === "j" || line[end] === "J") end++;

            tokens.push(createToken("number", pos, end - pos));
            pos = end;
            continue;
        }

        // Identifiers / keywords
        if (/[A-Za-z_]/.test(ch)) {
            let end = pos + 1;
            while (end < line.length && /[\w]/.test(line[end])) end++;
            const text = line.slice(pos, end);

            if (KEYWORDS.has(text)) {
                if (text === "True" || text === "False" || text === "None") {
                    tokens.push(createToken("constant", pos, end - pos));
                } else {
                    tokens.push(createToken("keyword", pos, end - pos));
                }
            } else if (BUILTINS.has(text)) {
                tokens.push(createToken("function", pos, end - pos));
            } else if (/^\s*\(/.test(line.slice(end))) {
                tokens.push(createToken("function", pos, end - pos));
            } else if (/^[A-Z]/.test(text) && /[a-z]/.test(text)) {
                tokens.push(createToken("class", pos, end - pos));
            } else {
                tokens.push(createToken("identifier", pos, end - pos));
            }
            pos = end;
            continue;
        }

        // Operators (Python-specific)
        if (/[+\-*/%=!<>|&^~@]/.test(ch)) {
            let end = pos + 1;
            // Multi-character operators: //, **, <<, >>, ==, !=, <=, >=, etc.
            while (end < line.length && /[+\-*/%=!<>|&^]/.test(line[end])) end++;
            tokens.push(createToken("operator", pos, end - pos));
            pos = end;
            continue;
        }

        // Punctuation
        if (/[,.;:()[\]{}]/.test(ch)) {
            tokens.push(createToken("punctuation", pos, 1));
            pos++;
            continue;
        }

        // Unknown
        tokens.push(createToken("unknown", pos, 1));
        pos++;
    }

    return { pos };
}

function tokenizeTripleString(line: string, tokens: Token[], quoteType: number): { pos: number; endState: LineState } {
    const quote = quoteType === 1 ? '"""' : "'''";
    const closeIndex = line.indexOf(quote);

    if (closeIndex !== -1) {
        tokens.push(createToken("string", 0, closeIndex + 3));
        const result = tokenizeNormal(line, closeIndex + 3, tokens);
        return {
            pos: result.pos,
            endState: result.newState || INITIAL_STATE,
        };
    }

    tokens.push(createToken("string", 0, line.length));
    return { pos: line.length, endState: { kind: "triple-string", templateExpressionDepth: quoteType } };
}

export const pythonTokenizer: LineTokenizer = {
    languageId: "python",
    initialState: INITIAL_STATE,
    tokenizeLine(line: string, startState: LineState): TokenizeLineResult {
        const tokens: Token[] = [];

        // Handle triple-quoted string continuation
        if (startState.kind === "triple-string") {
            const result = tokenizeTripleString(line, tokens, startState.templateExpressionDepth);
            return { tokens, endState: result.endState };
        }

        const result = tokenizeNormal(line, 0, tokens);
        return {
            tokens,
            endState: result.newState || INITIAL_STATE,
        };
    },
};

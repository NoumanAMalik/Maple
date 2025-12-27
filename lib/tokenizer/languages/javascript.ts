import type { LineTokenizer, LineState, Token, TokenizeLineResult, TokenType } from "../types";

const KEYWORDS = new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "try",
    "catch",
    "finally",
    "throw",
    "class",
    "extends",
    "new",
    "import",
    "export",
    "from",
    "as",
    "default",
    "type",
    "interface",
    "implements",
    "enum",
    "public",
    "private",
    "protected",
    "readonly",
    "async",
    "await",
    "static",
    "get",
    "set",
    "yield",
    "delete",
    "typeof",
    "instanceof",
    "in",
    "of",
    "void",
    "null",
    "undefined",
    "true",
    "false",
    "this",
    "super",
    "debugger",
    "with",
    "do",
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

        // Line comment //
        if (ch === "/" && next === "/") {
            tokens.push(createToken("comment", pos, line.length - pos));
            return { pos: line.length };
        }

        // Block comment start /*
        if (ch === "/" && next === "*") {
            const closeIndex = line.indexOf("*/", pos + 2);
            if (closeIndex !== -1) {
                tokens.push(createToken("comment", pos, closeIndex + 2 - pos));
                pos = closeIndex + 2;
                continue;
            }
            tokens.push(createToken("comment", pos, line.length - pos));
            return { pos: line.length, newState: { kind: "block-comment", templateExpressionDepth: 0 } };
        }

        // Template string start
        if (ch === "`") {
            return tokenizeTemplateString(line, pos, tokens, 0);
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
            if (line[end] === "0" && (line[end + 1] === "x" || line[end + 1] === "X")) {
                end += 2;
                while (end < line.length && /[\da-fA-F_]/.test(line[end])) end++;
            } else if (line[end] === "0" && (line[end + 1] === "b" || line[end + 1] === "B")) {
                end += 2;
                while (end < line.length && /[01_]/.test(line[end])) end++;
            } else {
                while (end < line.length && /[\d_]/.test(line[end])) end++;
                if (line[end] === "." && /\d/.test(line[end + 1] || "")) {
                    end++;
                    while (end < line.length && /[\d_]/.test(line[end])) end++;
                }
                if ((line[end] === "e" || line[end] === "E") && /[\d+-]/.test(line[end + 1] || "")) {
                    end++;
                    if (line[end] === "+" || line[end] === "-") end++;
                    while (end < line.length && /[\d_]/.test(line[end])) end++;
                }
            }
            if (line[end] === "n") end++;
            tokens.push(createToken("number", pos, end - pos));
            pos = end;
            continue;
        }

        // Identifiers / keywords
        if (/[A-Za-z_$]/.test(ch)) {
            let end = pos + 1;
            while (end < line.length && /[\w$]/.test(line[end])) end++;
            const text = line.slice(pos, end);

            if (KEYWORDS.has(text)) {
                if (text === "true" || text === "false" || text === "null" || text === "undefined") {
                    tokens.push(createToken("constant", pos, end - pos));
                } else {
                    tokens.push(createToken("keyword", pos, end - pos));
                }
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

        // Operators
        if (/[+\-*/%=!<>|&^?:~]/.test(ch)) {
            let end = pos + 1;
            while (end < line.length && /[+\-*/%=!<>|&^?:]/.test(line[end])) end++;
            tokens.push(createToken("operator", pos, end - pos));
            pos = end;
            continue;
        }

        // Punctuation
        if (/[,.;()[\]{}]/.test(ch)) {
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

function tokenizeBlockComment(line: string, tokens: Token[]): { pos: number; endState: LineState } {
    const closeIndex = line.indexOf("*/");
    if (closeIndex !== -1) {
        tokens.push(createToken("comment", 0, closeIndex + 2));
        const result = tokenizeNormal(line, closeIndex + 2, tokens);
        return {
            pos: result.pos,
            endState: result.newState || INITIAL_STATE,
        };
    }
    tokens.push(createToken("comment", 0, line.length));
    return { pos: line.length, endState: { kind: "block-comment", templateExpressionDepth: 0 } };
}

function tokenizeTemplateString(
    line: string,
    startPos: number,
    tokens: Token[],
    depth: number,
): { pos: number; newState?: LineState } {
    let pos = startPos;
    const stringStart = pos;
    pos++;

    while (pos < line.length) {
        const ch = line[pos];

        if (ch === "\\") {
            pos += 2;
            continue;
        }

        if (ch === "`") {
            tokens.push(createToken("string", stringStart, pos + 1 - stringStart));
            return { pos: pos + 1 };
        }

        if (ch === "$" && line[pos + 1] === "{") {
            tokens.push(createToken("string", stringStart, pos - stringStart));
            tokens.push(createToken("punctuation", pos, 2));
            pos += 2;

            let braceDepth = 1;
            while (pos < line.length && braceDepth > 0) {
                const result = tokenizeNormal(line, pos, tokens);
                if (result.newState) {
                    return {
                        pos: line.length,
                        newState: { kind: "template-string", templateExpressionDepth: depth + 1 },
                    };
                }
                pos = result.pos;

                let innerPos = pos;
                while (innerPos < line.length) {
                    if (line[innerPos] === "{") braceDepth++;
                    if (line[innerPos] === "}") {
                        braceDepth--;
                        if (braceDepth === 0) {
                            tokens.push(createToken("punctuation", innerPos, 1));
                            pos = innerPos + 1;
                            break;
                        }
                    }
                    innerPos++;
                }
                if (braceDepth > 0) {
                    return {
                        pos: line.length,
                        newState: { kind: "template-string", templateExpressionDepth: depth + 1 },
                    };
                }
            }

            return tokenizeTemplateString(line, pos - 1, tokens, depth);
        }

        pos++;
    }

    tokens.push(createToken("string", stringStart, line.length - stringStart));
    return { pos: line.length, newState: { kind: "template-string", templateExpressionDepth: depth } };
}

export const javascriptTokenizer: LineTokenizer = {
    languageId: "javascript",
    initialState: INITIAL_STATE,
    tokenizeLine(line: string, startState: LineState): TokenizeLineResult {
        const tokens: Token[] = [];

        if (startState.kind === "block-comment") {
            const result = tokenizeBlockComment(line, tokens);
            return { tokens, endState: result.endState };
        }

        if (startState.kind === "template-string") {
            const result = tokenizeTemplateString(line, 0, tokens, startState.templateExpressionDepth);
            return {
                tokens,
                endState: result.newState || INITIAL_STATE,
            };
        }

        const result = tokenizeNormal(line, 0, tokens);
        return {
            tokens,
            endState: result.newState || INITIAL_STATE,
        };
    },
};

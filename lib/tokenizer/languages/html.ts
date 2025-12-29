import type { LineTokenizer, LineState, Token, TokenizeLineResult, TokenType } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

const HTML_COMMENT_STATE: LineState = {
    kind: "block-comment",
    templateExpressionDepth: 0,
};

function createToken(type: TokenType, start: number, length: number): Token {
    return { type, start, length };
}

function tokenizeNormal(line: string, startPos: number, tokens: Token[]): { pos: number; newState?: LineState } {
    let pos = startPos;

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

        // HTML comment start <!--
        if (ch === "<" && line.slice(pos, pos + 4) === "<!--") {
            const closeIndex = line.indexOf("-->", pos + 4);
            if (closeIndex !== -1) {
                tokens.push(createToken("comment", pos, closeIndex + 3 - pos));
                pos = closeIndex + 3;
                continue;
            }
            tokens.push(createToken("comment", pos, line.length - pos));
            return { pos: line.length, newState: HTML_COMMENT_STATE };
        }

        // DOCTYPE declaration
        if (ch === "<" && line.slice(pos, pos + 9).toLowerCase() === "<!doctype") {
            let end = pos;
            while (end < line.length && line[end] !== ">") end++;
            if (end < line.length) end++;
            tokens.push(createToken("keyword", pos, end - pos));
            pos = end;
            continue;
        }

        // HTML entities
        if (ch === "&") {
            let end = pos + 1;
            // Named entity: &name;
            if (/[a-zA-Z]/.test(line[end] || "")) {
                while (end < line.length && /[a-zA-Z0-9]/.test(line[end])) end++;
                if (line[end] === ";") end++;
                tokens.push(createToken("constant", pos, end - pos));
                pos = end;
                continue;
            }
            // Numeric entity: &#123; or &#xAB;
            if (line[end] === "#") {
                end++;
                if (line[end] === "x" || line[end] === "X") end++;
                while (end < line.length && /[\da-fA-F]/.test(line[end])) end++;
                if (line[end] === ";") end++;
                tokens.push(createToken("constant", pos, end - pos));
                pos = end;
                continue;
            }
        }

        // Tags: <tag> or </tag> or <tag/> or <tag />
        if (ch === "<") {
            const tagStart = pos;
            pos++;

            // Closing tag: </
            if (line[pos] === "/") {
                tokens.push(createToken("punctuation", tagStart, 2));
                pos++;

                // Tag name
                if (/[a-zA-Z]/.test(line[pos] || "")) {
                    const nameStart = pos;
                    while (pos < line.length && /[a-zA-Z0-9-]/.test(line[pos])) pos++;
                    tokens.push(createToken("tag", nameStart, pos - nameStart));
                }

                // Closing >
                while (pos < line.length && /\s/.test(line[pos])) pos++;
                if (line[pos] === ">") {
                    tokens.push(createToken("punctuation", pos, 1));
                    pos++;
                }
                continue;
            }

            // Opening tag: <
            tokens.push(createToken("punctuation", tagStart, 1));

            // Tag name
            if (/[a-zA-Z]/.test(line[pos] || "")) {
                const nameStart = pos;
                while (pos < line.length && /[a-zA-Z0-9-]/.test(line[pos])) pos++;
                tokens.push(createToken("tag", nameStart, pos - nameStart));

                // Parse attributes
                while (pos < line.length) {
                    // Skip whitespace
                    const wsStart = pos;
                    while (pos < line.length && /\s/.test(line[pos])) pos++;
                    if (pos > wsStart) {
                        tokens.push(createToken("whitespace", wsStart, pos - wsStart));
                    }

                    // Check for self-closing /> or closing >
                    if (line[pos] === "/" && line[pos + 1] === ">") {
                        tokens.push(createToken("punctuation", pos, 2));
                        pos += 2;
                        break;
                    }
                    if (line[pos] === ">") {
                        tokens.push(createToken("punctuation", pos, 1));
                        pos++;
                        break;
                    }

                    // Attribute name
                    if (/[a-zA-Z]/.test(line[pos] || "")) {
                        const attrStart = pos;
                        while (pos < line.length && /[a-zA-Z0-9-_:]/.test(line[pos])) pos++;
                        tokens.push(createToken("attribute", attrStart, pos - attrStart));

                        // Skip whitespace around =
                        while (pos < line.length && /\s/.test(line[pos])) {
                            const wsStart = pos;
                            while (pos < line.length && /\s/.test(line[pos])) pos++;
                            tokens.push(createToken("whitespace", wsStart, pos - wsStart));
                        }

                        // = operator
                        if (line[pos] === "=") {
                            tokens.push(createToken("operator", pos, 1));
                            pos++;

                            // Skip whitespace after =
                            while (pos < line.length && /\s/.test(line[pos])) {
                                const wsStart = pos;
                                while (pos < line.length && /\s/.test(line[pos])) pos++;
                                tokens.push(createToken("whitespace", wsStart, pos - wsStart));
                            }

                            // Attribute value (quoted)
                            if (line[pos] === '"' || line[pos] === "'") {
                                const quote = line[pos];
                                const valueStart = pos;
                                pos++;
                                while (pos < line.length && line[pos] !== quote) {
                                    if (line[pos] === "\\") pos++;
                                    pos++;
                                }
                                if (line[pos] === quote) pos++;
                                tokens.push(createToken("string", valueStart, pos - valueStart));
                            } else if (/\S/.test(line[pos] || "")) {
                                // Unquoted attribute value
                                const valueStart = pos;
                                while (pos < line.length && /[^\s>]/.test(line[pos])) pos++;
                                tokens.push(createToken("string", valueStart, pos - valueStart));
                            }
                        }
                        continue;
                    }

                    // If we can't parse anything, break
                    break;
                }
            }
            continue;
        }

        // Text content - advance to next tag or special character
        const textStart = pos;
        while (pos < line.length && line[pos] !== "<" && line[pos] !== "&") {
            pos++;
        }
        if (pos > textStart) {
            // Don't tokenize plain text, just skip it
            continue;
        }

        // Unknown character
        tokens.push(createToken("unknown", pos, 1));
        pos++;
    }

    return { pos };
}

function tokenizeHtmlComment(line: string, tokens: Token[]): { pos: number; endState: LineState } {
    const closeIndex = line.indexOf("-->");
    if (closeIndex !== -1) {
        tokens.push(createToken("comment", 0, closeIndex + 3));
        const result = tokenizeNormal(line, closeIndex + 3, tokens);
        return {
            pos: result.pos,
            endState: result.newState || INITIAL_STATE,
        };
    }
    tokens.push(createToken("comment", 0, line.length));
    return { pos: line.length, endState: HTML_COMMENT_STATE };
}

export const htmlTokenizer: LineTokenizer = {
    languageId: "html",
    initialState: INITIAL_STATE,
    tokenizeLine(line: string, startState: LineState): TokenizeLineResult {
        const tokens: Token[] = [];

        // Handle HTML comment continuation
        if (startState.kind === "block-comment") {
            const result = tokenizeHtmlComment(line, tokens);
            return { tokens, endState: result.endState };
        }

        const result = tokenizeNormal(line, 0, tokens);
        return {
            tokens,
            endState: result.newState || INITIAL_STATE,
        };
    },
};

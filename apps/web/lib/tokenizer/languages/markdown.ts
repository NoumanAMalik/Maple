import type { LineTokenizer, LineState, Token, TokenizeLineResult, TokenType } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

const CODE_BLOCK_STATE: LineState = {
    kind: "block-comment", // Reuse block-comment state for code blocks
    templateExpressionDepth: 0,
};

function createToken(type: TokenType, start: number, length: number): Token {
    return { type, start, length };
}

function tokenizeCodeBlock(line: string, tokens: Token[]): { pos: number; endState: LineState } {
    // Check for code block end
    const trimmed = line.trimStart();
    const indentLength = line.length - trimmed.length;

    if (trimmed.startsWith("```")) {
        // End of code block
        if (indentLength > 0) {
            tokens.push(createToken("whitespace", 0, indentLength));
        }
        tokens.push(createToken("string", indentLength, line.length - indentLength));
        return { pos: line.length, endState: INITIAL_STATE };
    }

    // Inside code block - tokenize entire line as string
    tokens.push(createToken("string", 0, line.length));
    return { pos: line.length, endState: CODE_BLOCK_STATE };
}

function tokenizeNormal(line: string, startPos: number, tokens: Token[]): { pos: number; newState?: LineState } {
    let pos = startPos;

    // Check for fenced code block at start of line
    if (pos === 0) {
        const trimmed = line.trimStart();
        const indentLength = line.length - trimmed.length;

        if (trimmed.startsWith("```")) {
            // Start of code block
            if (indentLength > 0) {
                tokens.push(createToken("whitespace", 0, indentLength));
            }
            tokens.push(createToken("string", indentLength, line.length - indentLength));
            return { pos: line.length, newState: CODE_BLOCK_STATE };
        }

        // Check for heading
        if (trimmed.startsWith("#")) {
            if (indentLength > 0) {
                tokens.push(createToken("whitespace", 0, indentLength));
            }
            let level = indentLength;
            while (level < line.length && line[level] === "#" && level - indentLength < 6) level++;

            tokens.push(createToken("keyword", indentLength, level - indentLength));

            if (level < line.length && line[level] === " ") {
                tokens.push(createToken("whitespace", level, 1));
                pos = level + 1;
                // Rest of line is heading text - don't tokenize further
                if (pos < line.length) {
                    tokens.push(createToken("identifier", pos, line.length - pos));
                }
                return { pos: line.length };
            }
            pos = level;
            return { pos };
        }

        // Check for horizontal rule
        if (/^(\s*)(---+|___+|\*\*\*+)\s*$/.test(line)) {
            if (indentLength > 0) {
                tokens.push(createToken("whitespace", 0, indentLength));
            }
            tokens.push(createToken("keyword", indentLength, line.length - indentLength));
            return { pos: line.length };
        }

        // Check for blockquote
        if (trimmed.startsWith(">")) {
            if (indentLength > 0) {
                tokens.push(createToken("whitespace", 0, indentLength));
            }
            tokens.push(createToken("keyword", indentLength, 1));
            pos = indentLength + 1;
            if (pos < line.length && line[pos] === " ") {
                tokens.push(createToken("whitespace", pos, 1));
                pos++;
            }
            // Continue tokenizing rest of line
        }

        // Check for list items
        const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s/);
        if (listMatch) {
            const indent = listMatch[1].length;
            const marker = listMatch[2];
            if (indent > 0) {
                tokens.push(createToken("whitespace", 0, indent));
            }
            tokens.push(createToken("keyword", indent, marker.length));
            if (line[indent + marker.length] === " ") {
                tokens.push(createToken("whitespace", indent + marker.length, 1));
            }
            pos = indent + marker.length + 1;
            // Continue tokenizing rest of line
        }
    }

    // Tokenize inline elements
    while (pos < line.length) {
        const ch = line[pos];
        const next = line[pos + 1];

        // Inline code
        if (ch === "`") {
            const end = line.indexOf("`", pos + 1);
            if (end !== -1) {
                tokens.push(createToken("string", pos, end + 1 - pos));
                pos = end + 1;
                continue;
            }
            // No closing backtick, treat as regular character
            tokens.push(createToken("identifier", pos, 1));
            pos++;
            continue;
        }

        // Bold with **
        if (ch === "*" && next === "*") {
            const end = line.indexOf("**", pos + 2);
            if (end !== -1) {
                tokens.push(createToken("keyword", pos, 2)); // Opening **
                if (end > pos + 2) {
                    tokens.push(createToken("identifier", pos + 2, end - pos - 2)); // Content
                }
                tokens.push(createToken("keyword", end, 2)); // Closing **
                pos = end + 2;
                continue;
            }
        }

        // Bold with __
        if (ch === "_" && next === "_") {
            const end = line.indexOf("__", pos + 2);
            if (end !== -1) {
                tokens.push(createToken("keyword", pos, 2)); // Opening __
                if (end > pos + 2) {
                    tokens.push(createToken("identifier", pos + 2, end - pos - 2)); // Content
                }
                tokens.push(createToken("keyword", end, 2)); // Closing __
                pos = end + 2;
                continue;
            }
        }

        // Strikethrough with ~~
        if (ch === "~" && next === "~") {
            const end = line.indexOf("~~", pos + 2);
            if (end !== -1) {
                tokens.push(createToken("keyword", pos, 2)); // Opening ~~
                if (end > pos + 2) {
                    tokens.push(createToken("identifier", pos + 2, end - pos - 2)); // Content
                }
                tokens.push(createToken("keyword", end, 2)); // Closing ~~
                pos = end + 2;
                continue;
            }
        }

        // Italic with * (but not **)
        if (ch === "*" && next !== "*") {
            const end = line.indexOf("*", pos + 1);
            if (end !== -1 && line[end + 1] !== "*") {
                tokens.push(createToken("keyword", pos, 1)); // Opening *
                if (end > pos + 1) {
                    tokens.push(createToken("identifier", pos + 1, end - pos - 1)); // Content
                }
                tokens.push(createToken("keyword", end, 1)); // Closing *
                pos = end + 1;
                continue;
            }
        }

        // Italic with _ (but not __)
        if (ch === "_" && next !== "_") {
            const end = line.indexOf("_", pos + 1);
            if (end !== -1 && line[end + 1] !== "_") {
                tokens.push(createToken("keyword", pos, 1)); // Opening _
                if (end > pos + 1) {
                    tokens.push(createToken("identifier", pos + 1, end - pos - 1)); // Content
                }
                tokens.push(createToken("keyword", end, 1)); // Closing _
                pos = end + 1;
                continue;
            }
        }

        // Links: [text](url) or Images: ![alt](url)
        if (ch === "!" && next === "[") {
            // Image
            const textEnd = line.indexOf("]", pos + 2);
            if (textEnd !== -1 && line[textEnd + 1] === "(") {
                const urlEnd = line.indexOf(")", textEnd + 2);
                if (urlEnd !== -1) {
                    tokens.push(createToken("keyword", pos, 1)); // !
                    tokens.push(createToken("punctuation", pos + 1, 1)); // [
                    if (textEnd > pos + 2) {
                        tokens.push(createToken("string", pos + 2, textEnd - pos - 2)); // alt text
                    }
                    tokens.push(createToken("punctuation", textEnd, 1)); // ]
                    tokens.push(createToken("punctuation", textEnd + 1, 1)); // (
                    if (urlEnd > textEnd + 2) {
                        tokens.push(createToken("constant", textEnd + 2, urlEnd - textEnd - 2)); // url
                    }
                    tokens.push(createToken("punctuation", urlEnd, 1)); // )
                    pos = urlEnd + 1;
                    continue;
                }
            }
        } else if (ch === "[") {
            // Link
            const textEnd = line.indexOf("]", pos + 1);
            if (textEnd !== -1 && line[textEnd + 1] === "(") {
                const urlEnd = line.indexOf(")", textEnd + 2);
                if (urlEnd !== -1) {
                    tokens.push(createToken("punctuation", pos, 1)); // [
                    if (textEnd > pos + 1) {
                        tokens.push(createToken("string", pos + 1, textEnd - pos - 1)); // link text
                    }
                    tokens.push(createToken("punctuation", textEnd, 1)); // ]
                    tokens.push(createToken("punctuation", textEnd + 1, 1)); // (
                    if (urlEnd > textEnd + 2) {
                        tokens.push(createToken("constant", textEnd + 2, urlEnd - textEnd - 2)); // url
                    }
                    tokens.push(createToken("punctuation", urlEnd, 1)); // )
                    pos = urlEnd + 1;
                    continue;
                }
            }
        }

        // Default: treat as identifier
        let end = pos + 1;
        while (end < line.length && !/[`*_~![\]]/.test(line[end])) {
            end++;
        }
        if (end > pos) {
            const text = line.slice(pos, end);
            // Check if it's whitespace
            if (/^\s+$/.test(text)) {
                tokens.push(createToken("whitespace", pos, end - pos));
            } else {
                tokens.push(createToken("identifier", pos, end - pos));
            }
            pos = end;
            continue;
        }

        // Single character that didn't match anything
        tokens.push(createToken("identifier", pos, 1));
        pos++;
    }

    return { pos };
}

export const markdownTokenizer: LineTokenizer = {
    languageId: "markdown",
    initialState: INITIAL_STATE,
    tokenizeLine(line: string, startState: LineState): TokenizeLineResult {
        const tokens: Token[] = [];

        // Handle code block state
        if (startState.kind === "block-comment") {
            const result = tokenizeCodeBlock(line, tokens);
            return { tokens, endState: result.endState };
        }

        // Normal tokenization
        const result = tokenizeNormal(line, 0, tokens);
        return {
            tokens,
            endState: result.newState || INITIAL_STATE,
        };
    },
};

import type { LineTokenizer, LineState, Token, TokenizeLineResult, TokenType } from "../types";

const AT_RULES = new Set([
    "media",
    "import",
    "keyframes",
    "font-face",
    "charset",
    "namespace",
    "supports",
    "page",
    "counter-style",
    "font-feature-values",
    "property",
    "layer",
    "container",
]);

const CSS_FUNCTIONS = new Set([
    "rgb",
    "rgba",
    "hsl",
    "hsla",
    "url",
    "calc",
    "var",
    "linear-gradient",
    "radial-gradient",
    "repeating-linear-gradient",
    "repeating-radial-gradient",
    "translate",
    "translateX",
    "translateY",
    "rotate",
    "scale",
    "skew",
    "matrix",
    "perspective",
    "min",
    "max",
    "clamp",
]);

const PSEUDO_CLASSES = new Set([
    "hover",
    "active",
    "focus",
    "visited",
    "link",
    "first-child",
    "last-child",
    "nth-child",
    "nth-of-type",
    "not",
    "is",
    "where",
    "has",
    "disabled",
    "enabled",
    "checked",
    "root",
    "empty",
    "target",
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

        // Strings
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

        // Hex colors (#hex)
        if (ch === "#" && /[0-9a-fA-F]/.test(next || "")) {
            let end = pos + 1;
            while (end < line.length && /[0-9a-fA-F]/.test(line[end])) end++;
            const hexLength = end - pos - 1;
            // Valid CSS hex colors: 3, 4, 6, or 8 digits
            if (hexLength === 3 || hexLength === 4 || hexLength === 6 || hexLength === 8) {
                tokens.push(createToken("constant", pos, end - pos));
                pos = end;
                continue;
            }
            // Not a valid hex color, treat # as id selector
        }

        // At-rules (@media, @import, etc.)
        if (ch === "@" && /[A-Za-z]/.test(next || "")) {
            let end = pos + 1;
            while (end < line.length && /[A-Za-z-]/.test(line[end])) end++;
            const atRuleName = line.slice(pos + 1, end);
            if (AT_RULES.has(atRuleName)) {
                tokens.push(createToken("keyword", pos, end - pos));
            } else {
                tokens.push(createToken("identifier", pos, end - pos));
            }
            pos = end;
            continue;
        }

        // Numbers with units (10px, 2em, 50%, etc.)
        if (/\d/.test(ch) || (ch === "." && /\d/.test(next || ""))) {
            let end = pos;
            // Parse number part
            while (end < line.length && /[\d.]/.test(line[end])) end++;
            // Parse unit (px, em, %, rem, etc.)
            if (end < line.length && /[A-Za-z%]/.test(line[end])) {
                while (end < line.length && /[A-Za-z%]/.test(line[end])) end++;
            }
            tokens.push(createToken("number", pos, end - pos));
            pos = end;
            continue;
        }

        // ID selector (#id)
        if (ch === "#" && /[A-Za-z_-]/.test(next || "")) {
            let end = pos + 1;
            while (end < line.length && /[A-Za-z0-9_-]/.test(line[end])) end++;
            tokens.push(createToken("constant", pos, end - pos));
            pos = end;
            continue;
        }

        // Class selector (.class)
        if (ch === "." && /[A-Za-z_-]/.test(next || "")) {
            let end = pos + 1;
            while (end < line.length && /[A-Za-z0-9_-]/.test(line[end])) end++;
            tokens.push(createToken("class", pos, end - pos));
            pos = end;
            continue;
        }

        // Pseudo-class (:hover, :nth-child, etc.) or pseudo-element (::before)
        if (ch === ":" && /[A-Za-z:]/.test(next || "")) {
            let end = pos + 1;
            // Check for :: pseudo-element
            if (line[pos + 1] === ":") {
                end++;
            }
            while (end < line.length && /[A-Za-z-]/.test(line[end])) end++;
            const pseudoName = line.slice(pos + 1, end).replace(":", "");
            if (PSEUDO_CLASSES.has(pseudoName)) {
                tokens.push(createToken("keyword", pos, end - pos));
            } else {
                tokens.push(createToken("identifier", pos, end - pos));
            }
            // Handle pseudo-class with parentheses like :nth-child(2)
            if (line[end] === "(") {
                tokens.push(createToken("punctuation", end, 1));
                end++;
                let parenDepth = 1;
                while (end < line.length && parenDepth > 0) {
                    if (line[end] === "(") parenDepth++;
                    if (line[end] === ")") {
                        parenDepth--;
                        if (parenDepth === 0) {
                            tokens.push(createToken("identifier", pos + (end - pos - 1), 1));
                            tokens.push(createToken("punctuation", end, 1));
                            pos = end + 1;
                            continue;
                        }
                    }
                    end++;
                }
            }
            pos = end;
            continue;
        }

        // Attribute selector ([attr])
        if (ch === "[") {
            let end = pos + 1;
            while (end < line.length && line[end] !== "]") end++;
            if (line[end] === "]") {
                end++;
                tokens.push(createToken("attribute", pos, end - pos));
                pos = end;
                continue;
            }
        }

        // Identifiers, functions, properties, values
        if (/[A-Za-z_-]/.test(ch)) {
            let end = pos + 1;
            while (end < line.length && /[A-Za-z0-9_-]/.test(line[end])) end++;
            const text = line.slice(pos, end);

            // Check if followed by opening parenthesis (function)
            if (line[end] === "(") {
                if (CSS_FUNCTIONS.has(text)) {
                    tokens.push(createToken("function", pos, end - pos));
                } else {
                    tokens.push(createToken("function", pos, end - pos));
                }
                pos = end;
                continue;
            }

            // Check if followed by colon (property)
            let afterWhitespace = end;
            while (afterWhitespace < line.length && /\s/.test(line[afterWhitespace])) afterWhitespace++;
            if (line[afterWhitespace] === ":") {
                tokens.push(createToken("property", pos, end - pos));
                pos = end;
                continue;
            }

            // Otherwise, it's a tag selector or identifier
            tokens.push(createToken("tag", pos, end - pos));
            pos = end;
            continue;
        }

        // Operators and special characters
        if (ch === ":" || ch === ";" || ch === "," || ch === "+" || ch === ">" || ch === "~" || ch === "*") {
            tokens.push(createToken("operator", pos, 1));
            pos++;
            continue;
        }

        // Punctuation
        if (/[()[\]{}]/.test(ch)) {
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

export const cssTokenizer: LineTokenizer = {
    languageId: "css",
    initialState: INITIAL_STATE,
    tokenizeLine(line: string, startState: LineState): TokenizeLineResult {
        const tokens: Token[] = [];

        if (startState.kind === "block-comment") {
            const result = tokenizeBlockComment(line, tokens);
            return { tokens, endState: result.endState };
        }

        const result = tokenizeNormal(line, 0, tokens);
        return {
            tokens,
            endState: result.newState || INITIAL_STATE,
        };
    },
};

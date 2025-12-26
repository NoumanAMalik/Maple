import type { SupportedLanguage } from "@/utils/constants";
import { CharacterStream } from "./characterStream";
import { getLanguageRules } from "./languages";
import {
    TokenType,
    type Token,
    type TokenizerResult,
    type TokenizerContext,
    type LanguageRules,
    createInitialContext,
} from "./types";

/**
 * Tokenize source code into tokens for syntax highlighting.
 */
export function tokenize(source: string, language: SupportedLanguage): TokenizerResult {
    const rules = getLanguageRules(language);
    const stream = new CharacterStream(source);
    const context = createInitialContext();
    const tokens: Token[] = [];
    const errors: TokenizerResult["errors"] = [];

    while (!stream.eof()) {
        const token = consumeToken(stream, context, rules);
        if (token) {
            tokens.push(token);
            context.lastToken = token;
        }
    }

    return { tokens, errors };
}

/**
 * Tokenize a single line with given starting context.
 * Returns tokens for that line and the ending context.
 */
export function tokenizeLine(
    lineContent: string,
    lineNumber: number,
    startContext: TokenizerContext,
    language: SupportedLanguage,
): { tokens: Token[]; endContext: TokenizerContext } {
    const rules = getLanguageRules(language);
    const stream = new CharacterStream(lineContent);
    const context = { ...startContext, lastToken: startContext.lastToken };
    const tokens: Token[] = [];

    while (!stream.eof()) {
        const token = consumeToken(stream, context, rules, lineNumber);
        if (token) {
            tokens.push(token);
            context.lastToken = token;
        }
    }

    return { tokens, endContext: context };
}

/**
 * Consume the next token from the stream.
 */
function consumeToken(
    stream: CharacterStream,
    context: TokenizerContext,
    rules: LanguageRules,
    lineOffset = 0,
): Token | null {
    const startPos = stream.position;
    const startLine = stream.line + lineOffset;
    const startCol = stream.column;

    // Handle continuation of multi-line states
    if (context.state === "comment-multi") {
        return consumeMultiLineComment(stream, context, rules, startLine, startCol, startPos);
    }

    if (context.state === "string-template") {
        return consumeTemplateLiteral(stream, context, rules, startLine, startCol, startPos);
    }

    const char = stream.current();
    if (!char) return null;

    // 1. Whitespace
    if (CharacterStream.isWhitespace(char)) {
        return consumeWhitespace(stream, startLine, startCol, startPos);
    }

    // 2. Comments
    if (rules.lineComment && stream.match(rules.lineComment, false)) {
        return consumeLineComment(stream, rules, startLine, startCol, startPos);
    }

    if (rules.blockCommentStart && stream.match(rules.blockCommentStart, false)) {
        return consumeBlockComment(stream, context, rules, startLine, startCol, startPos);
    }

    // 3. Strings
    if (rules.stringDelimiters.includes(char)) {
        if (char === "`") {
            return consumeTemplateLiteral(stream, context, rules, startLine, startCol, startPos);
        }
        return consumeString(stream, context, rules, startLine, startCol, startPos, char);
    }

    // 4. Numbers
    if (CharacterStream.isDigit(char) || (char === "." && CharacterStream.isDigit(stream.peek(1)))) {
        return consumeNumber(stream, startLine, startCol, startPos);
    }

    // 5. Identifiers and keywords
    if (rules.identifierStart.test(char)) {
        return consumeIdentifier(stream, context, rules, startLine, startCol, startPos);
    }

    // 6. Operators (longest match first)
    for (const op of rules.operators) {
        if (stream.match(op, false)) {
            stream.match(op, true);
            return createToken(TokenType.Operator, op, startPos, stream.position, startLine, startCol);
        }
    }

    // 7. Punctuation
    if (rules.punctuation.has(char)) {
        stream.next();
        // Track bracket depth for template expressions
        if (char === "{") {
            context.bracketDepth++;
        } else if (char === "}") {
            context.bracketDepth--;
            // Check if we're closing a template expression
            if (context.bracketDepth === 0 && context.stack.length > 0) {
                const prevState = context.stack.pop();
                if (prevState === "string-template") {
                    context.state = "string-template";
                }
            }
        }
        return createToken(TokenType.Punctuation, char, startPos, stream.position, startLine, startCol);
    }

    // 8. Unknown character
    stream.next();
    return createToken(TokenType.Unknown, char, startPos, stream.position, startLine, startCol);
}

/**
 * Consume whitespace characters.
 */
function consumeWhitespace(stream: CharacterStream, startLine: number, startCol: number, startPos: number): Token {
    let value = "";
    while (CharacterStream.isWhitespace(stream.current())) {
        value += stream.next();
    }
    return createToken(TokenType.Whitespace, value, startPos, stream.position, startLine, startCol);
}

/**
 * Consume a single-line comment.
 */
function consumeLineComment(
    stream: CharacterStream,
    rules: LanguageRules,
    startLine: number,
    startCol: number,
    startPos: number,
): Token {
    let value = stream.match(rules.lineComment!, true) ?? "";
    // Consume until end of line
    while (!stream.eol() && !stream.eof()) {
        value += stream.next();
    }
    return createToken(TokenType.Comment, value, startPos, stream.position, startLine, startCol);
}

/**
 * Consume a block comment (may be multi-line).
 */
function consumeBlockComment(
    stream: CharacterStream,
    context: TokenizerContext,
    rules: LanguageRules,
    startLine: number,
    startCol: number,
    startPos: number,
): Token {
    let value = stream.match(rules.blockCommentStart!, true) ?? "";

    while (!stream.eof()) {
        if (stream.match(rules.blockCommentEnd!, false)) {
            value += stream.match(rules.blockCommentEnd!, true);
            context.state = "normal";
            return createToken(TokenType.Comment, value, startPos, stream.position, startLine, startCol);
        }
        value += stream.next();
    }

    // Comment extends past end of input (or line for line-by-line tokenization)
    context.state = "comment-multi";
    return createToken(TokenType.Comment, value, startPos, stream.position, startLine, startCol);
}

/**
 * Continue consuming a multi-line comment.
 */
function consumeMultiLineComment(
    stream: CharacterStream,
    context: TokenizerContext,
    rules: LanguageRules,
    startLine: number,
    startCol: number,
    startPos: number,
): Token {
    let value = "";

    while (!stream.eof()) {
        if (stream.match(rules.blockCommentEnd!, false)) {
            value += stream.match(rules.blockCommentEnd!, true);
            context.state = "normal";
            return createToken(TokenType.Comment, value, startPos, stream.position, startLine, startCol);
        }
        value += stream.next();
    }

    // Still in comment
    return createToken(TokenType.Comment, value, startPos, stream.position, startLine, startCol);
}

/**
 * Consume a regular string (single or double quoted).
 */
function consumeString(
    stream: CharacterStream,
    _context: TokenizerContext,
    rules: LanguageRules,
    startLine: number,
    startCol: number,
    startPos: number,
    delimiter: string,
): Token {
    let value = stream.next(); // Opening quote

    while (!stream.eof() && !stream.eol()) {
        const char = stream.current();

        // Escape sequence
        if (char === rules.escapeChar) {
            value += stream.next(); // backslash
            if (!stream.eof() && !stream.eol()) {
                value += stream.next(); // escaped character
            }
            continue;
        }

        // Closing quote
        if (char === delimiter) {
            value += stream.next();
            return createToken(TokenType.String, value, startPos, stream.position, startLine, startCol);
        }

        value += stream.next();
    }

    // Unterminated string (still return what we have)
    return createToken(TokenType.String, value, startPos, stream.position, startLine, startCol);
}

/**
 * Consume a template literal (backtick string with ${} expressions).
 */
function consumeTemplateLiteral(
    stream: CharacterStream,
    context: TokenizerContext,
    rules: LanguageRules,
    startLine: number,
    startCol: number,
    startPos: number,
): Token {
    let value = "";

    // If starting fresh, consume the backtick
    if (context.state !== "string-template") {
        value = stream.next(); // Opening backtick
        context.state = "string-template";
    }

    while (!stream.eof()) {
        const char = stream.current();

        // Escape sequence
        if (char === rules.escapeChar) {
            value += stream.next();
            if (!stream.eof()) {
                value += stream.next();
            }
            continue;
        }

        // Template expression start
        if (char === "$" && stream.peek(1) === "{") {
            // Return the string part we have so far
            if (value.length > 0) {
                return createToken(TokenType.String, value, startPos, stream.position, startLine, startCol);
            }
            // Consume ${ as punctuation
            stream.next(); // $
            stream.next(); // {
            context.stack.push("string-template");
            context.state = "normal";
            context.bracketDepth = 1;
            return createToken(TokenType.Punctuation, "${", startPos, stream.position, startLine, startCol);
        }

        // Closing backtick
        if (char === "`") {
            value += stream.next();
            context.state = "normal";
            return createToken(TokenType.String, value, startPos, stream.position, startLine, startCol);
        }

        value += stream.next();
    }

    // Template continues past this input
    return createToken(TokenType.String, value, startPos, stream.position, startLine, startCol);
}

/**
 * Consume a number literal.
 */
function consumeNumber(stream: CharacterStream, startLine: number, startCol: number, startPos: number): Token {
    let value = "";

    // Check for hex, binary, or octal prefix
    if (stream.current() === "0") {
        const nextChar = stream.peek(1).toLowerCase();
        if (nextChar === "x") {
            // Hexadecimal
            value += stream.next() + stream.next(); // 0x
            while (CharacterStream.isHexDigit(stream.current()) || stream.current() === "_") {
                value += stream.next();
            }
            return createToken(TokenType.Number, value, startPos, stream.position, startLine, startCol);
        }
        if (nextChar === "b") {
            // Binary
            value += stream.next() + stream.next(); // 0b
            while (stream.current() === "0" || stream.current() === "1" || stream.current() === "_") {
                value += stream.next();
            }
            return createToken(TokenType.Number, value, startPos, stream.position, startLine, startCol);
        }
        if (nextChar === "o") {
            // Octal
            value += stream.next() + stream.next(); // 0o
            while ((stream.current() >= "0" && stream.current() <= "7") || stream.current() === "_") {
                value += stream.next();
            }
            return createToken(TokenType.Number, value, startPos, stream.position, startLine, startCol);
        }
    }

    // Regular decimal number
    let hasDecimal = false;
    let hasExponent = false;

    while (!stream.eof()) {
        const char = stream.current();

        if (CharacterStream.isDigit(char) || char === "_") {
            value += stream.next();
        } else if (char === "." && !hasDecimal && !hasExponent) {
            // Check it's not a range operator (..) or method call
            if (!CharacterStream.isDigit(stream.peek(1))) {
                break;
            }
            hasDecimal = true;
            value += stream.next();
        } else if ((char === "e" || char === "E") && !hasExponent) {
            hasExponent = true;
            value += stream.next();
            // Optional sign after exponent
            if (stream.current() === "+" || stream.current() === "-") {
                value += stream.next();
            }
        } else if (char === "n" && !hasDecimal && !hasExponent) {
            // BigInt suffix
            value += stream.next();
            break;
        } else {
            break;
        }
    }

    return createToken(TokenType.Number, value, startPos, stream.position, startLine, startCol);
}

/**
 * Consume an identifier and classify it.
 */
function consumeIdentifier(
    stream: CharacterStream,
    context: TokenizerContext,
    rules: LanguageRules,
    startLine: number,
    startCol: number,
    startPos: number,
): Token {
    let value = stream.next();

    while (rules.identifierPart.test(stream.current())) {
        value += stream.next();
    }

    // Classify the identifier
    const type = classifyIdentifier(value, stream, context, rules);

    return createToken(type, value, startPos, stream.position, startLine, startCol);
}

/**
 * Classify an identifier as keyword, constant, function, class, or variable.
 */
function classifyIdentifier(
    value: string,
    stream: CharacterStream,
    context: TokenizerContext,
    rules: LanguageRules,
): TokenType {
    // Check for keywords
    if (rules.keywords.has(value)) {
        return TokenType.Keyword;
    }

    // Check for constants
    if (rules.constants.has(value)) {
        return TokenType.Constant;
    }

    // Check for built-in types/classes
    if (rules.builtins.has(value)) {
        return TokenType.Class;
    }

    // Look ahead to determine if it's a function call
    // Skip whitespace and check for (
    const marker = stream.mark();
    stream.skipSpaces();
    const nextChar = stream.current();
    stream.reset(marker);

    if (nextChar === "(") {
        return TokenType.Function;
    }

    // Check if preceded by 'class', 'interface', 'type', 'enum' keyword
    if (context.lastToken?.type === TokenType.Keyword) {
        const kw = context.lastToken.value;
        if (kw === "class" || kw === "interface" || kw === "type" || kw === "enum") {
            return TokenType.Class;
        }
        if (kw === "function") {
            return TokenType.Function;
        }
    }

    // Check for property access (preceded by .)
    if (context.lastToken?.type === TokenType.Operator && context.lastToken.value === ".") {
        return TokenType.Property;
    }

    // Default to identifier
    return TokenType.Identifier;
}

/**
 * Create a token with the given properties.
 */
function createToken(type: TokenType, value: string, start: number, end: number, line: number, column: number): Token {
    return { type, value, start, end, line, column };
}

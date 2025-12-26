export enum TokenType {
    Keyword = "keyword",
    String = "string",
    Number = "number",
    Comment = "comment",
    Operator = "operator",
    Punctuation = "punctuation",
    Identifier = "identifier",
    Function = "function",
    Variable = "variable",
    Class = "class",
    Constant = "constant",
    Parameter = "parameter",
    Property = "property",
    Tag = "tag",
    Attribute = "attribute",
    Regex = "regex",
    Whitespace = "whitespace",
    Unknown = "unknown",
}

export interface Token {
    type: TokenType;
    value: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

export interface TokenizerResult {
    tokens: Token[];
    errors: TokenizerError[];
}

export interface TokenizerError {
    message: string;
    line: number;
    column: number;
}

export type TokenizerState =
    | "normal"
    | "string-single"
    | "string-double"
    | "string-template"
    | "string-template-expr"
    | "comment-single"
    | "comment-multi"
    | "number"
    | "identifier";

/**
 * Context for tracking tokenizer state during parsing.
 * Supports nested states like template literal expressions.
 */
export interface TokenizerContext {
    /** Current tokenizer state */
    state: TokenizerState;
    /** Stack for nested states (e.g., template literal expressions) */
    stack: TokenizerState[];
    /** Track {} depth for template expressions */
    bracketDepth: number;
    /** Current string delimiter character */
    stringDelimiter: string;
    /** Last emitted token (for regex vs division detection) */
    lastToken: Token | null;
}

/**
 * Language-specific tokenization rules.
 */
export interface LanguageRules {
    /** Language identifier */
    name: string;
    /** Set of language keywords */
    keywords: Set<string>;
    /** Operators sorted by length (longest first) */
    operators: string[];
    /** Single-character punctuation */
    punctuation: Set<string>;
    /** Built-in constants (true, false, null, etc.) */
    constants: Set<string>;
    /** Built-in types and classes */
    builtins: Set<string>;
    /** Single-line comment start (e.g., "//") */
    lineComment?: string;
    /** Block comment start (e.g., "/*") */
    blockCommentStart?: string;
    /** Block comment end (e.g., "/*") */
    blockCommentEnd?: string;
    /** String delimiter characters */
    stringDelimiters: string[];
    /** Escape character (usually "\\") */
    escapeChar: string;
    /** Regex for valid identifier start character */
    identifierStart: RegExp;
    /** Regex for valid identifier continuation character */
    identifierPart: RegExp;
}

/**
 * Create initial tokenizer context.
 */
export function createInitialContext(): TokenizerContext {
    return {
        state: "normal",
        stack: [],
        bracketDepth: 0,
        stringDelimiter: "",
        lastToken: null,
    };
}

/**
 * Clone a tokenizer context for caching.
 */
export function cloneContext(context: TokenizerContext): TokenizerContext {
    return {
        state: context.state,
        stack: [...context.stack],
        bracketDepth: context.bracketDepth,
        stringDelimiter: context.stringDelimiter,
        lastToken: context.lastToken ? { ...context.lastToken } : null,
    };
}

/**
 * Check if two contexts are equal (for cache invalidation).
 */
export function contextsEqual(a: TokenizerContext, b: TokenizerContext): boolean {
    return (
        a.state === b.state &&
        a.bracketDepth === b.bracketDepth &&
        a.stringDelimiter === b.stringDelimiter &&
        a.stack.length === b.stack.length &&
        a.stack.every((s, i) => s === b.stack[i])
    );
}

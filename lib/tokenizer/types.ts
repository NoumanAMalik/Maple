// Language support
export type LanguageId = "javascript" | "typescript" | "plaintext";

// Token categories
export type TokenType =
    | "keyword"
    | "string"
    | "number"
    | "comment"
    | "identifier"
    | "function"
    | "variable"
    | "class"
    | "type"
    | "operator"
    | "punctuation"
    | "property"
    | "parameter"
    | "tag"
    | "attribute"
    | "regex"
    | "constant"
    | "whitespace"
    | "unknown";

// Single token on a single line
export interface Token {
    type: TokenType;
    start: number; // column, 0-based
    length: number;
}

// Multi-line state machine
export type LineStateKind = "normal" | "block-comment" | "template-string";

export interface LineState {
    kind: LineStateKind;
    templateExpressionDepth: number;
}

// Result of tokenizing a single line with state
export interface TokenizeLineResult {
    tokens: Token[];
    endState: LineState;
}

// Tokenizer interface for language plugins
export interface LineTokenizer {
    languageId: LanguageId;
    initialState: LineState;
    tokenizeLine(line: string, startState: LineState): TokenizeLineResult;
}

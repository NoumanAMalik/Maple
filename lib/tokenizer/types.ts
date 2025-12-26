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
    | "comment-single"
    | "comment-multi"
    | "number"
    | "identifier";

import type { TokenType } from "./types";

const TOKEN_COLORS: Record<TokenType, string | undefined> = {
    keyword: "var(--syntax-keyword)",
    string: "var(--syntax-string)",
    number: "var(--syntax-number)",
    comment: "var(--syntax-comment)",
    function: "var(--syntax-function)",
    variable: "var(--syntax-variable)",
    class: "var(--syntax-class)",
    type: "var(--syntax-type)",
    operator: "var(--syntax-operator)",
    punctuation: "var(--syntax-punctuation)",
    property: "var(--syntax-property)",
    parameter: "var(--syntax-parameter)",
    tag: "var(--syntax-tag)",
    attribute: "var(--syntax-attribute)",
    regex: "var(--syntax-regex)",
    constant: "var(--syntax-constant)",
    identifier: "var(--editor-fg)",
    whitespace: undefined,
    unknown: undefined,
};

export function getTokenColor(type: TokenType): string | undefined {
    return TOKEN_COLORS[type];
}

import { TokenType } from "@/lib/tokenizer/types";

/**
 * Map token types to Tailwind CSS classes.
 * Uses CSS custom properties from the Bearded Theme Black & Gold.
 */
export const tokenTypeToClass: Record<TokenType, string> = {
    [TokenType.Keyword]: "text-[var(--syntax-keyword)]", // #11B7D4 blue
    [TokenType.String]: "text-[var(--syntax-string)]", // #c62f52 salmon
    [TokenType.Number]: "text-[var(--syntax-number)]", // #38c7bd turquoise
    [TokenType.Comment]: "text-[var(--syntax-comment)]", // #00a884 green
    [TokenType.Operator]: "text-[var(--syntax-operator)]", // #e3e3e3
    [TokenType.Punctuation]: "text-[var(--syntax-punctuation)]", // #e3e3e3
    [TokenType.Identifier]: "text-[var(--editor-fg)]", // #e3e3e3
    [TokenType.Function]: "text-[var(--syntax-function)]", // #c7910c gold
    [TokenType.Variable]: "text-[var(--syntax-variable)]", // #d46ec0 pink
    [TokenType.Class]: "text-[var(--syntax-class)]", // #a85ff1 purple
    [TokenType.Constant]: "text-[var(--syntax-constant)]", // #d4770c orange
    [TokenType.Parameter]: "text-[var(--syntax-parameter)]", // #d46ec0 pink
    [TokenType.Property]: "text-[var(--syntax-property)]", // #d46ec0 pink
    [TokenType.Tag]: "text-[var(--syntax-tag)]", // #11B7D4 blue
    [TokenType.Attribute]: "text-[var(--syntax-attribute)]", // #d46ec0 pink
    [TokenType.Regex]: "text-[var(--syntax-regex)]", // #E35535 red
    [TokenType.Whitespace]: "", // No styling for whitespace
    [TokenType.Unknown]: "text-[var(--editor-fg)]", // Default foreground
};

/**
 * Get the CSS class for a token type.
 */
export function getTokenClass(type: TokenType): string {
    return tokenTypeToClass[type] ?? "";
}

/**
 * Check if a token type should be rendered (not pure whitespace).
 */
export function shouldRenderToken(type: TokenType): boolean {
    return type !== TokenType.Whitespace;
}

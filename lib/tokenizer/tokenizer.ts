import type { SupportedLanguage } from "@/utils/constants";
import type { Token, TokenizerResult } from "./types";

/**
 * Tokenize source code into tokens for syntax highlighting.
 * This is a placeholder implementation - the full state machine tokenizer
 * will be implemented in the next phase.
 */
export function tokenize(source: string, _language: SupportedLanguage): TokenizerResult {
    // Placeholder: return the entire source as a single token
    const tokens: Token[] = [
        {
            type: "identifier" as any,
            value: source,
            start: 0,
            end: source.length,
            line: 1,
            column: 1,
        },
    ];

    return {
        tokens,
        errors: [],
    };
}

import type { LanguageRules } from "../types";
import { typescriptRules, javascriptRules } from "./typescript";

/**
 * Registry of all supported language rules.
 */
const languageRegistry: Map<string, LanguageRules> = new Map([
    ["typescript", typescriptRules],
    ["javascript", javascriptRules],
]);

/**
 * Get language rules by name.
 * Falls back to TypeScript rules if language not found.
 */
export function getLanguageRules(language: string): LanguageRules {
    return languageRegistry.get(language) ?? typescriptRules;
}

/**
 * Check if a language is supported.
 */
export function isLanguageSupported(language: string): boolean {
    return languageRegistry.has(language);
}

/**
 * Get list of all supported languages.
 */
export function getSupportedLanguages(): string[] {
    return Array.from(languageRegistry.keys());
}

export { typescriptRules, javascriptRules };

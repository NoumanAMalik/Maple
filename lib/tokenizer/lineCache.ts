import type { SupportedLanguage } from "@/utils/constants";
import { tokenizeLine } from "./tokenizer";
import { type Token, type TokenizerContext, createInitialContext, cloneContext, contextsEqual } from "./types";

/**
 * Cached tokenization result for a single line.
 */
export interface LineCacheEntry {
    /** Original line content */
    content: string;
    /** Tokens for this line */
    tokens: Token[];
    /** Context at start of line */
    startContext: TokenizerContext;
    /** Context at end of line */
    endContext: TokenizerContext;
}

/**
 * Line-level token cache for incremental tokenization.
 * Only re-tokenizes lines that changed or whose starting context changed.
 */
export class LineCache {
    private cache: Map<number, LineCacheEntry> = new Map();
    private language: SupportedLanguage;
    private previousContent = "";

    constructor(language: SupportedLanguage) {
        this.language = language;
    }

    /**
     * Set the language for tokenization.
     * Clears the cache if language changes.
     */
    setLanguage(language: SupportedLanguage): void {
        if (language !== this.language) {
            this.language = language;
            this.cache.clear();
            this.previousContent = "";
        }
    }

    /**
     * Tokenize content incrementally.
     * Only re-tokenizes lines that changed or whose context changed.
     */
    tokenize(content: string): Token[] {
        const lines = content.split("\n");
        const changedLines = this.detectChangedLines(this.previousContent, content);
        const allTokens: Token[] = [];

        let currentContext = createInitialContext();

        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];
            const cached = this.cache.get(i);

            // Check if we can reuse cached tokens
            const canReuse =
                cached &&
                !changedLines.has(i) &&
                cached.content === lineContent &&
                contextsEqual(cached.startContext, currentContext);

            if (canReuse) {
                // Reuse cached tokens (adjust line numbers)
                const adjustedTokens = cached.tokens.map((token) => ({
                    ...token,
                    line: i + 1, // 1-indexed line numbers
                }));
                allTokens.push(...adjustedTokens);
                currentContext = cloneContext(cached.endContext);
            } else {
                // Re-tokenize this line
                const startContext = cloneContext(currentContext);
                const result = tokenizeLine(lineContent, i + 1, currentContext, this.language);

                allTokens.push(...result.tokens);
                currentContext = result.endContext;

                // Update cache
                this.cache.set(i, {
                    content: lineContent,
                    tokens: result.tokens,
                    startContext,
                    endContext: cloneContext(currentContext),
                });

                // If end context changed, invalidate subsequent cached lines
                const prevCached = this.cache.get(i);
                if (prevCached && !contextsEqual(prevCached.endContext, currentContext)) {
                    this.invalidateFrom(i + 1);
                }
            }
        }

        // Clean up cache for removed lines
        this.pruneCache(lines.length);
        this.previousContent = content;

        return allTokens;
    }

    /**
     * Detect which lines changed between old and new content.
     */
    private detectChangedLines(oldContent: string, newContent: string): Set<number> {
        const changedLines = new Set<number>();

        // Quick check: if content identical, no changes
        if (oldContent === newContent) {
            return changedLines;
        }

        const oldLines = oldContent.split("\n");
        const newLines = newContent.split("\n");

        // Find first differing line from start
        let startDiff = 0;
        while (
            startDiff < oldLines.length &&
            startDiff < newLines.length &&
            oldLines[startDiff] === newLines[startDiff]
        ) {
            startDiff++;
        }

        // Find first differing line from end
        let oldEndDiff = oldLines.length - 1;
        let newEndDiff = newLines.length - 1;
        while (oldEndDiff > startDiff && newEndDiff > startDiff && oldLines[oldEndDiff] === newLines[newEndDiff]) {
            oldEndDiff--;
            newEndDiff--;
        }

        // Mark all lines in the changed region
        for (let i = startDiff; i <= newEndDiff; i++) {
            changedLines.add(i);
        }

        return changedLines;
    }

    /**
     * Invalidate all cached entries from a given line onwards.
     */
    private invalidateFrom(lineNumber: number): void {
        for (const key of this.cache.keys()) {
            if (key >= lineNumber) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Remove cache entries for lines that no longer exist.
     */
    private pruneCache(lineCount: number): void {
        for (const key of this.cache.keys()) {
            if (key >= lineCount) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cached entries.
     */
    clear(): void {
        this.cache.clear();
        this.previousContent = "";
    }

    /**
     * Get cache statistics for debugging.
     */
    getStats(): { cachedLines: number; language: string } {
        return {
            cachedLines: this.cache.size,
            language: this.language,
        };
    }
}

/**
 * Create a new line cache for the given language.
 */
export function createLineCache(language: SupportedLanguage): LineCache {
    return new LineCache(language);
}

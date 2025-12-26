"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineCache } from "@/lib/tokenizer/lineCache";
import { createHighlightedLines, type HighlightedLine } from "@/lib/highlighting";
import type { Token, TokenizerError } from "@/lib/tokenizer/types";
import type { SupportedLanguage } from "@/utils/constants";
import { EDITOR_CONSTANTS } from "@/utils/constants";

interface UseTokenizerOptions {
    /** Content to tokenize */
    content: string;
    /** Language for syntax highlighting */
    language: SupportedLanguage;
    /** Debounce delay in milliseconds (default: 300ms) */
    debounceMs?: number;
    /** Whether tokenization is enabled */
    enabled?: boolean;
}

interface UseTokenizerReturn {
    /** Tokenized tokens */
    tokens: Token[];
    /** Highlighted lines ready for rendering */
    highlightedLines: HighlightedLine[];
    /** Whether tokenization is in progress */
    isTokenizing: boolean;
    /** Any tokenization errors */
    errors: TokenizerError[];
    /** Force a complete re-tokenization */
    forceRetokenize: () => void;
}

/**
 * Hook for debounced, incremental tokenization with caching.
 */
export function useTokenizer(options: UseTokenizerOptions): UseTokenizerReturn {
    const { content, language, debounceMs = EDITOR_CONSTANTS.TOKENIZE_DEBOUNCE, enabled = true } = options;

    const [tokens, setTokens] = useState<Token[]>([]);
    const [isTokenizing, setIsTokenizing] = useState(false);
    const [errors, setErrors] = useState<TokenizerError[]>([]);

    // Line cache for incremental tokenization
    const cacheRef = useRef<LineCache | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialTokenizationDone = useRef(false);

    // Initialize cache
    useEffect(() => {
        cacheRef.current = new LineCache(language);
        initialTokenizationDone.current = false;
    }, [language]);

    // Perform tokenization
    const performTokenization = useCallback(() => {
        if (!enabled || !cacheRef.current) return;

        setIsTokenizing(true);

        // Use requestIdleCallback for non-blocking tokenization if available
        const doTokenize = () => {
            try {
                cacheRef.current!.setLanguage(language);
                const newTokens = cacheRef.current!.tokenize(content);
                setTokens(newTokens);
                setErrors([]);
            } catch (error) {
                console.error("Tokenization error:", error);
                setErrors([
                    {
                        message: error instanceof Error ? error.message : String(error),
                        line: 0,
                        column: 0,
                    },
                ]);
            } finally {
                setIsTokenizing(false);
            }
        };

        if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(doTokenize, { timeout: 100 });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(doTokenize, 0);
        }
    }, [content, language, enabled]);

    // Debounced tokenization on content change
    useEffect(() => {
        if (!enabled) return;

        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Immediate tokenization for first render
        if (!initialTokenizationDone.current) {
            performTokenization();
            initialTokenizationDone.current = true;
            return;
        }

        // Debounced tokenization for subsequent changes
        debounceTimerRef.current = setTimeout(() => {
            performTokenization();
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, debounceMs, enabled, performTokenization]);

    // Force complete re-tokenization
    const forceRetokenize = useCallback(() => {
        if (cacheRef.current) {
            cacheRef.current.clear();
        }
        initialTokenizationDone.current = false;
        performTokenization();
    }, [performTokenization]);

    // Compute line count directly during render (no lag from useEffect)
    const actualLineCount = useMemo(
        () => (content ? content.split("\n").length : 1),
        [content],
    );

    // Memoized highlighted lines with optimistic line count
    const highlightedLines = useMemo(() => {
        return createHighlightedLines(tokens, actualLineCount);
    }, [tokens, actualLineCount]);

    return {
        tokens,
        highlightedLines,
        isTokenizing,
        errors,
        forceRetokenize,
    };
}

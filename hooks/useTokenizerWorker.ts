"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createHighlightedLines, type HighlightedLine } from "@/lib/highlighting";
import type { Token, TokenizerError } from "@/lib/tokenizer/types";
import type { SupportedLanguage } from "@/utils/constants";
import { EDITOR_CONSTANTS } from "@/utils/constants";

interface UseTokenizerWorkerOptions {
    /** Content to tokenize */
    content: string;
    /** Language for syntax highlighting */
    language: SupportedLanguage;
    /** Debounce delay in milliseconds (default: 16ms for ~60fps) */
    debounceMs?: number;
    /** Whether tokenization is enabled */
    enabled?: boolean;
}

interface UseTokenizerWorkerReturn {
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

interface WorkerMessage {
    type: "tokens" | "ready";
    id?: number;
    tokens?: Token[];
    errors?: TokenizerError[];
}

/**
 * Hook for Web Worker-based tokenization.
 * Tokenization runs in a background thread for non-blocking performance.
 */
export function useTokenizerWorker(options: UseTokenizerWorkerOptions): UseTokenizerWorkerReturn {
    const { content, language, debounceMs = EDITOR_CONSTANTS.TOKENIZE_DEBOUNCE, enabled = true } = options;

    const [tokens, setTokens] = useState<Token[]>([]);
    const [isTokenizing, setIsTokenizing] = useState(false);
    const [errors, setErrors] = useState<TokenizerError[]>([]);
    const [actualLineCount, setActualLineCount] = useState(1);

    // Refs for worker management
    const workerRef = useRef<Worker | null>(null);
    const messageIdRef = useRef(0);
    const pendingIdRef = useRef<number | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize worker
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Create worker using Next.js compatible URL pattern
        const worker = new Worker(new URL("../lib/tokenizer/tokenizer.worker.ts", import.meta.url));

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const message = event.data;

            if (message.type === "ready") {
                isInitializedRef.current = true;
                return;
            }

            if (message.type === "tokens" && message.id !== undefined) {
                // Only process if this is the most recent request
                if (message.id === pendingIdRef.current) {
                    setTokens(message.tokens ?? []);
                    setErrors(message.errors ?? []);
                    setIsTokenizing(false);
                    pendingIdRef.current = null;
                }
            }
        };

        worker.onerror = (error) => {
            console.error("Tokenizer worker error:", error);
            setErrors([{ message: "Worker error: " + error.message, line: 0, column: 0 }]);
            setIsTokenizing(false);
        };

        workerRef.current = worker;

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    // Send tokenization request to worker
    const sendTokenizeRequest = useCallback(() => {
        if (!workerRef.current || !enabled) return;

        const id = ++messageIdRef.current;
        pendingIdRef.current = id;
        setIsTokenizing(true);

        workerRef.current.postMessage({
            type: "tokenize",
            id,
            content,
            language,
        });
    }, [content, language, enabled]);

    // Debounced tokenization on content/language change
    useEffect(() => {
        if (!enabled) return;

        // Clear previous timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Immediate tokenization for first render
        if (!isInitializedRef.current || tokens.length === 0) {
            // Small delay to ensure worker is ready
            debounceTimerRef.current = setTimeout(() => {
                sendTokenizeRequest();
            }, 10);
            return;
        }

        // Debounced tokenization for subsequent changes
        debounceTimerRef.current = setTimeout(() => {
            sendTokenizeRequest();
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [content, language, debounceMs, enabled, sendTokenizeRequest, tokens.length]);

    // Force complete re-tokenization
    const forceRetokenize = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: "clear" });
        }
        sendTokenizeRequest();
    }, [sendTokenizeRequest]);

    // Memoized highlighted lines
    const highlightedLines = useMemo(() => {
        return createHighlightedLines(tokens);
    }, [tokens]);

    return {
        tokens,
        highlightedLines,
        isTokenizing,
        errors,
        forceRetokenize,
    };
}

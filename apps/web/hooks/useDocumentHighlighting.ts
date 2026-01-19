"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { LanguageId, Token } from "@/lib/tokenizer/types";
import type { LineHighlight, DocumentHighlightState } from "@/lib/tokenizer/documentState";
import {
    createDocumentHighlightState,
    updateDocumentHighlightState,
    getLineTokens,
} from "@/lib/tokenizer/documentState";
import { TokenizerWorkerManager, type SerializableLineHighlight } from "@/lib/tokenizer/worker";

interface UseDocumentHighlightingOptions {
    language: LanguageId;
    getLine: (lineNumber: number) => string;
    getLineCount: () => number;
    version: number;
    getEditMetadata: () => { changedFromLine: number; version: number } | null;
    clearEditMetadata: () => void;
}

interface DocumentHighlightingAPI {
    getTokens: (lineNumber: number) => Token[];
    isReady: boolean;
}

const WORKER_THRESHOLD = 1000;

export function useDocumentHighlighting(options: UseDocumentHighlightingOptions): DocumentHighlightingAPI {
    const { language, getLine, getLineCount, version, getEditMetadata, clearEditMetadata } = options;

    const highlightStateRef = useRef<DocumentHighlightState | null>(null);
    const lastVersionRef = useRef<number>(-1);
    const lastLanguageRef = useRef<LanguageId | null>(null);
    const workerManagerRef = useRef<TokenizerWorkerManager | null>(null);
    const usingWorkerRef = useRef<boolean>(false);
    
    // State to trigger re-renders when worker responds
    const [workerVersion, setWorkerVersion] = useState(0);

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            workerManagerRef.current?.dispose();
            workerManagerRef.current = null;
        };
    }, []);

    // Initialize or update highlight state
    useEffect(() => {
        const lineCount = getLineCount();
        const shouldUseWorker = lineCount > WORKER_THRESHOLD && typeof Worker !== "undefined";

        // Check if we need to switch between worker/main thread modes
        const wasUsingWorker = usingWorkerRef.current;
        if (wasUsingWorker !== shouldUseWorker) {
            // Mode change - dispose worker if switching away
            if (wasUsingWorker && !shouldUseWorker) {
                workerManagerRef.current?.dispose();
                workerManagerRef.current = null;
            }
            usingWorkerRef.current = shouldUseWorker;
        }

        // Language changed or first initialization
        const isLanguageChange = lastLanguageRef.current !== language;
        const isFirstInit = highlightStateRef.current === null;

        if (isLanguageChange || isFirstInit) {
            if (shouldUseWorker) {
                // Use worker for large files
                if (!workerManagerRef.current) {
                    workerManagerRef.current = new TokenizerWorkerManager({
                        onTokensReady: (respVersion, changedFromLine, lines) => {
                            // Apply tokens from worker
                            applyWorkerTokens(respVersion, changedFromLine, lines);
                            setWorkerVersion(v => v + 1);
                        },
                        onError: (error) => {
                            console.error("Tokenizer worker error:", error);
                            // Fallback to main thread on error
                            usingWorkerRef.current = false;
                            highlightStateRef.current = createDocumentHighlightState(
                                language,
                                getLine,
                                lineCount,
                                version
                            );
                            setWorkerVersion(v => v + 1);
                        },
                    });
                }

                // Collect all lines for init
                const allLines: string[] = [];
                for (let i = 1; i <= lineCount; i++) {
                    allLines.push(getLine(i));
                }

                workerManagerRef.current.init(language, allLines, version);
                
                // Initialize with empty state, will be filled by worker
                highlightStateRef.current = {
                    language,
                    lines: [],
                    version: -1,
                };
            } else {
                // Use main thread for small files
                highlightStateRef.current = createDocumentHighlightState(
                    language,
                    getLine,
                    lineCount,
                    version
                );
            }

            lastLanguageRef.current = language;
            lastVersionRef.current = version;
            clearEditMetadata();
            return;
        }

        // Version changed - incremental update
        if (lastVersionRef.current !== version) {
            const editMetadata = getEditMetadata();
            const changedFromLine = editMetadata?.changedFromLine ?? 1;

            if (shouldUseWorker && workerManagerRef.current) {
                // Collect lines from changed line to end
                const linesFromChanged: string[] = [];
                for (let i = changedFromLine; i <= lineCount; i++) {
                    linesFromChanged.push(getLine(i));
                }

                workerManagerRef.current.update(
                    language,
                    changedFromLine,
                    linesFromChanged,
                    lineCount,
                    version
                );
            } else {
                // Main thread incremental update
                highlightStateRef.current = updateDocumentHighlightState(
                    highlightStateRef.current!,
                    getLine,
                    lineCount,
                    changedFromLine,
                    version
                );
            }

            lastVersionRef.current = version;
            clearEditMetadata();
        }
    }, [language, version, getLine, getLineCount, getEditMetadata, clearEditMetadata]);

    // Helper to apply tokens from worker response
    const applyWorkerTokens = useCallback((
        respVersion: number,
        changedFromLine: number,
        lines: SerializableLineHighlight[]
    ) => {
        if (!highlightStateRef.current) {
            highlightStateRef.current = {
                language,
                lines: lines as LineHighlight[],
                version: respVersion,
            };
            return;
        }

        // Apply partial update
        const currentLines = highlightStateRef.current.lines;
        const newLines: LineHighlight[] = [
            ...currentLines.slice(0, changedFromLine - 1),
            ...(lines as LineHighlight[]),
        ];

        highlightStateRef.current = {
            language: highlightStateRef.current.language,
            lines: newLines,
            version: respVersion,
        };
    }, [language]);

    const getTokens = useCallback((lineNumber: number): Token[] => {
        if (!highlightStateRef.current) {
            return [];
        }
        return getLineTokens(highlightStateRef.current, lineNumber);
    }, [workerVersion]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        getTokens,
        isReady: highlightStateRef.current !== null && highlightStateRef.current.lines.length > 0,
    };
}

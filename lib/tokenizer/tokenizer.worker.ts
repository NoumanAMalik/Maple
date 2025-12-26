/**
 * Web Worker for syntax highlighting tokenization.
 * Runs tokenization in a background thread to avoid blocking the main UI.
 */

import { LineCache } from "./lineCache";
import type { Token, TokenizerError } from "./types";

// Message types
interface TokenizeMessage {
    type: "tokenize";
    id: number;
    content: string;
    language: string;
}

interface ClearCacheMessage {
    type: "clear";
}

type WorkerMessage = TokenizeMessage | ClearCacheMessage;

interface TokenizeResponse {
    type: "tokens";
    id: number;
    tokens: Token[];
    errors: TokenizerError[];
}

// Cache instance persists across messages
let cache: LineCache | null = null;
let currentLanguage = "";

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    switch (message.type) {
        case "tokenize": {
            const { id, content, language } = message;

            // Initialize or update cache if language changed
            if (!cache || currentLanguage !== language) {
                cache = new LineCache(language as "typescript" | "javascript");
                currentLanguage = language;
            }

            try {
                // Perform tokenization (uses incremental caching)
                const tokens = cache.tokenize(content);

                const response: TokenizeResponse = {
                    type: "tokens",
                    id,
                    tokens,
                    errors: [],
                };

                self.postMessage(response);
            } catch (error) {
                const response: TokenizeResponse = {
                    type: "tokens",
                    id,
                    tokens: [],
                    errors: [
                        {
                            message: error instanceof Error ? error.message : String(error),
                            line: 0,
                            column: 0,
                        },
                    ],
                };

                self.postMessage(response);
            }
            break;
        }

        case "clear": {
            if (cache) {
                cache.clear();
            }
            break;
        }
    }
};

// Signal that worker is ready
self.postMessage({ type: "ready" });

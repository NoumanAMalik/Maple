import type { LanguageId } from "../types";
import type { TokenizerWorkerRequest, TokenizerWorkerResponse, SerializableLineHighlight } from "./types";

export interface TokenizerWorkerCallback {
    onTokensReady: (version: number, changedFromLine: number, lines: SerializableLineHighlight[]) => void;
    onError: (error: string) => void;
}

export class TokenizerWorkerManager {
    private worker: Worker | null = null;
    private callback: TokenizerWorkerCallback;
    private lastSentVersion = -1;
    private isDisposed = false;

    constructor(callback: TokenizerWorkerCallback) {
        this.callback = callback;
    }

    private ensureWorker(): Worker {
        if (this.worker) {
            return this.worker;
        }

        // Create worker using Next.js compatible approach
        this.worker = new Worker(new URL("./tokenizer.worker.ts", import.meta.url), { type: "module" });

        this.worker.onmessage = (event: MessageEvent<TokenizerWorkerResponse>) => {
            if (this.isDisposed) return;

            const response = event.data;

            switch (response.type) {
                case "init-complete":
                    // Ignore outdated responses
                    if (response.version < this.lastSentVersion) return;
                    this.callback.onTokensReady(response.version, 1, response.lines);
                    break;

                case "update-complete":
                    // Ignore outdated responses
                    if (response.version < this.lastSentVersion) return;
                    this.callback.onTokensReady(response.version, response.changedFromLine, response.lines);
                    break;

                case "error":
                    this.callback.onError(response.message);
                    break;
            }
        };

        this.worker.onerror = (error) => {
            this.callback.onError(error.message || "Worker error");
        };

        return this.worker;
    }

    init(language: LanguageId, lines: string[], version: number): void {
        if (this.isDisposed) return;

        const worker = this.ensureWorker();
        this.lastSentVersion = version;

        const request: TokenizerWorkerRequest = {
            type: "init",
            language,
            lines,
            version,
        };

        worker.postMessage(request);
    }

    update(
        language: LanguageId,
        changedFromLine: number,
        linesFromChanged: string[],
        totalLineCount: number,
        version: number,
    ): void {
        if (this.isDisposed) return;

        const worker = this.ensureWorker();
        this.lastSentVersion = version;

        const request: TokenizerWorkerRequest = {
            type: "update",
            language,
            changedFromLine,
            linesFromChanged,
            totalLineCount,
            version,
        };

        worker.postMessage(request);
    }

    dispose(): void {
        this.isDisposed = true;

        if (this.worker) {
            const request: TokenizerWorkerRequest = { type: "dispose" };
            this.worker.postMessage(request);
            this.worker.terminate();
            this.worker = null;
        }
    }
}

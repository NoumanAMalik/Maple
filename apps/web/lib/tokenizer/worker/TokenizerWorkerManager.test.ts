import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TokenizerWorkerManager } from "./TokenizerWorkerManager";

class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    constructor() {
        FakeWorker.lastInstance = this;
    }

    static lastInstance: FakeWorker | null = null;
}

describe("TokenizerWorkerManager", () => {
    const originalWorker = globalThis.Worker;

    beforeEach(() => {
        FakeWorker.lastInstance = null;
        vi.stubGlobal("Worker", FakeWorker as unknown as typeof Worker);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        globalThis.Worker = originalWorker;
    });

    it("should send init and handle init-complete responses", () => {
        const onTokensReady = vi.fn();
        const onError = vi.fn();
        const manager = new TokenizerWorkerManager({ onTokensReady, onError });

        manager.init("javascript", ["const x = 1;"], 2);

        const worker = FakeWorker.lastInstance;
        expect(worker).not.toBeNull();
        expect(worker?.postMessage).toHaveBeenCalledWith({
            type: "init",
            language: "javascript",
            lines: ["const x = 1;"],
            version: 2,
        });

        worker?.onmessage?.({ data: { type: "init-complete", version: 1, lines: [] } } as MessageEvent);
        expect(onTokensReady).not.toHaveBeenCalled();

        worker?.onmessage?.({ data: { type: "init-complete", version: 2, lines: [] } } as MessageEvent);
        expect(onTokensReady).toHaveBeenCalledWith(2, 1, []);
        expect(onError).not.toHaveBeenCalled();
    });

    it("should handle update-complete and error responses", () => {
        const onTokensReady = vi.fn();
        const onError = vi.fn();
        const manager = new TokenizerWorkerManager({ onTokensReady, onError });

        manager.update("javascript", 3, ["let a = 1;"], 4, 5);

        const worker = FakeWorker.lastInstance;
        expect(worker?.postMessage).toHaveBeenCalledWith({
            type: "update",
            language: "javascript",
            changedFromLine: 3,
            linesFromChanged: ["let a = 1;"],
            totalLineCount: 4,
            version: 5,
        });

        worker?.onmessage?.(
            {
                data: {
                    type: "update-complete",
                    version: 5,
                    changedFromLine: 3,
                    lines: [],
                },
            } as MessageEvent,
        );
        expect(onTokensReady).toHaveBeenCalledWith(5, 3, []);

        worker?.onmessage?.(
            {
                data: {
                    type: "error",
                    message: "boom",
                    version: 5,
                },
            } as MessageEvent,
        );
        expect(onError).toHaveBeenCalledWith("boom");

        worker?.onerror?.({ message: "" } as ErrorEvent);
        expect(onError).toHaveBeenCalledWith("Worker error");
    });

    it("should reuse the existing worker and ignore outdated updates", () => {
        const onTokensReady = vi.fn();
        const onError = vi.fn();
        const manager = new TokenizerWorkerManager({ onTokensReady, onError });

        manager.init("javascript", ["x"], 1);
        const worker = FakeWorker.lastInstance;

        manager.update("javascript", 1, ["x"], 1, 2);

        expect(FakeWorker.lastInstance).toBe(worker);

        worker?.onmessage?.(
            {
                data: {
                    type: "update-complete",
                    version: 1,
                    changedFromLine: 1,
                    lines: [],
                },
            } as MessageEvent,
        );

        expect(onTokensReady).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it("should ignore messages and requests after disposal", () => {
        const onTokensReady = vi.fn();
        const onError = vi.fn();
        const manager = new TokenizerWorkerManager({ onTokensReady, onError });

        manager.init("javascript", ["x"], 1);
        const worker = FakeWorker.lastInstance;

        manager.dispose();

        worker?.onmessage?.(
            {
                data: {
                    type: "update-complete",
                    version: 2,
                    changedFromLine: 1,
                    lines: [],
                },
            } as MessageEvent,
        );

        expect(onTokensReady).not.toHaveBeenCalled();

        FakeWorker.lastInstance = null;
        manager.init("javascript", ["y"], 2);
        expect(FakeWorker.lastInstance).toBeNull();
    });

    it("should allow dispose when no worker exists", () => {
        const onTokensReady = vi.fn();
        const onError = vi.fn();
        const manager = new TokenizerWorkerManager({ onTokensReady, onError });

        manager.dispose();

        expect(FakeWorker.lastInstance).toBeNull();
        expect(onTokensReady).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    it("should dispose worker and ignore new requests", () => {
        const onTokensReady = vi.fn();
        const onError = vi.fn();
        const manager = new TokenizerWorkerManager({ onTokensReady, onError });

        manager.init("javascript", ["x"], 1);
        const worker = FakeWorker.lastInstance;
        const postCallsBefore = worker?.postMessage.mock.calls.length ?? 0;

        manager.dispose();

        expect(worker?.postMessage).toHaveBeenCalledWith({ type: "dispose" });
        expect(worker?.terminate).toHaveBeenCalled();

        manager.update("javascript", 1, ["y"], 1, 2);
        const postCallsAfter = worker?.postMessage.mock.calls.length ?? 0;
        expect(postCallsAfter).toBe(postCallsBefore + 1); // only dispose message added
    });
});

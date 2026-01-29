import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type WorkerSelf = {
    postMessage: ReturnType<typeof vi.fn>;
    onmessage: ((event: MessageEvent) => void) | null;
};

const loadWorker = async () => {
    await import("./tokenizer.worker");
};

describe("tokenizer.worker", () => {
    let fakeSelf: WorkerSelf;

    beforeEach(async () => {
        vi.resetModules();
        fakeSelf = {
            postMessage: vi.fn(),
            onmessage: null,
        };
        vi.stubGlobal("self", fakeSelf as unknown as WorkerSelf);
        await loadWorker();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should tokenize full document on init", () => {
        fakeSelf.onmessage?.(
            {
                data: {
                    type: "init",
                    language: "javascript",
                    lines: ["const x = 1;", "const y = 2;"],
                    version: 1,
                },
            } as MessageEvent,
        );

        expect(fakeSelf.postMessage).toHaveBeenCalledTimes(1);
        const response = fakeSelf.postMessage.mock.calls[0][0];
        expect(response.type).toBe("init-complete");
        expect(response.version).toBe(1);
        expect(response.lines).toHaveLength(2);
    });

    it("should update incrementally for same language", () => {
        fakeSelf.onmessage?.(
            {
                data: {
                    type: "init",
                    language: "javascript",
                    lines: ["const x = 1;", "const y = 2;"],
                    version: 1,
                },
            } as MessageEvent,
        );

        fakeSelf.postMessage.mockClear();

        fakeSelf.onmessage?.(
            {
                data: {
                    type: "update",
                    language: "javascript",
                    changedFromLine: 1,
                    linesFromChanged: ["const x = 1;", "const y = 2;"],
                    totalLineCount: 2,
                    version: 2,
                },
            } as MessageEvent,
        );

        expect(fakeSelf.postMessage).toHaveBeenCalledTimes(1);
        const response = fakeSelf.postMessage.mock.calls[0][0];
        expect(response.type).toBe("update-complete");
        expect(response.changedFromLine).toBe(1);
        expect(response.lines).toHaveLength(2);
    });

    it("should reinitialize when language changes", () => {
        fakeSelf.onmessage?.(
            {
                data: {
                    type: "init",
                    language: "javascript",
                    lines: ["const x = 1;"],
                    version: 1,
                },
            } as MessageEvent,
        );

        fakeSelf.postMessage.mockClear();

        fakeSelf.onmessage?.(
            {
                data: {
                    type: "update",
                    language: "python",
                    changedFromLine: 1,
                    linesFromChanged: ["print('hi')"],
                    totalLineCount: 1,
                    version: 2,
                },
            } as MessageEvent,
        );

        const response = fakeSelf.postMessage.mock.calls[0][0];
        expect(response.type).toBe("init-complete");
        expect(response.version).toBe(2);
        expect(response.lines).toHaveLength(1);
    });

    it("should report errors for invalid update payloads", () => {
        fakeSelf.onmessage?.(
            {
                data: {
                    type: "update",
                    language: "javascript",
                    changedFromLine: 1,
                    linesFromChanged: null as unknown as string[],
                    totalLineCount: 1,
                    version: 3,
                },
            } as MessageEvent,
        );

        const response = fakeSelf.postMessage.mock.calls[0][0];
        expect(response.type).toBe("error");
        expect(response.version).toBe(3);
        expect(typeof response.message).toBe("string");
    });

    it("should handle dispose without errors", () => {
        fakeSelf.onmessage?.(
            {
                data: {
                    type: "dispose",
                },
            } as MessageEvent,
        );

        expect(fakeSelf.postMessage).not.toHaveBeenCalled();
    });
});

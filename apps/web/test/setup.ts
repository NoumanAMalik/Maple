import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock crypto.randomUUID for file system tests
if (!globalThis.crypto?.randomUUID) {
    globalThis.crypto = {
        ...globalThis.crypto,
        randomUUID: () => {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        },
    } as Crypto;
}

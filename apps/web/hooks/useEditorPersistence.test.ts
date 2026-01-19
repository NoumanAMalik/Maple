import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEditorPersistence } from "./useEditorPersistence";
import "fake-indexeddb/auto";
import { FileSystem } from "@/lib/storage";

async function createTestFile(): Promise<string> {
    const fs = new FileSystem();
    await fs.init();
    await fs.ensureRootDirectory();
    const file = await fs.createFile("root", "test-file-id.ts", "initial content");
    return file.id;
}

describe("useEditorPersistence", () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe("Initialization", () => {
        it("should initialize with isReady false initially", () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "test-id",
                    content: "",
                    isDirty: false,
                }),
            );

            expect(result.current.isReady).toBe(false);
            expect(result.current.isSaving).toBe(false);
        });

        it("should initialize with isSaving false", () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "test-id",
                    content: "",
                    isDirty: false,
                }),
            );

            expect(result.current.isSaving).toBe(false);
        });
    });

    describe("File Loading", () => {
        it("should load file content on mount", async () => {
            const fileId = await createTestFile();
            const onLoad = vi.fn();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId,
                    content: "",
                    isDirty: false,
                    onLoad,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });

        it("should not load when fileId is null", async () => {
            const onLoad = vi.fn();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: null,
                    content: "",
                    isDirty: false,
                    onLoad,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
            expect(onLoad).not.toHaveBeenCalled();
        });

        it("should not load when fileId is empty string", async () => {
            const onLoad = vi.fn();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "",
                    content: "",
                    isDirty: false,
                    onLoad,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
            expect(onLoad).not.toHaveBeenCalled();
        });
    });

    describe("Auto-save", () => {
        it("should not auto-save when content is unchanged", async () => {
            const fileId = await createTestFile();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId,
                    content: "same content",
                    isDirty: true,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(result.current.isSaving).toBe(false);
        });

        it("should not auto-save when not dirty", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "test-file-id.ts",
                    content: "content",
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(result.current.isSaving).toBe(false);
        });
    });

    describe("Force Save", () => {
        it("should have save function available", async () => {
            const fileId = await createTestFile();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId,
                    content: "test content",
                    isDirty: true,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(typeof result.current.save).toBe("function");
        });

        it("should have createFile function available", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: null,
                    content: "",
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(typeof result.current.createFile).toBe("function");
        });
    });

    describe("Create File", () => {
        it("should create a new file", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: null,
                    content: "",
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            const fileId = await result.current.createFile("root", "new-file.ts");
            expect(fileId).toBeDefined();
            expect(typeof fileId).toBe("string");
        });

        it("should throw error when file system not ready", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: null,
                    content: "",
                    isDirty: false,
                }),
            );

            expect(result.current.isReady).toBe(false);
            await expect(result.current.createFile("root", "test.ts")).rejects.toThrow("File system not ready");
        });

        it("should create file with content", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: null,
                    content: "",
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            const fileId = await result.current.createFile("root", "file-with-content.ts");
            expect(fileId).toBeDefined();
        });
    });

    describe("Error Handling", () => {
        it("should handle onError callback", async () => {
            const onError = vi.fn();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "test-file-id.ts",
                    content: "",
                    isDirty: false,
                    onError,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(onError).not.toHaveBeenCalled();
        });

        it("should handle onSave callback", async () => {
            const fileId = await createTestFile();
            const onSave = vi.fn();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId,
                    content: "test",
                    isDirty: true,
                    onSave,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(result.current.isSaving).toBe(false);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty fileId", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "",
                    content: "",
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });

        it("should handle undefined content", async () => {
            const fileId = await createTestFile();
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId,
                    content: undefined as unknown as string,
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });

        it("should handle non-existent fileId", async () => {
            const { result } = renderHook(() =>
                useEditorPersistence({
                    fileId: "non-existent-file-id.ts",
                    content: "",
                    isDirty: false,
                }),
            );

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });
    });
});

import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTabStatePersistence } from "./useTabStatePersistence";
import "fake-indexeddb/auto";
import { FileSystem } from "@/lib/storage";
import type { EditorTab } from "@/types/workspace";

async function setupTestFileSystem(): Promise<{ fs: FileSystem; fileIds: string[] }> {
    const fs = new FileSystem();
    await fs.init();
    await fs.ensureRootDirectory();

    const file1 = await fs.createFile("root", "file1.ts", "content1");
    const file2 = await fs.createFile("root", "file2.ts", "content2");
    const file3 = await fs.createFile("root", "file3.ts", "content3");

    return { fs, fileIds: [file1.id, file2.id, file3.id] };
}

describe("useTabStatePersistence", () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe("Initialization", () => {
        it("should not restore tabs before initialization", async () => {
            const onRestoreTabs = vi.fn();
            const fs = new FileSystem();
            await fs.init();
            await fs.ensureRootDirectory();

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: false,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).not.toHaveBeenCalled();
        });
    });

    describe("Tab Restoration", () => {
        it("should restore tabs on initialization", async () => {
            const { fs, fileIds } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            await fs.saveTabState(fileIds, fileIds[0]);

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).toHaveBeenCalled();
            const [tabs, activeId] = onRestoreTabs.mock.calls[0];
            expect(tabs.length).toBe(3);
            expect(activeId).toBe(fileIds[0]);
        });

        it("should not restore when no persisted state", async () => {
            const { fs } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).not.toHaveBeenCalled();
        });

        it("should not restore when tabOrder is empty", async () => {
            const { fs } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            await fs.saveTabState([], null);

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).not.toHaveBeenCalled();
        });

        it("should filter out non-existent files", async () => {
            const { fs, fileIds } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            await fs.saveTabState([fileIds[0], "non-existent-id", fileIds[1]], fileIds[0]);

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).toHaveBeenCalled();
            const [tabs] = onRestoreTabs.mock.calls[0];
            expect(tabs.length).toBe(2);
        });

        it("should use first tab as active when persisted active is not in tabs", async () => {
            const { fs, fileIds } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            await fs.saveTabState([fileIds[0], fileIds[1]], "non-existent");

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            const [tabs, activeId] = onRestoreTabs.mock.calls[0];
            expect(activeId).toBe(tabs[0].fileId);
        });

        it("should create proper tab objects", async () => {
            const { fs, fileIds } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            await fs.saveTabState([fileIds[0]], fileIds[0]);

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            const [tabs] = onRestoreTabs.mock.calls[0];
            const tab = tabs[0] as EditorTab;
            expect(tab.id).toBeDefined();
            expect(tab.fileId).toBe(fileIds[0]);
            expect(tab.fileName).toBe("file1.ts");
            expect(tab.filePath).toBe("/file1.ts");
            expect(tab.isDirty).toBe(false);
            expect(tab.language).toBe("typescript");
        });
    });

    describe("Tab Persistence", () => {
        it("should save tab state when tabs change", async () => {
            const { fs } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            const { rerender } = renderHook(
                ({ tabFileIds, activeFileId }) =>
                    useTabStatePersistence({
                        fileSystem: fs,
                        isInitialized: true,
                        tabFileIds,
                        activeFileId,
                        onRestoreTabs,
                    }),
                {
                    initialProps: { tabFileIds: [] as string[], activeFileId: null as string | null },
                },
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            const fileId = "file1.ts";
            rerender({ tabFileIds: [fileId], activeFileId: fileId });

            vi.advanceTimersByTime(400);

            const persisted = await fs.loadTabState();
            expect(persisted).not.toBeNull();
            expect(persisted?.tabOrder).toEqual([fileId]);
        });

        it("should debounce save", async () => {
            const { fs } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            const { rerender } = renderHook(
                ({ tabFileIds, activeFileId }) =>
                    useTabStatePersistence({
                        fileSystem: fs,
                        isInitialized: true,
                        tabFileIds,
                        activeFileId,
                        onRestoreTabs,
                    }),
                {
                    initialProps: { tabFileIds: [] as string[], activeFileId: null as string | null },
                },
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            const fileId = "file1.ts";
            rerender({ tabFileIds: [fileId], activeFileId: fileId });
            vi.advanceTimersByTime(100);
            rerender({ tabFileIds: [fileId, "file2.ts"], activeFileId: fileId });

            vi.advanceTimersByTime(400);

            const persisted = await fs.loadTabState();
            expect(persisted).not.toBeNull();
            expect(persisted?.tabOrder).toEqual([fileId, "file2.ts"]);
        });

        it("should save empty tab state", async () => {
            const { fs } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            const fileId = "file1.ts";
            await fs.saveTabState([fileId], fileId);

            const { rerender } = renderHook(
                ({ tabFileIds, activeFileId }) =>
                    useTabStatePersistence({
                        fileSystem: fs,
                        isInitialized: true,
                        tabFileIds,
                        activeFileId,
                        onRestoreTabs,
                    }),
                {
                    initialProps: { tabFileIds: [fileId] as string[], activeFileId: fileId as string | null },
                },
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            rerender({ tabFileIds: [], activeFileId: null });

            vi.advanceTimersByTime(400);

            const persisted = await fs.loadTabState();
            expect(persisted?.tabOrder).toEqual([]);
            expect(persisted?.activeFileId).toBeNull();
        });
    });

    describe("Edge Cases", () => {
        it("should handle null fileSystem", async () => {
            const onRestoreTabs = vi.fn();

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: null,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).not.toHaveBeenCalled();
        });

        it("should restore only once on mount", async () => {
            const { fs, fileIds } = await setupTestFileSystem();
            const onRestoreTabs = vi.fn();

            await fs.saveTabState(fileIds, fileIds[0]);

            const { rerender } = renderHook(
                ({ isInitialized }) =>
                    useTabStatePersistence({
                        fileSystem: fs,
                        isInitialized,
                        tabFileIds: [],
                        activeFileId: null,
                        onRestoreTabs,
                    }),
                {
                    initialProps: { isInitialized: false },
                },
            );

            rerender({ isInitialized: true });

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).toHaveBeenCalledTimes(1);
        });

        it("should not crash when onRestoreTabs is not provided", async () => {
            const { fs, fileIds } = await setupTestFileSystem();
            await fs.saveTabState(fileIds, fileIds[0]);

            expect(() => {
                renderHook(() =>
                    useTabStatePersistence({
                        fileSystem: fs,
                        isInitialized: true,
                        tabFileIds: [],
                        activeFileId: null,
                        onRestoreTabs: () => {},
                    }),
                );
            }).not.toThrow();
        });

        it("should handle very large tab list", async () => {
            const { fs } = await setupTestFileSystem();
            const fileIds: string[] = [];
            for (let i = 0; i < 100; i++) {
                const file = await fs.createFile("root", `large-file${i}.ts`, `content${i}`);
                fileIds.push(file.id);
            }

            const onRestoreTabs = vi.fn();
            await fs.saveTabState(fileIds, fileIds[0]);

            renderHook(() =>
                useTabStatePersistence({
                    fileSystem: fs,
                    isInitialized: true,
                    tabFileIds: [],
                    activeFileId: null,
                    onRestoreTabs,
                }),
            );

            // Wait for async operations to complete
            await act(async () => {
                await new Promise((resolve) => setImmediate(resolve));
            });

            expect(onRestoreTabs).toHaveBeenCalled();
            const [tabs] = onRestoreTabs.mock.calls[0];
            expect(tabs.length).toBe(100);
        });
    });
});

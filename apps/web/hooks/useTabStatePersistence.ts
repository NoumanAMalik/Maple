"use client";

import { useEffect, useRef, useCallback } from "react";
import { FileSystem } from "@/lib/storage";
import { debounce } from "@/utils/debounce";
import type { EditorTab, PersistedTab, PersistedTabState } from "@/types/workspace";

const TAB_PERSISTENCE_DELAY = 300;

interface UseTabStatePersistenceOptions {
    fileSystem: FileSystem | null;
    isInitialized: boolean;
    tabs: EditorTab[];
    activeTabId: string | null;
    onRestoreTabs: (tabs: EditorTab[], activeTabId: string | null) => void;
}

export function useTabStatePersistence({
    fileSystem,
    isInitialized,
    tabs,
    activeTabId,
    onRestoreTabs,
}: UseTabStatePersistenceOptions): void {
    const fileSystemRef = useRef<FileSystem | null>(null);
    const onRestoreTabsRef = useRef<UseTabStatePersistenceOptions["onRestoreTabs"] | null>(null);
    const hasRestoredRef = useRef(false);

    // Keep file system ref up to date
    useEffect(() => {
        fileSystemRef.current = fileSystem;
    }, [fileSystem]);

    // Keep onRestoreTabs ref up to date, but don't depend on its identity in effects
    useEffect(() => {
        onRestoreTabsRef.current = onRestoreTabs;
    }, [onRestoreTabs]);

    const saveTabState = useCallback(
        debounce(
            (
                tabOrder: string[],
                activeId: string | null,
                persistedTabs?: PersistedTab[],
                activePersistedTabId?: string | null,
            ) => {
                console.log("[PERSIST] saveTabState called with:", {
                    tabOrder,
                    activeId,
                    persistedTabs,
                    activePersistedTabId,
                });
                const fs = fileSystemRef.current;
                if (!fs) {
                    console.log("[PERSIST] No fileSystem, skipping save");
                    return;
                }
                fs.saveTabState(tabOrder, activeId, persistedTabs, activePersistedTabId).catch(console.error);
            },
            TAB_PERSISTENCE_DELAY,
        ),
        [],
    );

    // Cleanup debounced saves on unmount to avoid late writes
    useEffect(() => {
        return () => {
            saveTabState.cancel();
        };
    }, [saveTabState]);

    /**
     * One-time restore when the workspace is initialized.
     * - Runs only once per mount
     * - Ignores onRestoreTabs identity changes
     */
    useEffect(() => {
        if (!isInitialized) return;
        if (!fileSystemRef.current) return;
        if (hasRestoredRef.current) return;

        hasRestoredRef.current = true;
        let mounted = true;

        async function restore() {
            console.log("[PERSIST] restore() called, isInitialized:", isInitialized);
            const fs = fileSystemRef.current;
            if (!fs) {
                console.log("[PERSIST] No fileSystem in restore");
                return;
            }

            try {
                const persisted = (await fs.loadTabState()) as PersistedTabState | null;
                console.log("[PERSIST] Loaded persisted state:", persisted);
                if (!persisted) return;

                const validTabs: EditorTab[] = [];
                let persistedActiveTabId: string | null = null;

                if (persisted.version === 2) {
                    if (!Array.isArray(persisted.tabs) || persisted.tabs.length === 0) return;
                    persistedActiveTabId = persisted.activeTabId ?? null;

                    for (const tab of persisted.tabs) {
                        if (tab.kind === "file") {
                            const file = await fs.readFile(tab.fileId);
                            if (file) {
                                validTabs.push({
                                    id: file.id,
                                    fileId: file.id,
                                    fileName: file.name,
                                    filePath: file.path,
                                    isDirty: false,
                                    language: file.language,
                                });
                            }
                            continue;
                        }

                        if (tab.kind === "diff") {
                            const diffTabId = `diff:${tab.baseSnapshotId}`;
                            validTabs.push({
                                id: diffTabId,
                                fileId: diffTabId,
                                fileName: tab.snapshotLabel ? `Diff – ${tab.snapshotLabel}` : "Diff View",
                                filePath: "/diff",
                                isDirty: false,
                                language: null,
                                kind: "diff",
                                diffPayload: {
                                    baseSnapshotId: tab.baseSnapshotId,
                                    snapshotLabel: tab.snapshotLabel,
                                },
                            });
                        }
                    }
                } else {
                    if (!Array.isArray(persisted.tabOrder) || persisted.tabOrder.length === 0) return;
                    persistedActiveTabId = persisted.activeFileId;

                    for (const fileId of persisted.tabOrder) {
                        const file = await fs.readFile(fileId);
                        if (file) {
                            validTabs.push({
                                id: file.id,
                                fileId: file.id,
                                fileName: file.name,
                                filePath: file.path,
                                isDirty: false,
                                language: file.language,
                            });
                        }
                    }
                }

                if (validTabs.length === 0) return;

                let validActiveTabId: string | null = persistedActiveTabId;
                const activeTab = validTabs.find((t) => t.id === persistedActiveTabId);
                if (!activeTab && validTabs.length > 0) {
                    validActiveTabId = validTabs[0].id;
                }

                if (!mounted) return;

                const handler = onRestoreTabsRef.current;
                if (!handler) return;

                console.log(
                    "[PERSIST] Calling onRestoreTabs with:",
                    validTabs.map((t) => t.fileName),
                    validActiveTabId,
                );
                handler(validTabs, validActiveTabId);
            } catch (error) {
                console.error("Failed to restore tabs:", error);
            }
        }

        restore();

        return () => {
            mounted = false;
        };
    }, [isInitialized]);

    /**
     * Persist tab state whenever it changes, but only after initialization.
     * Filter out ephemeral tabs (like diff tabs) before persisting.
     */
    useEffect(() => {
        if (!isInitialized) return;
        if (!fileSystemRef.current) return;

        const persistableTabs = tabs.filter((t) => !t.ephemeral);
        const tabOrder = persistableTabs.map((t) => t.fileId);
        const persistedTabs: PersistedTab[] = persistableTabs.flatMap<PersistedTab>((t) => {
            if (t.kind === "diff") {
                if (!t.diffPayload) return [];
                return [
                    {
                        kind: "diff",
                        baseSnapshotId: t.diffPayload.baseSnapshotId,
                        snapshotLabel: t.diffPayload.snapshotLabel,
                    },
                ];
            }
            return [{ kind: "file", fileId: t.fileId }];
        });
        console.log("[PERSIST] Saving tab state:", { tabOrder, activeTabId, persistedTabs });
        saveTabState(tabOrder, activeTabId, persistedTabs, activeTabId);
    }, [isInitialized, tabs, activeTabId, saveTabState]);
}

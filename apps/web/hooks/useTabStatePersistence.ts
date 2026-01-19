"use client";

import { useEffect, useRef, useCallback } from "react";
import { FileSystem } from "@/lib/storage";
import { debounce } from "@/utils/debounce";
import type { EditorTab } from "@/types/workspace";

const TAB_PERSISTENCE_DELAY = 300;

interface UseTabStatePersistenceOptions {
    fileSystem: FileSystem | null;
    isInitialized: boolean;
    tabFileIds: string[];
    activeFileId: string | null;
    onRestoreTabs: (tabs: EditorTab[], activeTabId: string | null) => void;
}

export function useTabStatePersistence({
    fileSystem,
    isInitialized,
    tabFileIds,
    activeFileId,
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
        debounce((tabOrder: string[], activeId: string | null) => {
            console.log("[PERSIST] saveTabState called with:", { tabOrder, activeId });
            const fs = fileSystemRef.current;
            if (!fs) {
                console.log("[PERSIST] No fileSystem, skipping save");
                return;
            }
            fs.saveTabState(tabOrder, activeId).catch(console.error);
        }, TAB_PERSISTENCE_DELAY),
        [],
    );

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
                const persisted = await fs.loadTabState();
                console.log("[PERSIST] Loaded persisted state:", persisted);
                if (!persisted || persisted.tabOrder.length === 0) return;

                const validTabs: EditorTab[] = [];
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

                if (validTabs.length === 0) return;

                let validActiveFileId: string | null = persisted.activeFileId;
                const activeTab = validTabs.find((t) => t.fileId === persisted.activeFileId);
                if (!activeTab && validTabs.length > 0) {
                    validActiveFileId = validTabs[0].fileId;
                }

                if (!mounted) return;

                const handler = onRestoreTabsRef.current;
                if (!handler) return;

                console.log(
                    "[PERSIST] Calling onRestoreTabs with:",
                    validTabs.map((t) => t.fileName),
                    validActiveFileId,
                );
                handler(validTabs, validActiveFileId);
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
     */
    useEffect(() => {
        if (!isInitialized) return;
        if (!fileSystemRef.current) return;

        console.log("[PERSIST] Saving tab state:", { tabFileIds, activeFileId });
        saveTabState(tabFileIds, activeFileId);
    }, [isInitialized, tabFileIds, activeFileId, saveTabState]);
}

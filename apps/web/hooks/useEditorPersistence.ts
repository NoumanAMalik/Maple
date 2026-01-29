"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { FileSystem } from "@/lib/storage";
import { debounce } from "@/utils/debounce";
import { EDITOR_CONSTANTS } from "@/utils/constants";

interface UseEditorPersistenceOptions {
    /** File ID in IndexedDB (null for new/untitled files) */
    fileId: string | null;
    /** Current file content */
    content: string;
    /** Whether the content has been modified */
    isDirty: boolean;
    /** Auto-save delay in milliseconds */
    autoSaveDelay?: number;
    /** Called when content is loaded from storage */
    onLoad?: (content: string) => void;
    /** Called when save completes */
    onSave?: () => void;
    /** Called on error */
    onError?: (error: Error) => void;
}

interface UseEditorPersistenceReturn {
    /** Whether the file system is initialized */
    isReady: boolean;
    /** Whether a save is in progress */
    isSaving: boolean;
    /** Force save immediately */
    save: () => Promise<void>;
    /** Create a new file */
    createFile: (parentId: string | null, name: string) => Promise<string>;
}

/**
 * Hook for persisting editor content to IndexedDB.
 * Provides auto-save functionality with debouncing.
 */
export function useEditorPersistence({
    fileId,
    content,
    isDirty,
    autoSaveDelay = EDITOR_CONSTANTS.AUTO_SAVE_DELAY,
    onLoad,
    onSave,
    onError,
}: UseEditorPersistenceOptions): UseEditorPersistenceReturn {
    const fileSystemRef = useRef<FileSystem | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Keep track of last saved content to avoid unnecessary saves
    const lastSavedContentRef = useRef<string>("");
    const pendingContentRef = useRef<string>(content);

    // Initialize FileSystem
    useEffect(() => {
        const fs = new FileSystem();
        fileSystemRef.current = fs;

        fs.init()
            .then(() => {
                setIsReady(true);
            })
            .catch((error) => {
                console.error("Failed to initialize file system:", error);
                onError?.(error);
            });

        return () => {
            // Cleanup: flush any pending saves
            debouncedSave.flush();
            fs.storage.close();
            fileSystemRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load file content when fileId changes
    useEffect(() => {
        if (!isReady || !fileId) return;

        const fs = fileSystemRef.current;
        if (!fs) return;

        fs.readFile(fileId)
            .then((file) => {
                if (file) {
                    lastSavedContentRef.current = file.content;
                    onLoad?.(file.content);
                }
            })
            .catch((error) => {
                console.error("Failed to load file:", error);
                onError?.(error);
            });
    }, [isReady, fileId, onLoad, onError]);

    // Save function
    const saveToStorage = useCallback(
        async (contentToSave: string) => {
            if (!isReady || !fileId) return;
            if (contentToSave === lastSavedContentRef.current) return;

            const fs = fileSystemRef.current;
            if (!fs) return;

            setIsSaving(true);

            try {
                await fs.updateFile(fileId, contentToSave);
                lastSavedContentRef.current = contentToSave;
                onSave?.();
            } catch (error) {
                console.error("Failed to save file:", error);
                onError?.(error instanceof Error ? error : new Error(String(error)));
            } finally {
                setIsSaving(false);
            }
        },
        [isReady, fileId, onSave, onError],
    );

    // Create debounced save function
    const debouncedSave = useCallback(
        debounce((contentToSave: string) => {
            saveToStorage(contentToSave);
        }, autoSaveDelay),
        [saveToStorage, autoSaveDelay],
    );

    // Update pending content ref
    useEffect(() => {
        pendingContentRef.current = content;
    }, [content]);

    // Auto-save when content changes
    useEffect(() => {
        if (!isReady || !isDirty || !fileId) return;

        debouncedSave(content);
    }, [isReady, isDirty, fileId, content, debouncedSave]);

    // Force save immediately
    const save = useCallback(async () => {
        debouncedSave.cancel();
        await saveToStorage(pendingContentRef.current);
    }, [debouncedSave, saveToStorage]);

    // Create a new file
    const createFile = useCallback(
        async (parentId: string | null, name: string): Promise<string> => {
            if (!isReady) {
                throw new Error("File system not ready");
            }

            const fs = fileSystemRef.current;
            if (!fs) {
                throw new Error("File system not initialized");
            }

            try {
                // Use "root" as the parent ID for top-level files if parentId is null
                const effectiveParentId = parentId ?? "root";
                const file = await fs.createFile(effectiveParentId, name, "");
                return file.id;
            } catch (error) {
                console.error("Failed to create file:", error);
                onError?.(error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        },
        [isReady, onError],
    );

    return {
        isReady,
        isSaving,
        save,
        createFile,
    };
}

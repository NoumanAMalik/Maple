"use client";

import { useState, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { FilePlus, FolderPlus, RefreshCw } from "lucide-react";

export function ExplorerHeader() {
    const { createFile, createDirectory, refreshTree, state } = useWorkspace();
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newName, setNewName] = useState("");

    const handleCreateFile = useCallback(async () => {
        if (!newName.trim()) return;
        await createFile(state.rootId, newName.trim());
        setNewName("");
        setIsCreatingFile(false);
    }, [newName, createFile, state.rootId]);

    const handleCreateFolder = useCallback(async () => {
        if (!newName.trim()) return;
        await createDirectory(state.rootId, newName.trim());
        setNewName("");
        setIsCreatingFolder(false);
    }, [newName, createDirectory, state.rootId]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, type: "file" | "folder") => {
            if (e.key === "Enter") {
                if (type === "file") handleCreateFile();
                else handleCreateFolder();
            }
            if (e.key === "Escape") {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
                setNewName("");
            }
        },
        [handleCreateFile, handleCreateFolder],
    );

    return (
        <div className="border-b border-[var(--ui-border)] p-2">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                    Explorer
                </h2>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            setIsCreatingFile(true);
                            setIsCreatingFolder(false);
                        }}
                        className="rounded p-1 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)]"
                        aria-label="New File"
                        title="New File"
                    >
                        <FilePlus className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsCreatingFolder(true);
                            setIsCreatingFile(false);
                        }}
                        className="rounded p-1 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)]"
                        aria-label="New Folder"
                        title="New Folder"
                    >
                        <FolderPlus className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={refreshTree}
                        className="rounded p-1 text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)] hover:text-[var(--editor-fg)]"
                        aria-label="Refresh"
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Inline creation inputs */}
            {isCreatingFile && (
                <div className="mt-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "file")}
                        onBlur={() => {
                            if (newName.trim()) handleCreateFile();
                            else setIsCreatingFile(false);
                        }}
                        placeholder="File name..."
                        className="w-full rounded border border-[var(--ui-accent)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] outline-none"
                        // biome-ignore lint/a11y/noAutofocus: Intentional for inline creation input
                        autoFocus
                    />
                </div>
            )}

            {isCreatingFolder && (
                <div className="mt-2">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "folder")}
                        onBlur={() => {
                            if (newName.trim()) handleCreateFolder();
                            else setIsCreatingFolder(false);
                        }}
                        placeholder="Folder name..."
                        className="w-full rounded border border-[var(--ui-accent)] bg-[var(--editor-bg)] px-2 py-1 text-sm text-[var(--editor-fg)] outline-none"
                        // biome-ignore lint/a11y/noAutofocus: Intentional for inline creation input
                        autoFocus
                    />
                </div>
            )}
        </div>
    );
}

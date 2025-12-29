"use client";

import { useState, useCallback, useEffect } from "react";
import { ActivityBar, Explorer, TabBar, EditorPane, WelcomeScreen, CommandPalette } from "@/components/Editor";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { registerDefaultCommands } from "@/lib/commands/defaultCommands";
import type { CursorPosition } from "@/types/editor";

// Helper to get all file names at root level
function getRootFileNames(fileTree: { name: string }[]): Set<string> {
    return new Set(fileTree.map((node) => node.name));
}

// Generate unique filename like untitled.txt, untitled-1.txt, untitled-2.txt, etc.
function generateUniqueFileName(existingNames: Set<string>, baseName = "untitled", ext = "txt"): string {
    const fullName = `${baseName}.${ext}`;
    if (!existingNames.has(fullName)) {
        return fullName;
    }

    let counter = 1;
    while (existingNames.has(`${baseName}-${counter}.${ext}`)) {
        counter++;
    }
    return `${baseName}-${counter}.${ext}`;
}

function EditorContent() {
    const { state, createFile, closeTab } = useWorkspace();
    const [isExplorerOpen, setIsExplorerOpen] = useState(true);
    const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);

    const toggleExplorer = useCallback(() => {
        setIsExplorerOpen((prev) => !prev);
    }, []);

    const handleCursorChange = useCallback((position: CursorPosition) => {
        setCursorPosition(position);
    }, []);

    const createNewFile = useCallback(() => {
        const existingNames = getRootFileNames(state.fileTree);
        const fileName = generateUniqueFileName(existingNames);
        createFile(state.rootId, fileName);
    }, [createFile, state.rootId, state.fileTree]);

    const saveFile = useCallback(() => {
        // File is auto-saved via updateFileContent in EditorPane
        // This is a placeholder for explicit save action
        console.log("File saved");
    }, []);

    const selectAll = useCallback(() => {
        // This would be handled by the textarea in the editor
        // For now, we'll dispatch a select all event
        document.execCommand("selectAll");
    }, []);

    const undo = useCallback(() => {
        document.execCommand("undo");
    }, []);

    const redo = useCallback(() => {
        document.execCommand("redo");
    }, []);

    const closeActiveTab = useCallback(() => {
        if (state.activeTabId) {
            closeTab(state.activeTabId);
        }
    }, [state.activeTabId, closeTab]);

    const openFindReplace = useCallback(() => {
        setShowFindReplace(true);
    }, []);

    const closeFindReplace = useCallback(() => {
        setShowFindReplace(false);
    }, []);

    // Register default commands
    useEffect(() => {
        registerDefaultCommands({
            createFile: createNewFile,
            saveFile,
            closeTab: closeActiveTab,
            toggleExplorer,
            openFindReplace,
            selectAll,
            undo,
            redo,
        });
    }, [createNewFile, saveFile, closeActiveTab, toggleExplorer, openFindReplace, selectAll, undo, redo]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+Shift+P or Cmd+K for command palette
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "P") {
                e.preventDefault();
                setShowCommandPalette(true);
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setShowCommandPalette(true);
                return;
            }

            // Cmd+B / Ctrl+B to toggle sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === "b") {
                e.preventDefault();
                toggleExplorer();
            }
            // Cmd+N / Ctrl+N to create new file
            if ((e.metaKey || e.ctrlKey) && e.key === "n") {
                e.preventDefault();
                createNewFile();
            }
            // Cmd+W / Ctrl+W to close tab
            if ((e.metaKey || e.ctrlKey) && e.key === "w") {
                e.preventDefault();
                if (state.activeTabId) {
                    closeTab(state.activeTabId);
                }
            }
            // Cmd+F / Ctrl+F to open Find
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                e.preventDefault();
                setShowFindReplace(true);
            }
            // Cmd+H / Ctrl+H to open Find & Replace
            if ((e.metaKey || e.ctrlKey) && e.key === "h") {
                e.preventDefault();
                setShowFindReplace(true);
            }
            // Escape to close Find & Replace (only if no command palette)
            if (e.key === "Escape" && showFindReplace && !showCommandPalette) {
                setShowFindReplace(false);
            }
        };

        // Use capture phase to intercept before browser handles it
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [toggleExplorer, createNewFile, closeTab, state.activeTabId, showFindReplace, showCommandPalette]);

    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

    return (
        <div className="flex h-screen w-full flex-col bg-[var(--editor-bg)]">
            {/* Tab Bar */}
            <TabBar />

            {/* Main Editor Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Editor Content */}
                <div className="relative flex-1 overflow-hidden">
                    {state.activeTabId ? (
                        <EditorPane
                            tabId={state.activeTabId}
                            onCursorChange={handleCursorChange}
                            showFindReplace={showFindReplace}
                            onCloseFindReplace={closeFindReplace}
                        />
                    ) : (
                        <WelcomeScreen />
                    )}
                </div>

                <Explorer isOpen={isExplorerOpen} />
                <ActivityBar isExplorerOpen={isExplorerOpen} onToggleExplorer={toggleExplorer} />
            </div>

            {/* Status Bar */}
            <div className="flex h-6 items-center justify-between border-t border-[var(--ui-border)] bg-[#0d0f12] px-2 text-xs text-white">
                <div className="flex items-center gap-4">
                    <span>Maple Editor</span>
                    {activeTab && <span>{activeTab.fileName}</span>}
                </div>
                <div className="flex items-center gap-4">
                    <span>
                        Ln {cursorPosition.line}, Col {cursorPosition.column}
                    </span>
                    {activeTab?.language && <span>{activeTab.language}</span>}
                    <span>UTF-8</span>
                </div>
            </div>

            {/* Command Palette */}
            <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        </div>
    );
}

export default function EditorPage() {
    return (
        <WorkspaceProvider>
            <EditorContent />
        </WorkspaceProvider>
    );
}

"use client";

import { useState, useCallback } from "react";
import { ActivityBar, Explorer, TabBar, EditorPane } from "@/components/Editor";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import type { CursorPosition } from "@/types/editor";

function EditorContent() {
    const { state } = useWorkspace();
    const [isExplorerOpen, setIsExplorerOpen] = useState(true);
    const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });

    const toggleExplorer = useCallback(() => {
        setIsExplorerOpen((prev) => !prev);
    }, []);

    const handleCursorChange = useCallback((position: CursorPosition) => {
        setCursorPosition(position);
    }, []);

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
                        <EditorPane tabId={state.activeTabId} onCursorChange={handleCursorChange} />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <h2 className="mb-2 text-lg font-semibold text-[var(--editor-fg)]">Welcome to Maple</h2>
                                <p className="text-sm text-[var(--editor-line-number)]">
                                    Open a file from the explorer or create a new one to get started
                                </p>
                            </div>
                        </div>
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

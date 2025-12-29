"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { CodeEditor } from "./CodeEditor";
import { FindReplace } from "./FindReplace";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { CursorPosition } from "@/types/editor";

interface EditorPaneProps {
    tabId: string;
    onCursorChange?: (position: CursorPosition) => void;
    showFindReplace?: boolean;
    onCloseFindReplace?: () => void;
}

export const EditorPane = memo(function EditorPane({
    tabId,
    onCursorChange,
    showFindReplace = false,
    onCloseFindReplace,
}: EditorPaneProps) {
    const { state, dispatch, getFileSystem, saveFile } = useWorkspace();
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const savedContentRef = useRef("");

    const tab = state.tabs.find((t) => t.id === tabId);

    // Load file content when tab changes
    useEffect(() => {
        if (!tab) return;

        // Use cached content if available (unsaved edits)
        if (tab.unsavedContent !== undefined) {
            setContent(tab.unsavedContent);
            setIsLoading(false);
            return;
        }

        // Otherwise load from IndexedDB
        const fs = getFileSystem();
        if (!fs) return;

        setIsLoading(true);

        fs.readFile(tab.fileId)
            .then((file) => {
                if (file) {
                    setContent(file.content);
                    savedContentRef.current = file.content;
                }
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Failed to load file:", error);
                setIsLoading(false);
            });
    }, [tab?.fileId, tab?.unsavedContent, getFileSystem]);

    // Handle content change
    const handleContentChange = useCallback(
        (newContent: string) => {
            setContent(newContent);

            // Mark as dirty if changed from saved content
            const isDirty = newContent !== savedContentRef.current;

            if (tab) {
                if (tab.isDirty !== isDirty) {
                    dispatch({
                        type: "UPDATE_TAB_DIRTY",
                        payload: { tabId: tab.id, isDirty },
                    });
                }

                // Cache unsaved content
                dispatch({
                    type: "UPDATE_TAB_CONTENT",
                    payload: { tabId: tab.id, content: newContent },
                });
            }
        },
        [tab, dispatch],
    );

    // Save function
    const handleSave = useCallback(async () => {
        if (!tab) return;

        try {
            await saveFile(tab.id, content);
            savedContentRef.current = content;
        } catch (error) {
            console.error("Failed to save file:", error);
        }
    }, [tab, content, saveFile]);

    // Handle Cmd+S to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]);

    // Handle replace from FindReplace
    const handleReplaceContent = useCallback(
        (newContent: string) => {
            setContent(newContent);
            handleContentChange(newContent);
        },
        [handleContentChange],
    );

    // Handle navigation to match (just updates cursor for now)
    const handleNavigateToMatch = useCallback(
        (line: number, column: number) => {
            onCursorChange?.({ line, column });
        },
        [onCursorChange],
    );

    if (!tab) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--editor-line-number)]">
                No file selected
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-[var(--editor-line-number)]">Loading...</div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <CodeEditor
                initialContent={content}
                onChange={handleContentChange}
                onCursorChange={onCursorChange}
                autoFocus
            />
            {showFindReplace && onCloseFindReplace && (
                <FindReplace
                    isOpen={showFindReplace}
                    onClose={onCloseFindReplace}
                    content={content}
                    onReplace={handleReplaceContent}
                    onNavigateToMatch={handleNavigateToMatch}
                />
            )}
        </div>
    );
});

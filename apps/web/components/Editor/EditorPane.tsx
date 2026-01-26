"use client";

import { useState, useEffect, useCallback, useRef, memo, type Ref } from "react";
import { CodeEditor, type CodeEditorHandle } from "./CodeEditor";
import { FindReplace } from "./FindReplace";
import TufteMarkdown from "@/components/markdown/TufteMarkdown";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFindReplace } from "@/hooks/useFindReplace";
import type { CursorPosition } from "@/types/editor";
import type { Collaborator } from "@/hooks/useCollab";
import type { Operation } from "@maple/protocol";

interface EditorPaneProps {
    tabId: string;
    onCursorChange?: (position: CursorPosition) => void;
    showFindReplace?: boolean;
    onCloseFindReplace?: () => void;
    onContentChange?: (content: string) => void;
    collaborators?: Collaborator[];
    onOperations?: (ops: Operation[]) => void;
    editorRef?: Ref<CodeEditorHandle>;
}

export const EditorPane = memo(function EditorPane({
    tabId,
    onCursorChange,
    showFindReplace = false,
    onCloseFindReplace,
    onContentChange: onContentChangeCallback,
    collaborators = [],
    onOperations,
    editorRef,
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

    // Notify parent of content change (including initial load)
    useEffect(() => {
        if (content) {
            onContentChangeCallback?.(content);
        }
    }, [content, onContentChangeCallback]);

    // Handle content change
    // Use find/replace hook at EditorPane level to access matches
    const findReplaceHook = useFindReplace({
        content,
        isOpen: showFindReplace,
    });

    const handleContentChange = useCallback(
        (newContent: string) => {
            setContent(newContent);

            // Notify parent of content change
            onContentChangeCallback?.(newContent);

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
        [tab, dispatch, onContentChangeCallback],
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

    if (tab.isPreviewMode) {
        return (
            <div className="h-full w-full overflow-auto bg-[var(--editor-bg)] p-8">
                <TufteMarkdown markdown={content} className="tufte-content max-w-prose mx-auto" />
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <CodeEditor
                ref={editorRef}
                initialContent={content}
                onChange={handleContentChange}
                onCursorChange={onCursorChange}
                autoFocus
                searchMatches={findReplaceHook.matches}
                currentMatchIndex={findReplaceHook.currentMatchIndex}
                collaborators={collaborators}
                onOperations={onOperations}
            />
            {onCloseFindReplace && (
                <FindReplace
                    isOpen={showFindReplace}
                    onClose={onCloseFindReplace}
                    onReplace={handleReplaceContent}
                    onNavigateToMatch={handleNavigateToMatch}
                    // Pass all hook values as props
                    findQuery={findReplaceHook.findQuery}
                    setFindQuery={findReplaceHook.setFindQuery}
                    replaceQuery={findReplaceHook.replaceQuery}
                    setReplaceQuery={findReplaceHook.setReplaceQuery}
                    matches={findReplaceHook.matches}
                    currentMatchIndex={findReplaceHook.currentMatchIndex}
                    caseSensitive={findReplaceHook.caseSensitive}
                    toggleCaseSensitive={findReplaceHook.toggleCaseSensitive}
                    useRegex={findReplaceHook.useRegex}
                    toggleUseRegex={findReplaceHook.toggleUseRegex}
                    showReplace={findReplaceHook.showReplace}
                    toggleShowReplace={findReplaceHook.toggleShowReplace}
                    findNext={findReplaceHook.findNext}
                    findPrevious={findReplaceHook.findPrevious}
                    replaceCurrent={findReplaceHook.replaceCurrent}
                    replaceAll={findReplaceHook.replaceAll}
                    hasMatches={findReplaceHook.hasMatches}
                    matchCount={findReplaceHook.matchCount}
                />
            )}
        </div>
    );
});

"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    ActivityBar,
    Explorer,
    TabBar,
    EditorPane,
    WelcomeScreen,
    CommandPalette,
    FindReplaceSidebar,
    ShareSidebar,
    JoiningOverlay,
} from "@/components/Editor";
import type { CodeEditorHandle } from "@/components/Editor/CodeEditor";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { registerDefaultCommands } from "@/lib/commands/defaultCommands";
import { useFindReplace } from "@/hooks/useFindReplace";
import { useCollab } from "@/hooks/useCollab";
import { cn } from "@/lib/utils";
import type { Operation } from "@maple/protocol";
import type { CursorPosition } from "@/types/editor";
import type { SupportedLanguage } from "@/utils/constants";

type JoinState = "idle" | "joining" | "joined" | "error";

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

const LANGUAGE_EXTENSION_MAP: Record<SupportedLanguage, string> = {
    typescript: "ts",
    javascript: "js",
    css: "css",
    html: "html",
    json: "json",
    markdown: "md",
    python: "py",
};

function getExtensionForLanguage(language?: SupportedLanguage | null): string {
    if (!language) return "txt";
    return LANGUAGE_EXTENSION_MAP[language] ?? "txt";
}

function EditorContent() {
    const { state, createFile, closeTab, dispatch, getFileSystem } = useWorkspace();
    const searchParams = useSearchParams();
    const router = useRouter();
    const roomParam = searchParams.get("room");

    const [isExplorerOpen, setIsExplorerOpen] = useState(true);
    const [isSearchSidebarOpen, setIsSearchSidebarOpen] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [isShareSidebarOpen, setIsShareSidebarOpen] = useState(false);
    const editorRef = useRef<CodeEditorHandle | null>(null);

    const [joinState, setJoinState] = useState<JoinState>(roomParam ? "joining" : "idle");
    const [joinError, setJoinError] = useState<{ code?: string; message: string } | null>(null);
    const [joinAttempt, setJoinAttempt] = useState(0);
    const didAttemptJoinRef = useRef(false);

    const collab = useCollab();

    const handleLocalOperations = useCallback(
        (ops: Operation[]) => {
            if (collab.connectionStatus !== "connected" || !collab.roomId) return;
            collab.sendOperations(ops);
        },
        [collab],
    );

    // Get active tab content for find/replace
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    const [activeContent, setActiveContent] = useState("");

    useEffect(() => {
        if (!collab.remoteOpsEvent) return;
        editorRef.current?.applyRemoteOperations(collab.remoteOpsEvent.ops);
    }, [collab.remoteOpsEvent]);

    // Handle snapshot restoration
    useEffect(() => {
        collab.setOnSnapshotRestored((content, _snapshotId, _version) => {
            // Update the editor content with the restored snapshot
            if (activeTab) {
                dispatch({
                    type: "UPDATE_TAB_CONTENT",
                    payload: { tabId: activeTab.id, content },
                });
                setActiveContent(content);
            }
        });

        return () => {
            collab.setOnSnapshotRestored(null);
        };
    }, [collab, activeTab, dispatch]);

    const persistSharedContent = useCallback(async () => {
        if (!activeTab) return;
        const fs = getFileSystem();
        if (!fs) return;

        const contentToSave = activeTab.unsavedContent ?? activeContent;

        if (activeTab.fileId.startsWith("collab-")) {
            try {
                const existingNames = getRootFileNames(state.fileTree);
                const ext = getExtensionForLanguage(activeTab.language);
                const fileName = generateUniqueFileName(existingNames, "shared", ext);
                const file = await fs.createFile(state.rootId, fileName, contentToSave);
                dispatch({ type: "CREATE_FILE", payload: { file } });
            } catch (error) {
                console.error("[EditorPage] Failed to save shared file:", error);
            }
            return;
        }

        try {
            await fs.updateFile(activeTab.fileId, contentToSave);
            dispatch({ type: "SAVE_FILE", payload: { tabId: activeTab.id } });
        } catch (error) {
            console.error("[EditorPage] Failed to save file:", error);
        }
    }, [activeTab, activeContent, dispatch, getFileSystem, state.fileTree, state.rootId]);

    // Update active content when tab changes
    useEffect(() => {
        if (activeTab?.unsavedContent !== undefined) {
            setActiveContent(activeTab.unsavedContent);
        } else {
            // Will be loaded by EditorPane
            setActiveContent("");
        }
    }, [activeTab?.id, activeTab?.unsavedContent]);

    // Use find/replace hook at EditorContent level for sidebar
    const findReplaceHook = useFindReplace({
        content: activeContent,
        isOpen: isSearchSidebarOpen,
    });

    const toggleExplorer = useCallback(() => {
        setIsExplorerOpen((prev) => !prev);
    }, []);

    const toggleSearchSidebar = useCallback(() => {
        setIsSearchSidebarOpen((prev) => !prev);
    }, []);

    const toggleShareSidebar = useCallback(() => {
        setIsShareSidebarOpen((prev) => !prev);
    }, []);

    const closeShareSidebar = useCallback(() => {
        setIsShareSidebarOpen(false);
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

    const closeSearchSidebar = useCallback(() => {
        setIsSearchSidebarOpen(false);
    }, []);

    // Handle replace from sidebar
    const handleSidebarReplace = useCallback(
        (newContent: string) => {
            if (activeTab) {
                // Update the tab content
                dispatch({
                    type: "UPDATE_TAB_CONTENT",
                    payload: { tabId: activeTab.id, content: newContent },
                });
                setActiveContent(newContent);
            }
        },
        [activeTab, dispatch],
    );

    // Handle navigate to match from sidebar
    const handleNavigateToMatch = useCallback((line: number, column: number) => {
        setCursorPosition({ line, column });
        // Focus will be handled by CodeEditor
    }, []);

    const handleStartSharing = useCallback(async () => {
        try {
            await collab.startSharing(activeContent, activeTab?.language ?? undefined);
        } catch (error) {
            console.error("[EditorPage] Failed to start sharing:", error);
        }
    }, [collab, activeContent, activeTab?.language]);

    const handleStopSharing = useCallback(async () => {
        await persistSharedContent();
        collab.stopSharing();
        closeShareSidebar();
    }, [collab, closeShareSidebar, persistSharedContent]);

    // Handle leaving room (for joiners)
    const handleLeaveRoom = useCallback(async () => {
        await persistSharedContent();
        collab.leaveRoom();
        setJoinState("idle");
        setJoinError(null);
        router.replace("/editor");
        closeShareSidebar();
    }, [collab, closeShareSidebar, persistSharedContent, router]);

    // Join room effect - runs when ?room= param is present
    useEffect(() => {
        if (!roomParam || didAttemptJoinRef.current) return;
        didAttemptJoinRef.current = true;

        const targetRoomId = roomParam;

        async function joinRoomAsync() {
            try {
                setJoinState("joining");
                const { snapshot } = await collab.joinRoom(targetRoomId);

                dispatch({
                    type: "LOAD_COLLAB_SNAPSHOT",
                    payload: {
                        content: snapshot,
                        roomId: targetRoomId,
                    },
                });

                setJoinState("joined");
            } catch (error) {
                console.error("[EditorPage] Failed to join room:", error);
                setJoinState("error");
                setJoinError({
                    message: error instanceof Error ? error.message : "Failed to join room",
                });
            }
        }

        joinRoomAsync();
    }, [roomParam, collab, dispatch, joinAttempt]);

    // Retry join handler
    const handleRetryJoin = useCallback(() => {
        if (!roomParam) return;
        didAttemptJoinRef.current = false;
        setJoinError(null);
        setJoinAttempt((prev) => prev + 1);
    }, [roomParam]);

    // Update presence when cursor changes (for both host and joiner)
    useEffect(() => {
        if (collab.connectionStatus === "connected" && collab.roomId) {
            collab.updatePresence(cursorPosition);
        }
    }, [collab, cursorPosition]);

    // Register default commands
    useEffect(() => {
        console.log("[EditorPage] Registering default commands - useEffect triggered");
        registerDefaultCommands({
            createFile: createNewFile,
            saveFile,
            closeTab: closeActiveTab,
            toggleExplorer,
            openFindReplace,
            selectAll,
            undo,
            redo,
            toggleSearch: toggleSearchSidebar,
        });
    }, [
        createNewFile,
        saveFile,
        closeActiveTab,
        toggleExplorer,
        openFindReplace,
        selectAll,
        undo,
        redo,
        toggleSearchSidebar,
    ]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K for command palette
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                console.log("[EditorPage] Cmd+K pressed - opening command palette");
                setShowCommandPalette(true);
                return;
            }

            // Cmd+B / Ctrl+B to toggle Explorer sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === "b") {
                e.preventDefault();
                toggleExplorer();
            }
            // Cmd+Shift+F / Ctrl+Shift+F to toggle Search sidebar
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
                e.preventDefault();
                toggleSearchSidebar();
            }
            // Cmd+N / Ctrl+N to create new file
            if ((e.metaKey || e.ctrlKey) && e.key === "n") {
                e.preventDefault();
                createNewFile();
            }
            // Cmd+1 / Ctrl+1 to close tab
            if ((e.metaKey || e.ctrlKey) && e.key === "1") {
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
    }, [
        toggleExplorer,
        toggleSearchSidebar,
        createNewFile,
        closeTab,
        state.activeTabId,
        showFindReplace,
        showCommandPalette,
    ]);

    return (
        <div className="flex h-screen w-full flex-col bg-[var(--editor-bg)]">
            {/* Tab Bar */}
            <div className="flex items-stretch border-b border-[var(--ui-border)]">
                <div className="flex-1 overflow-hidden">
                    <TabBar />
                </div>
            </div>

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
                            onContentChange={setActiveContent}
                            collaborators={collab.collaborators}
                            onOperations={handleLocalOperations}
                            editorRef={editorRef}
                        />
                    ) : (
                        <WelcomeScreen />
                    )}
                </div>

                {/* Right sidebar group - single border on left */}
                <div className="flex h-full border-l border-[var(--ui-border)]">
                    {/* Share Sidebar */}
                    <div
                        className={cn(
                            "h-full overflow-hidden bg-[var(--ui-sidebar-bg)] transition-all duration-300",
                            isShareSidebarOpen ? "w-72 border-r border-[var(--ui-border)]" : "w-0",
                        )}
                    >
                        {isShareSidebarOpen && (
                            <ShareSidebar
                                isOpen={isShareSidebarOpen}
                                onClose={closeShareSidebar}
                                isSharing={collab.isSharing}
                                isJoiner={collab.isJoiner}
                                isOwner={collab.isOwner}
                                shareUrl={collab.shareUrl}
                                collaborators={collab.collaborators}
                                connectionStatus={collab.connectionStatus}
                                displayName={collab.displayName}
                                recentChanges={collab.recentChanges}
                                snapshots={collab.snapshots}
                                onStartSharing={handleStartSharing}
                                onStopSharing={handleStopSharing}
                                onLeaveRoom={handleLeaveRoom}
                                onDisplayNameChange={collab.setDisplayName}
                                onSaveSnapshot={(message) => collab.saveSnapshot(activeContent, message)}
                                onRestoreSnapshot={collab.restoreSnapshot}
                            />
                        )}
                    </div>

                    {/* Search Sidebar */}
                    <div
                        className={cn(
                            "h-full overflow-hidden bg-[var(--ui-sidebar-bg)] transition-all duration-300",
                            isSearchSidebarOpen ? "w-60 border-r border-[var(--ui-border)]" : "w-0",
                        )}
                    >
                        {isSearchSidebarOpen && (
                            <FindReplaceSidebar
                                isOpen={isSearchSidebarOpen}
                                onClose={closeSearchSidebar}
                                onNavigateToMatch={handleNavigateToMatch}
                                onReplace={handleSidebarReplace}
                                content={activeContent}
                                {...findReplaceHook}
                            />
                        )}
                    </div>

                    <Explorer isOpen={isExplorerOpen} />
                    <ActivityBar
                        isExplorerOpen={isExplorerOpen}
                        onToggleExplorer={toggleExplorer}
                        isSearchOpen={isSearchSidebarOpen}
                        onToggleSearch={toggleSearchSidebar}
                        isShareOpen={isShareSidebarOpen}
                        onToggleShare={toggleShareSidebar}
                    />
                </div>
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

            {/* Joining Overlay */}
            {(joinState === "joining" || joinState === "error") && (
                <JoiningOverlay
                    state={joinState}
                    error={joinError ?? undefined}
                    onRetry={handleRetryJoin}
                    onExit={handleLeaveRoom}
                />
            )}
        </div>
    );
}

export default function EditorPage() {
    return (
        <WorkspaceProvider>
            <Suspense fallback={<EditorLoadingFallback />}>
                <EditorContent />
            </Suspense>
        </WorkspaceProvider>
    );
}

function EditorLoadingFallback() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#111418]">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent" />
                <span className="text-sm text-[var(--editor-line-number)]">Loading editor...</span>
            </div>
        </div>
    );
}

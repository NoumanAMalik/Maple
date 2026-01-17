"use client";

import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react";
import { FileSystem } from "@/lib/storage";
import { useTabStatePersistence } from "@/hooks/useTabStatePersistence";
import type { WorkspaceState, WorkspaceAction, WorkspaceContextValue, EditorTab, TreeNode } from "@/types/workspace";
import type { FileNode } from "@/types/file";

const ROOT_ID = "root";

// Initial state
const initialState: WorkspaceState = {
    tabs: [],
    activeTabId: null,
    fileTree: [],
    isInitialized: false,
    rootId: ROOT_ID,
};

// Tree manipulation helpers
function insertNodeInTree(tree: TreeNode[], node: FileNode, rootId: string): TreeNode[] {
    // If this node should be a direct child of root, add it to the tree array
    if (node.parentId === rootId || node.parentId === null) {
        return [...tree, { ...node, children: [] }];
    }

    return tree.map((n) => {
        if (n.id === node.parentId) {
            const children = n.children || [];
            return {
                ...n,
                children: [...children, { ...node, children: [] }],
            };
        }
        if (n.children) {
            return {
                ...n,
                children: insertNodeInTree(n.children, node, rootId),
            };
        }
        return n;
    });
}

function removeNodeFromTree(tree: TreeNode[], nodeId: string): TreeNode[] {
    return tree
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
            ...n,
            children: n.children ? removeNodeFromTree(n.children, nodeId) : undefined,
        }));
}

function renameNodeInTree(tree: TreeNode[], nodeId: string, newName: string): TreeNode[] {
    return tree.map((n) => {
        if (n.id === nodeId) {
            return { ...n, name: newName };
        }
        if (n.children) {
            return {
                ...n,
                children: renameNodeInTree(n.children, nodeId, newName),
            };
        }
        return n;
    });
}

function toggleNodeInTree(tree: TreeNode[], nodeId: string): TreeNode[] {
    return tree.map((n) => {
        if (n.id === nodeId) {
            return { ...n, isExpanded: !n.isExpanded };
        }
        if (n.children) {
            return {
                ...n,
                children: toggleNodeInTree(n.children, nodeId),
            };
        }
        return n;
    });
}

function getAffectedFileIds(tree: TreeNode[], nodeId: string): string[] {
    const ids: string[] = [nodeId];

    function collectIds(nodes: TreeNode[]) {
        for (const node of nodes) {
            if (node.id === nodeId) {
                if (node.children) {
                    function addChildrenIds(children: TreeNode[]) {
                        for (const child of children) {
                            ids.push(child.id);
                            if (child.children) {
                                addChildrenIds(child.children);
                            }
                        }
                    }
                    addChildrenIds(node.children);
                }
                return;
            }
            if (node.children) {
                collectIds(node.children);
            }
        }
    }

    collectIds(tree);
    return ids;
}

// Sort nodes: directories first, then alphabetically
function sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes
        .sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === "directory" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        })
        .map((n) => ({
            ...n,
            children: n.children ? sortNodes(n.children) : undefined,
        }));
}

// Build tree structure from flat list
function buildTree(nodes: FileNode[], rootId: string): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();

    // Create map of all nodes
    for (const node of nodes) {
        nodeMap.set(node.id, {
            ...node,
            isExpanded: false,
            children: [],
        });
    }

    // Build tree structure
    const tree: TreeNode[] = [];
    for (const node of nodeMap.values()) {
        // Skip the root node itself - only show its children at the top level
        if (node.id === rootId) continue;

        if (node.parentId === null || node.parentId === rootId) {
            tree.push(node);
        } else {
            const parent = nodeMap.get(node.parentId);
            if (parent) {
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(node);
            }
        }
    }

    return sortNodes(tree);
}

// Reducer
function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
    switch (action.type) {
        case "INIT_WORKSPACE":
            return {
                ...state,
                fileTree: action.payload.fileTree,
                rootId: action.payload.rootId,
                isInitialized: true,
            };

        case "RESTORE_TABS":
            return {
                ...state,
                tabs: action.payload.tabs,
                activeTabId: action.payload.activeTabId,
            };

        case "OPEN_FILE": {
            const { file } = action.payload;

            // Check if already open
            const existingTab = state.tabs.find((t) => t.fileId === file.id);
            if (existingTab) {
                return {
                    ...state,
                    activeTabId: existingTab.id,
                };
            }

            // Create new tab
            const newTab: EditorTab = {
                id: file.id,
                fileId: file.id,
                fileName: file.name,
                filePath: file.path,
                isDirty: false,
                language: file.language,
            };

            return {
                ...state,
                tabs: [...state.tabs, newTab],
                activeTabId: newTab.id,
            };
        }

        case "CLOSE_TAB": {
            const { tabId } = action.payload;
            console.log("[CLOSE_TAB] Closing tab:", tabId);
            const newTabs = state.tabs.filter((t) => t.id !== tabId);
            console.log(
                "[CLOSE_TAB] Remaining tabs:",
                newTabs.map((t) => t.fileName),
            );

            // If closing active tab, activate the next or previous tab
            let newActiveTabId = state.activeTabId;
            if (state.activeTabId === tabId) {
                const closedIndex = state.tabs.findIndex((t) => t.id === tabId);
                if (newTabs.length > 0) {
                    const newIndex = Math.min(closedIndex, newTabs.length - 1);
                    newActiveTabId = newTabs[newIndex].id;
                } else {
                    newActiveTabId = null;
                }
            }

            return {
                ...state,
                tabs: newTabs,
                activeTabId: newActiveTabId,
            };
        }

        case "SET_ACTIVE_TAB":
            return {
                ...state,
                activeTabId: action.payload.tabId,
            };

        case "UPDATE_TAB_DIRTY": {
            const { tabId, isDirty } = action.payload;
            return {
                ...state,
                tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
            };
        }

        case "UPDATE_TAB_CONTENT": {
            const { tabId, content } = action.payload;
            return {
                ...state,
                tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, unsavedContent: content } : t)),
            };
        }

        case "SAVE_FILE": {
            const { tabId } = action.payload;
            return {
                ...state,
                tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: false, unsavedContent: undefined } : t)),
            };
        }

        case "CREATE_FILE": {
            const { file } = action.payload;
            return {
                ...state,
                fileTree: sortNodes(insertNodeInTree(state.fileTree, file, state.rootId)),
            };
        }

        case "CREATE_DIRECTORY": {
            const { directory } = action.payload;
            return {
                ...state,
                fileTree: sortNodes(insertNodeInTree(state.fileTree, directory, state.rootId)),
            };
        }

        case "DELETE_NODE": {
            const { nodeId } = action.payload;
            // Close any tabs for this file or files within directory
            const affectedFileIds = getAffectedFileIds(state.fileTree, nodeId);
            const newTabs = state.tabs.filter((t) => !affectedFileIds.includes(t.fileId));

            let newActiveTabId = state.activeTabId;
            if (state.activeTabId && affectedFileIds.includes(state.activeTabId)) {
                newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null;
            }

            return {
                ...state,
                tabs: newTabs,
                activeTabId: newActiveTabId,
                fileTree: removeNodeFromTree(state.fileTree, nodeId),
            };
        }

        case "RENAME_NODE": {
            const { nodeId, newName } = action.payload;
            return {
                ...state,
                tabs: state.tabs.map((t) => (t.fileId === nodeId ? { ...t, fileName: newName } : t)),
                fileTree: renameNodeInTree(state.fileTree, nodeId, newName),
            };
        }

        case "TOGGLE_DIRECTORY": {
            const { nodeId } = action.payload;
            return {
                ...state,
                fileTree: toggleNodeInTree(state.fileTree, nodeId),
            };
        }

        case "REFRESH_TREE":
            return {
                ...state,
                fileTree: action.payload.fileTree,
            };

        case "REORDER_TABS": {
            const { fromIndex, toIndex } = action.payload;

            // Guard: Invalid indices or no change
            if (
                fromIndex < 0 ||
                toIndex < 0 ||
                fromIndex >= state.tabs.length ||
                toIndex >= state.tabs.length ||
                fromIndex === toIndex
            ) {
                return state;
            }

            // Create new tabs array with reordered item
            const newTabs = [...state.tabs];
            const [movedTab] = newTabs.splice(fromIndex, 1);
            newTabs.splice(toIndex, 0, movedTab);

            return {
                ...state,
                tabs: newTabs,
            };
        }

        case "TOGGLE_PREVIEW_MODE": {
            const { tabId } = action.payload;
            return {
                ...state,
                tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isPreviewMode: !t.isPreviewMode } : t)),
            };
        }

        default:
            return state;
    }
}

// Context
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// Provider
export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(workspaceReducer, initialState);
    const fsRef = useRef<FileSystem | null>(null);

    // Initialize file system and load tree
    useEffect(() => {
        const fs = new FileSystem();
        fsRef.current = fs;

        async function init() {
            await fs.init();
            const root = await fs.ensureRootDirectory();
            const allNodes = await fs.getFileTree();
            const tree = buildTree(allNodes, root.id);

            dispatch({
                type: "INIT_WORKSPACE",
                payload: { fileTree: tree, rootId: root.id },
            });
        }

        init().catch(console.error);
    }, []);

    useTabStatePersistence({
        fileSystem: fsRef.current,
        isInitialized: state.isInitialized,
        tabFileIds: state.tabs.map((t) => t.fileId),
        activeFileId: state.activeTabId,
        onRestoreTabs: (tabs, activeTabId) => {
            dispatch({ type: "RESTORE_TABS", payload: { tabs, activeTabId } });
        },
    });

    // Get file system reference
    const getFileSystem = useCallback(() => {
        return fsRef.current;
    }, []);

    // Open file
    const openFile = useCallback(async (fileId: string) => {
        const fs = fsRef.current;
        if (!fs) return;

        const file = await fs.readFile(fileId);
        if (file) {
            dispatch({ type: "OPEN_FILE", payload: { file } });
        }
    }, []);

    // Close tab
    const closeTab = useCallback((tabId: string) => {
        dispatch({ type: "CLOSE_TAB", payload: { tabId } });
    }, []);

    // Save file
    const saveFile = useCallback(
        async (tabId: string, content: string) => {
            const fs = fsRef.current;
            if (!fs) return;

            const tab = state.tabs.find((t) => t.id === tabId);
            if (!tab) return;

            await fs.updateFile(tab.fileId, content);
            dispatch({ type: "SAVE_FILE", payload: { tabId } });
        },
        [state.tabs],
    );

    // Create file
    const createFile = useCallback(async (parentId: string, name: string) => {
        const fs = fsRef.current;
        if (!fs) return;

        const file = await fs.createFile(parentId, name, "");
        dispatch({ type: "CREATE_FILE", payload: { file } });

        // Auto-open new file
        dispatch({ type: "OPEN_FILE", payload: { file } });
    }, []);

    // Create directory
    const createDirectory = useCallback(async (parentId: string, name: string) => {
        const fs = fsRef.current;
        if (!fs) return;

        const directory = await fs.createDirectory(parentId, name);
        dispatch({ type: "CREATE_DIRECTORY", payload: { directory } });
    }, []);

    // Delete node
    const deleteNode = useCallback(async (nodeId: string) => {
        const fs = fsRef.current;
        if (!fs) return;

        // Determine if file or directory
        const node = await fs.storage.get<FileNode>("files", nodeId);
        if (!node) return;

        if (node.type === "directory") {
            await fs.deleteDirectory(nodeId);
        } else {
            await fs.deleteFile(nodeId);
        }

        dispatch({ type: "DELETE_NODE", payload: { nodeId } });
    }, []);

    // Rename node
    const renameNode = useCallback(async (nodeId: string, newName: string) => {
        const fs = fsRef.current;
        if (!fs) return;

        await fs.renameFile(nodeId, newName);
        dispatch({ type: "RENAME_NODE", payload: { nodeId, newName } });
    }, []);

    // Toggle directory
    const toggleDirectory = useCallback((nodeId: string) => {
        dispatch({ type: "TOGGLE_DIRECTORY", payload: { nodeId } });
    }, []);

    // Refresh tree
    const refreshTree = useCallback(async () => {
        const fs = fsRef.current;
        if (!fs) return;

        const allNodes = await fs.getFileTree();
        const tree = buildTree(allNodes, state.rootId);
        dispatch({ type: "REFRESH_TREE", payload: { fileTree: tree } });
    }, [state.rootId]);

    // Move node to a new parent
    const moveNode = useCallback(
        async (nodeId: string, newParentId: string) => {
            const fs = fsRef.current;
            if (!fs) return;

            await fs.moveNode(nodeId, newParentId);
            await refreshTree();
        },
        [refreshTree],
    );

    const value: WorkspaceContextValue = {
        state,
        dispatch,
        getFileSystem,
        openFile,
        closeTab,
        saveFile,
        createFile,
        createDirectory,
        deleteNode,
        renameNode,
        toggleDirectory,
        refreshTree,
        moveNode,
    };

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// Hook
export function useWorkspace(): WorkspaceContextValue {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error("useWorkspace must be used within WorkspaceProvider");
    }
    return context;
}

import type { FileNode, FileContent } from "./file";
import type { SupportedLanguage } from "@/utils/constants";

/**
 * Extended Tab interface with editor state
 */
export interface EditorTab {
    id: string;
    fileId: string;
    fileName: string;
    filePath: string;
    isDirty: boolean;
    language: SupportedLanguage | null;
    unsavedContent?: string; // Cache unsaved edits
}

/**
 * Tree node for file explorer with UI state
 */
export interface TreeNode extends FileNode {
    isExpanded?: boolean;
    children?: TreeNode[];
}

/**
 * Workspace state managed by reducer
 */
export interface WorkspaceState {
    tabs: EditorTab[];
    activeTabId: string | null;
    fileTree: TreeNode[];
    isInitialized: boolean;
    rootId: string;
}

export interface PersistedTabState {
    id: "__tab_state__";
    version: 1;
    tabOrder: string[];
    activeFileId: string | null;
    updatedAt: number;
}

/**
 * Actions for workspace reducer
 */
export type WorkspaceAction =
    | { type: "INIT_WORKSPACE"; payload: { fileTree: TreeNode[]; rootId: string } }
    | { type: "RESTORE_TABS"; payload: { tabs: EditorTab[]; activeTabId: string | null } }
    | { type: "OPEN_FILE"; payload: { file: FileContent } }
    | { type: "CLOSE_TAB"; payload: { tabId: string } }
    | { type: "SET_ACTIVE_TAB"; payload: { tabId: string } }
    | { type: "UPDATE_TAB_DIRTY"; payload: { tabId: string; isDirty: boolean } }
    | { type: "UPDATE_TAB_CONTENT"; payload: { tabId: string; content: string } }
    | { type: "SAVE_FILE"; payload: { tabId: string } }
    | { type: "CREATE_FILE"; payload: { file: FileContent } }
    | { type: "CREATE_DIRECTORY"; payload: { directory: FileNode } }
    | { type: "DELETE_NODE"; payload: { nodeId: string } }
    | { type: "RENAME_NODE"; payload: { nodeId: string; newName: string } }
    | { type: "TOGGLE_DIRECTORY"; payload: { nodeId: string } }
    | { type: "REFRESH_TREE"; payload: { fileTree: TreeNode[] } }
    | { type: "REORDER_TABS"; payload: { fromIndex: number; toIndex: number } };

/**
 * Context value exposed to consumers
 */
export interface WorkspaceContextValue {
    state: WorkspaceState;
    dispatch: React.Dispatch<WorkspaceAction>;

    // File system reference for direct access
    getFileSystem: () => import("@/lib/storage").FileSystem | null;

    // Convenience methods
    openFile: (fileId: string) => Promise<void>;
    closeTab: (tabId: string) => void;
    saveFile: (tabId: string, content: string) => Promise<void>;
    createFile: (parentId: string, name: string) => Promise<void>;
    createDirectory: (parentId: string, name: string) => Promise<void>;
    deleteNode: (nodeId: string) => Promise<void>;
    renameNode: (nodeId: string, newName: string) => Promise<void>;
    toggleDirectory: (nodeId: string) => void;
    refreshTree: () => Promise<void>;
    moveNode: (nodeId: string, newParentId: string) => Promise<void>;
}

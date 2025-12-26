import type { SupportedLanguage } from "@/utils/constants";

export interface FileNode {
    id: string;
    name: string;
    type: "file" | "directory";
    parentId: string | null;
    path: string;
    createdAt: number;
    updatedAt: number;
}

export interface FileContent extends FileNode {
    type: "file";
    content: string;
    language: SupportedLanguage | null;
}

export interface DirectoryNode extends FileNode {
    type: "directory";
    children: string[]; // Array of child IDs
}

export interface Tab {
    id: string;
    fileId: string;
    fileName: string;
    filePath: string;
    isDirty: boolean;
    isActive: boolean;
}

export interface FileSystemState {
    files: Map<string, FileNode>;
    rootId: string;
    openTabs: Tab[];
    activeTabId: string | null;
}

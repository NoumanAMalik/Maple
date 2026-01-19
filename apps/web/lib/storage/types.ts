import type { FileContent, FileNode } from "@/types/file";

export interface FileSystemOperations {
    // File operations
    createFile(parentId: string, name: string, content?: string): Promise<FileContent>;
    readFile(id: string): Promise<FileContent | null>;
    updateFile(id: string, content: string): Promise<void>;
    deleteFile(id: string): Promise<void>;
    renameFile(id: string, newName: string): Promise<void>;

    // Directory operations
    createDirectory(parentId: string, name: string): Promise<FileNode>;
    deleteDirectory(id: string): Promise<void>;
    listDirectory(id: string): Promise<FileNode[]>;

    // Tree operations
    getFileTree(): Promise<FileNode[]>;
    getFileByPath(path: string): Promise<FileNode | null>;
}

export interface StorageConfig {
    dbName: string;
    dbVersion: number;
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
    dbName: "maple-fs",
    dbVersion: 1,
};

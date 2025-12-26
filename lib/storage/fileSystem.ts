import type { FileContent, FileNode } from "@/types/file";
import type { FileSystemOperations } from "./types";
import { IndexedDBStorage } from "./indexedDB";

/**
 * Virtual file system built on IndexedDB.
 * Provides high-level file operations for the editor.
 */
export class FileSystem implements FileSystemOperations {
    private storage: IndexedDBStorage;
    private initialized = false;

    constructor() {
        this.storage = new IndexedDBStorage();
    }

    async init(): Promise<void> {
        if (this.initialized) return;
        await this.storage.init();
        this.initialized = true;
    }

    private generateId(): string {
        return crypto.randomUUID();
    }

    async createFile(parentId: string, name: string, content = ""): Promise<FileContent> {
        const now = Date.now();
        const file: FileContent = {
            id: this.generateId(),
            name,
            type: "file",
            parentId,
            path: `${parentId}/${name}`, // Simplified path
            content,
            language: null,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.put("files", file);
        return file;
    }

    async readFile(id: string): Promise<FileContent | null> {
        const file = await this.storage.get<FileContent>("files", id);
        return file ?? null;
    }

    async updateFile(id: string, content: string): Promise<void> {
        const file = await this.readFile(id);
        if (!file) throw new Error(`File not found: ${id}`);

        file.content = content;
        file.updatedAt = Date.now();
        await this.storage.put("files", file);
    }

    async deleteFile(id: string): Promise<void> {
        await this.storage.delete("files", id);
    }

    async renameFile(id: string, newName: string): Promise<void> {
        const file = await this.storage.get<FileNode>("files", id);
        if (!file) throw new Error(`File not found: ${id}`);

        file.name = newName;
        file.updatedAt = Date.now();
        await this.storage.put("files", file);
    }

    async createDirectory(parentId: string, name: string): Promise<FileNode> {
        const now = Date.now();
        const dir: FileNode = {
            id: this.generateId(),
            name,
            type: "directory",
            parentId,
            path: `${parentId}/${name}`,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.put("files", dir);
        return dir;
    }

    async deleteDirectory(id: string): Promise<void> {
        // TODO: Recursively delete children
        await this.storage.delete("files", id);
    }

    async listDirectory(id: string): Promise<FileNode[]> {
        const allFiles = await this.storage.getAll<FileNode>("files");
        return allFiles.filter((file) => file.parentId === id);
    }

    async getFileTree(): Promise<FileNode[]> {
        return this.storage.getAll<FileNode>("files");
    }

    async getFileByPath(path: string): Promise<FileNode | null> {
        const allFiles = await this.storage.getAll<FileNode>("files");
        return allFiles.find((file) => file.path === path) ?? null;
    }
}

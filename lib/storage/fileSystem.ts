import type { FileContent, FileNode } from "@/types/file";
import type { FileSystemOperations } from "./types";
import type { PersistedTabState } from "@/types/workspace";
import { IndexedDBStorage } from "./indexedDB";
import { FILE_EXTENSIONS, type SupportedLanguage } from "@/utils/constants";

const ROOT_ID = "root";

/**
 * Virtual file system built on IndexedDB.
 * Provides high-level file operations for the editor.
 */
export class FileSystem implements FileSystemOperations {
    public storage: IndexedDBStorage;
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

    /**
     * Get language from file extension
     */
    getLanguageFromFileName(fileName: string): SupportedLanguage | null {
        const lastDot = fileName.lastIndexOf(".");
        if (lastDot === -1) return null;
        const ext = fileName.substring(lastDot);
        return FILE_EXTENSIONS[ext] || null;
    }

    /**
     * Ensure root directory exists, create if not
     */
    async ensureRootDirectory(): Promise<FileNode> {
        let root = await this.storage.get<FileNode>("files", ROOT_ID);

        if (!root) {
            const now = Date.now();
            root = {
                id: ROOT_ID,
                name: "workspace",
                type: "directory",
                parentId: null,
                path: "/",
                createdAt: now,
                updatedAt: now,
            };
            await this.storage.put("files", root);
        }

        return root;
    }

    /**
     * Recursively delete directory and all children
     */
    async deleteDirectoryRecursive(id: string): Promise<void> {
        const children = await this.listDirectory(id);

        // Delete all children first (depth-first)
        for (const child of children) {
            if (child.type === "directory") {
                await this.deleteDirectoryRecursive(child.id);
            } else {
                await this.deleteFile(child.id);
            }
        }

        // Delete the directory itself
        await this.storage.delete("files", id);
    }

    /**
     * Move a node to a new parent
     */
    async moveNode(nodeId: string, newParentId: string): Promise<void> {
        const node = await this.storage.get<FileNode>("files", nodeId);
        if (!node) throw new Error(`Node not found: ${nodeId}`);

        const newParent = await this.storage.get<FileNode>("files", newParentId);
        if (!newParent || newParent.type !== "directory") {
            throw new Error(`Invalid parent: ${newParentId}`);
        }

        // Calculate new path
        const newPath = newParent.path === "/" ? `/${node.name}` : `${newParent.path}/${node.name}`;

        // Check if a file with the same path already exists
        const existingFile = await this.getFileByPath(newPath);
        if (existingFile && existingFile.id !== nodeId) {
            throw new Error(`A file named "${node.name}" already exists in this location`);
        }

        // Update path
        const oldPath = node.path;
        node.parentId = newParentId;
        node.path = newPath;
        node.updatedAt = Date.now();

        await this.storage.put("files", node);

        // If directory, recursively update children paths
        if (node.type === "directory") {
            await this.updateChildrenPaths(nodeId, oldPath, node.path);
        }
    }

    /**
     * Helper to recursively update children paths after move
     */
    private async updateChildrenPaths(parentId: string, oldParentPath: string, newParentPath: string): Promise<void> {
        const children = await this.listDirectory(parentId);

        for (const child of children) {
            child.path = child.path.replace(oldParentPath, newParentPath);
            child.updatedAt = Date.now();
            await this.storage.put("files", child);

            if (child.type === "directory") {
                await this.updateChildrenPaths(child.id, oldParentPath, newParentPath);
            }
        }
    }

    async createFile(parentId: string, name: string, content = ""): Promise<FileContent> {
        const now = Date.now();
        const parent = await this.storage.get<FileNode>("files", parentId);
        const path = parent?.path === "/" ? `/${name}` : `${parent?.path || ""}/${name}`;

        // Check for duplicate path
        const existingFile = await this.getFileByPath(path);
        if (existingFile) {
            throw new Error(`A file named "${name}" already exists in this location`);
        }

        const file: FileContent = {
            id: this.generateId(),
            name,
            type: "file",
            parentId,
            path,
            content,
            language: this.getLanguageFromFileName(name),
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
        const parent = await this.storage.get<FileNode>("files", parentId);
        const path = parent?.path === "/" ? `/${name}` : `${parent?.path || ""}/${name}`;

        // Check for duplicate path
        const existingFile = await this.getFileByPath(path);
        if (existingFile) {
            throw new Error(`A folder named "${name}" already exists in this location`);
        }

        const dir: FileNode = {
            id: this.generateId(),
            name,
            type: "directory",
            parentId,
            path,
            createdAt: now,
            updatedAt: now,
        };

        await this.storage.put("files", dir);
        return dir;
    }

    async deleteDirectory(id: string): Promise<void> {
        await this.deleteDirectoryRecursive(id);
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

    async saveTabState(tabOrder: string[], activeFileId: string | null): Promise<void> {
        const state: PersistedTabState = {
            id: "__tab_state__",
            version: 1,
            tabOrder,
            activeFileId,
            updatedAt: Date.now(),
        };
        await this.storage.put("files", state);
    }

    async loadTabState(): Promise<PersistedTabState | null> {
        const state = await this.storage.get<PersistedTabState>("files", "__tab_state__");
        if (!state) return null;
        if (state.version !== 1) return null;
        return state;
    }

    /** Get a file/directory node by ID (for testing) */
    async getNodeById(id: string): Promise<FileNode | null> {
        return this.storage.get<FileNode>("files", id);
    }

    /** Get all children of a directory (for testing) */
    async getChildren(id: string): Promise<FileNode[]> {
        return this.listDirectory(id);
    }
}

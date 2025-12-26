import { DEFAULT_STORAGE_CONFIG, type StorageConfig } from "./types";

/**
 * IndexedDB wrapper for file persistence.
 * Provides low-level database operations for the file system.
 */
export class IndexedDBStorage {
    private db: IDBDatabase | null = null;
    private config: StorageConfig;

    constructor(config: Partial<StorageConfig> = {}) {
        this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    }

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create files store
                if (!db.objectStoreNames.contains("files")) {
                    const filesStore = db.createObjectStore("files", { keyPath: "id" });
                    filesStore.createIndex("path", "path", { unique: true });
                    filesStore.createIndex("parentId", "parentId", { unique: false });
                }
            };
        });
    }

    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // Placeholder methods - to be implemented
    async get<T>(storeName: string, key: string): Promise<T | undefined> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async put<T>(storeName: string, value: T): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.put(value);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async delete(storeName: string, key: string): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async getAll<T>(storeName: string): Promise<T[]> {
        if (!this.db) throw new Error("Database not initialized");

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

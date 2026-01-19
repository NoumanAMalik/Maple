import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IndexedDBStorage } from "./indexedDB";
import "fake-indexeddb/auto";

interface TestData {
    id: string;
    name: string;
    value: number;
}

describe("IndexedDBStorage", () => {
    let storage: IndexedDBStorage;

    beforeEach(async () => {
        storage = new IndexedDBStorage({ dbName: "test-db", dbVersion: 1 });
        await storage.init();
    });

    afterEach(async () => {
        await storage.close();
    });

    describe("Initialization", () => {
        it("should initialize successfully", async () => {
            const newStorage = new IndexedDBStorage();
            await newStorage.init();
            expect(newStorage).toBeDefined();
            await newStorage.close();
        });

        it("should not reinitialize if already initialized", async () => {
            await storage.init();
        });
    });

    describe("CRUD Operations", () => {
        it("should put a value", async () => {
            const data: TestData = { id: "test-1", name: "test", value: 42 };

            await storage.put("files", data);

            expect(data.id).toBe("test-1");
        });

        it("should get a value", async () => {
            const data: TestData = { id: "test-1", name: "test", value: 42 };
            await storage.put("files", data);

            const retrieved = await storage.get<TestData>("files", "test-1");

            expect(retrieved).not.toBeUndefined();
            expect(retrieved?.id).toBe("test-1");
            expect(retrieved?.name).toBe("test");
            expect(retrieved?.value).toBe(42);
        });

        it("should return undefined for non-existent key", async () => {
            const retrieved = await storage.get<TestData>("files", "non-existent");

            expect(retrieved).toBeUndefined();
        });

        it("should delete a value", async () => {
            const data: TestData = { id: "test-1", name: "test", value: 42 };
            await storage.put("files", data);

            await storage.delete("files", "test-1");

            const retrieved = await storage.get<TestData>("files", "test-1");
            expect(retrieved).toBeUndefined();
        });

        it("should get all values", async () => {
            const data1: TestData = { id: "test-1", name: "test1", value: 1 };
            const data2: TestData = { id: "test-2", name: "test2", value: 2 };
            const data3: TestData = { id: "test-3", name: "test3", value: 3 };

            await storage.put("files", data1);
            await storage.put("files", data2);
            await storage.put("files", data3);

            const all = await storage.getAll<TestData>("files");

            expect(all.length).toBeGreaterThanOrEqual(3);
        });

        it("should get all values from empty store", async () => {
            const newStorage = new IndexedDBStorage({ dbName: "empty-db", dbVersion: 1 });
            await newStorage.init();

            const all = await newStorage.getAll<TestData>("files");

            expect(all.length).toBe(0);
            await newStorage.close();
        });
    });

    describe("Update Operations", () => {
        it("should update existing value", async () => {
            const data: TestData = { id: "test-1", name: "test", value: 42 };
            await storage.put("files", data);

            const updatedData: TestData = { id: "test-1", name: "updated", value: 100 };
            await storage.put("files", updatedData);

            const retrieved = await storage.get<TestData>("files", "test-1");
            expect(retrieved?.name).toBe("updated");
            expect(retrieved?.value).toBe(100);
        });
    });

    describe("Error Handling", () => {
        it("should throw error when database not initialized", async () => {
            const uninitializedStorage = new IndexedDBStorage();

            await expect(uninitializedStorage.get("files", "key")).rejects.toThrow("Database not initialized");
        });

        it("should throw error when putting to uninitialized database", async () => {
            const uninitializedStorage = new IndexedDBStorage();

            await expect(uninitializedStorage.put("files", { id: "1", name: "test", value: 1 })).rejects.toThrow(
                "Database not initialized",
            );
        });

        it("should throw error when deleting from uninitialized database", async () => {
            const uninitializedStorage = new IndexedDBStorage();

            await expect(uninitializedStorage.delete("files", "key")).rejects.toThrow("Database not initialized");
        });

        it("should throw error when getting all from uninitialized database", async () => {
            const uninitializedStorage = new IndexedDBStorage();

            await expect(uninitializedStorage.getAll("files")).rejects.toThrow("Database not initialized");
        });
    });

    describe("Multiple Databases", () => {
        it("should handle multiple databases", async () => {
            const storage1 = new IndexedDBStorage({ dbName: "db1", dbVersion: 1 });
            const storage2 = new IndexedDBStorage({ dbName: "db2", dbVersion: 1 });

            await storage1.init();
            await storage2.init();

            await storage1.put("files", { id: "test-1", name: "from-db1", value: 1 });
            await storage2.put("files", { id: "test-1", name: "from-db2", value: 2 });

            const fromStorage1 = await storage1.get<{ id: string; name: string; value: number }>("files", "test-1");
            const fromStorage2 = await storage2.get<{ id: string; name: string; value: number }>("files", "test-1");

            expect(fromStorage1?.name).toBe("from-db1");
            expect(fromStorage2?.name).toBe("from-db2");

            await storage1.close();
            await storage2.close();
        });
    });

    describe("Close", () => {
        it("should close the database", async () => {
            await storage.close();
        });

        it("should handle multiple close calls", async () => {
            await storage.close();
            await storage.close();
        });
    });

    describe("Complex Data Types", () => {
        it("should store objects with nested structures", async () => {
            const nestedData = {
                id: "nested-1",
                name: "test",
                nested: {
                    level1: {
                        level2: {
                            value: 42,
                        },
                    },
                },
                array: [1, 2, 3],
            };

            await storage.put("files", nestedData);

            const retrieved = await storage.get<typeof nestedData>("files", "nested-1");

            expect(retrieved?.nested.level1.level2.value).toBe(42);
            expect(retrieved?.array).toEqual([1, 2, 3]);
        });

        it("should store Date objects", async () => {
            const date = new Date();
            const data = { id: "date-1", name: "test", timestamp: date };

            await storage.put("files", data);

            const retrieved = await storage.get<{ id: string; name: string; timestamp: Date }>("files", "date-1");

            expect(retrieved?.timestamp.getTime()).toBe(date.getTime());
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty string as key", async () => {
            const data: TestData = { id: "", name: "test", value: 42 };

            await storage.put("files", data);

            const retrieved = await storage.get<TestData>("files", "");
            expect(retrieved).not.toBeUndefined();
        });

        it("should handle very large values", async () => {
            const largeValue = "x".repeat(10000);
            const data = { id: "large-1", name: largeValue, value: 1 };

            await storage.put("files", data);

            const retrieved = await storage.get<typeof data>("files", "large-1");
            expect(retrieved?.name.length).toBe(10000);
        });

        it("should handle unicode characters", async () => {
            const data: TestData & { description: string } = {
                id: "unicode-1",
                name: "测试",
                value: 42,
                description: "Hello 世界 🌍",
            };

            await storage.put("files", data);

            const retrieved = await storage.get<typeof data>("files", "unicode-1");
            expect(retrieved?.name).toBe("测试");
            expect(retrieved?.description).toBe("Hello 世界 🌍");
        });
    });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystem } from "./fileSystem";
import type { FileNode } from "@/types/file";
import "fake-indexeddb/auto";

describe("FileSystem", () => {
    let fs: FileSystem;

    beforeEach(async () => {
        fs = new FileSystem();
        await fs.init();
        await fs.ensureRootDirectory();
    });

    afterEach(async () => {
        // Clean up all files
        const files = await fs.getFileTree();
        for (const file of files) {
            if (file.id !== "root") {
                await fs.storage.delete("files", file.id);
            }
        }
    });

    describe("Initialization", () => {
        it("should initialize the file system", async () => {
            const root = await fs.ensureRootDirectory();
            expect(root).toBeDefined();
            expect(root.id).toBe("root");
            expect(root.name).toBe("workspace");
            expect(root.type).toBe("directory");
        });

        it("should not recreate root on multiple calls", async () => {
            const root1 = await fs.ensureRootDirectory();
            const root2 = await fs.ensureRootDirectory();
            expect(root1.createdAt).toBe(root2.createdAt);
        });
    });

    describe("File Operations", () => {
        it("should create a file", async () => {
            const file = await fs.createFile("root", "test.ts", "const x = 1;");

            expect(file.name).toBe("test.ts");
            expect(file.content).toBe("const x = 1;");
            expect(file.language).toBe("typescript");
            expect(file.path).toBe("/test.ts");
        });

        it("should read a file", async () => {
            const created = await fs.createFile("root", "test.ts", "hello");
            const read = await fs.readFile(created.id);

            expect(read).toBeDefined();
            expect(read?.content).toBe("hello");
        });

        it("should return null for non-existent file", async () => {
            const file = await fs.readFile("non-existent");
            expect(file).toBeNull();
        });

        it("should update file content", async () => {
            const file = await fs.createFile("root", "test.ts", "old");
            await fs.updateFile(file.id, "new");

            const updated = await fs.readFile(file.id);
            expect(updated?.content).toBe("new");
        });

        it("should delete a file", async () => {
            const file = await fs.createFile("root", "test.ts");
            await fs.deleteFile(file.id);

            const deleted = await fs.readFile(file.id);
            expect(deleted).toBeNull();
        });

        it("should rename a file", async () => {
            const file = await fs.createFile("root", "old.ts");
            await fs.renameFile(file.id, "new.ts");

            const renamed = await fs.readFile(file.id);
            expect(renamed?.name).toBe("new.ts");
        });

        it("should throw error when updating non-existent file", async () => {
            await expect(fs.updateFile("non-existent", "content")).rejects.toThrow();
        });

        it("should prevent duplicate file names in same directory", async () => {
            await fs.createFile("root", "duplicate.ts");
            await expect(fs.createFile("root", "duplicate.ts")).rejects.toThrow(
                "already exists",
            );
        });
    });

    describe("Directory Operations", () => {
        it("should create a directory", async () => {
            const dir = await fs.createDirectory("root", "src");

            expect(dir.name).toBe("src");
            expect(dir.type).toBe("directory");
            expect(dir.path).toBe("/src");
        });

        it("should list directory contents", async () => {
            await fs.createFile("root", "file1.ts");
            await fs.createFile("root", "file2.ts");
            await fs.createDirectory("root", "dir1");

            const contents = await fs.listDirectory("root");
            expect(contents.length).toBe(3);
        });

        it("should delete empty directory", async () => {
            const dir = await fs.createDirectory("root", "empty");
            await fs.deleteDirectory(dir.id);

            const children = await fs.listDirectory("root");
            expect(children.find((c) => c.id === dir.id)).toBeUndefined();
        });

        it("should recursively delete directory with contents", async () => {
            const dir = await fs.createDirectory("root", "parent");
            await fs.createFile(dir.id, "child.ts");
            await fs.createDirectory(dir.id, "subdir");

            await fs.deleteDirectory(dir.id);

            const contents = await fs.listDirectory("root");
            expect(contents.find((c) => c.id === dir.id)).toBeUndefined();
        });

        it("should prevent duplicate directory names", async () => {
            await fs.createDirectory("root", "duplicate");
            await expect(fs.createDirectory("root", "duplicate")).rejects.toThrow(
                "already exists",
            );
        });
    });

    describe("Path Operations", () => {
        it("should get file by path", async () => {
            const file = await fs.createFile("root", "test.ts");
            const found = await fs.getFileByPath("/test.ts");

            expect(found?.id).toBe(file.id);
        });

        it("should return null for non-existent path", async () => {
            const file = await fs.getFileByPath("/non-existent.ts");
            expect(file).toBeNull();
        });

        it("should create nested directory paths correctly", async () => {
            const dir1 = await fs.createDirectory("root", "level1");
            const dir2 = await fs.createDirectory(dir1.id, "level2");
            const file = await fs.createFile(dir2.id, "nested.ts");

            expect(file.path).toBe("/level1/level2/nested.ts");
        });
    });

    describe("Move Operations", () => {
        it("should move file to different directory", async () => {
            const dir = await fs.createDirectory("root", "target");
            const file = await fs.createFile("root", "move.ts");

            await fs.moveNode(file.id, dir.id);

            const moved = await fs.readFile(file.id);
            expect(moved?.parentId).toBe(dir.id);
            expect(moved?.path).toBe("/target/move.ts");
        });

        it("should move directory with contents", async () => {
            const source = await fs.createDirectory("root", "source");
            const target = await fs.createDirectory("root", "target");
            await fs.createFile(source.id, "file.ts");

            await fs.moveNode(source.id, target.id);

            const moved = await fs.storage.get<FileNode>("files", source.id);
            expect(moved?.path).toBe("/target/source");
        });

        it("should throw error when moving to invalid parent", async () => {
            const file = await fs.createFile("root", "test.ts");
            await expect(fs.moveNode(file.id, "invalid-parent")).rejects.toThrow();
        });

        it("should throw error when moving to location with duplicate name", async () => {
            const dir = await fs.createDirectory("root", "target");
            await fs.createFile(dir.id, "duplicate.ts");
            const file = await fs.createFile("root", "duplicate.ts");

            await expect(fs.moveNode(file.id, dir.id)).rejects.toThrow("already exists");
        });
    });

    describe("Language Detection", () => {
        it("should detect TypeScript", async () => {
            const file = await fs.createFile("root", "file.ts");
            expect(file.language).toBe("typescript");
        });

        it("should detect JavaScript", async () => {
            const file = await fs.createFile("root", "file.js");
            expect(file.language).toBe("javascript");
        });

        it("should detect CSS", async () => {
            const file = await fs.createFile("root", "file.css");
            expect(file.language).toBe("css");
        });

        it("should return null for unknown extension", async () => {
            const file = await fs.createFile("root", "README.md");
            expect(file.language).toBe("markdown");
        });
    });

    describe("Tab State Persistence", () => {
        it("should save and load tab state", async () => {
            const file1 = await fs.createFile("root", "file1.ts");
            const file2 = await fs.createFile("root", "file2.ts");

            await fs.saveTabState([file1.id, file2.id], file1.id);

            const state = await fs.loadTabState();
            expect(state).toBeDefined();
            expect(state?.tabOrder).toEqual([file1.id, file2.id]);
            expect(state?.activeFileId).toBe(file1.id);
        });

        it("should return null when no tab state exists", async () => {
            const state = await fs.loadTabState();
            expect(state).toBeNull();
        });

        it("should update existing tab state", async () => {
            const file = await fs.createFile("root", "file.ts");
            await fs.saveTabState([file.id], file.id);
            await fs.saveTabState([], null);

            const state = await fs.loadTabState();
            expect(state?.tabOrder).toEqual([]);
            expect(state?.activeFileId).toBeNull();
        });
    });

    describe("File Tree", () => {
        it("should get complete file tree", async () => {
            await fs.createFile("root", "file1.ts");
            await fs.createDirectory("root", "dir1");

            const tree = await fs.getFileTree();
            expect(tree.length).toBeGreaterThanOrEqual(3); // root + file + dir
        });

        it("should include all nested items in tree", async () => {
            const dir = await fs.createDirectory("root", "parent");
            await fs.createFile(dir.id, "child.ts");

            const tree = await fs.getFileTree();
            const childFile = tree.find((n) => n.name === "child.ts");
            expect(childFile).toBeDefined();
        });
    });

    describe("Edge Cases", () => {
        it("should handle files with no extension", async () => {
            const file = await fs.createFile("root", "README");
            expect(file.language).toBeNull();
        });

        it("should handle empty file content", async () => {
            const file = await fs.createFile("root", "empty.ts", "");
            expect(file.content).toBe("");
        });

        it("should handle very long file content", async () => {
            const longContent = "x".repeat(100000);
            const file = await fs.createFile("root", "long.ts", longContent);
            const read = await fs.readFile(file.id);
            expect(read?.content.length).toBe(100000);
        });

        it("should handle special characters in file names", async () => {
            const file = await fs.createFile("root", "file-name_with.special$chars.ts");
            expect(file.name).toBe("file-name_with.special$chars.ts");
        });

        it("should update timestamps on operations", async () => {
            const file = await fs.createFile("root", "test.ts");
            const originalTime = file.updatedAt;

            // Wait a tiny bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 10));

            await fs.updateFile(file.id, "new content");
            const updated = await fs.readFile(file.id);

            expect(updated?.updatedAt).toBeGreaterThan(originalTime);
        });
    });
});

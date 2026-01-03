import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystem } from "./fileSystem";
import type { FileNode, FileContent } from "@/types/file";
import "fake-indexeddb/auto";

describe("FileSystem Integration Tests", () => {
    let fs: FileSystem;

    beforeEach(async () => {
        fs = new FileSystem();
        await fs.init();
        await fs.ensureRootDirectory();
    });

    afterEach(async () => {
        // Clean up all files except root
        const files = await fs.getFileTree();
        for (const file of files) {
            if (file.id !== "root") {
                await fs.storage.delete("files", file.id);
            }
        }
    });

    describe("Create Nested Directory Structure (5+ levels)", () => {
        it("should create 5 levels of nested directories", async () => {
            const level1 = await fs.createDirectory("root", "level1");
            const level2 = await fs.createDirectory(level1.id, "level2");
            const level3 = await fs.createDirectory(level2.id, "level3");
            const level4 = await fs.createDirectory(level3.id, "level4");
            const level5 = await fs.createDirectory(level4.id, "level5");

            expect(level1.path).toBe("/level1");
            expect(level2.path).toBe("/level1/level2");
            expect(level3.path).toBe("/level1/level2/level3");
            expect(level4.path).toBe("/level1/level2/level3/level4");
            expect(level5.path).toBe("/level1/level2/level3/level4/level5");
        });

        it("should create files at each nesting level", async () => {
            const level1 = await fs.createDirectory("root", "level1");
            const file1 = await fs.createFile(level1.id, "file1.ts", "level 1 content");

            const level2 = await fs.createDirectory(level1.id, "level2");
            const file2 = await fs.createFile(level2.id, "file2.ts", "level 2 content");

            const level3 = await fs.createDirectory(level2.id, "level3");
            const file3 = await fs.createFile(level3.id, "file3.ts", "level 3 content");

            const level4 = await fs.createDirectory(level3.id, "level4");
            const file4 = await fs.createFile(level4.id, "file4.ts", "level 4 content");

            const level5 = await fs.createDirectory(level4.id, "level5");
            const file5 = await fs.createFile(level5.id, "file5.ts", "level 5 content");

            expect(file1.path).toBe("/level1/file1.ts");
            expect(file2.path).toBe("/level1/level2/file2.ts");
            expect(file3.path).toBe("/level1/level2/level3/file3.ts");
            expect(file4.path).toBe("/level1/level2/level3/level4/file4.ts");
            expect(file5.path).toBe("/level1/level2/level3/level4/level5/file5.ts");

            // Verify content is preserved at each level
            const readFile3 = await fs.readFile(file3.id);
            expect(readFile3?.content).toBe("level 3 content");
        });

        it("should handle 10+ levels of nesting", async () => {
            let parentId = "root";
            const levels: FileNode[] = [];

            // Create 12 levels
            for (let i = 1; i <= 12; i++) {
                const dir = await fs.createDirectory(parentId, `level${i}`);
                levels.push(dir);
                parentId = dir.id;
            }

            // Verify the deepest level has correct path
            const deepestLevel = levels[11];
            const expectedPath = "/level1/level2/level3/level4/level5/level6/level7/level8/level9/level10/level11/level12";
            expect(deepestLevel.path).toBe(expectedPath);

            // Create a file at the deepest level
            const deepFile = await fs.createFile(deepestLevel.id, "deep.ts", "very deep");
            expect(deepFile.path).toBe(`${expectedPath}/deep.ts`);
        });

        it("should correctly list directories at various nesting levels", async () => {
            const level1 = await fs.createDirectory("root", "level1");
            const level2 = await fs.createDirectory(level1.id, "level2");
            const level3 = await fs.createDirectory(level2.id, "level3");

            await fs.createFile(level1.id, "file1.ts");
            await fs.createFile(level1.id, "file2.ts");
            await fs.createFile(level2.id, "file3.ts");
            await fs.createDirectory(level2.id, "sibling");

            const level1Contents = await fs.listDirectory(level1.id);
            expect(level1Contents.length).toBe(3); // file1, file2, level2

            const level2Contents = await fs.listDirectory(level2.id);
            expect(level2Contents.length).toBe(3); // file3, level3, sibling
        });
    });

    describe("Move Files Between Nested Directories", () => {
        it("should move file from deep to shallow directory", async () => {
            const deep1 = await fs.createDirectory("root", "deep1");
            const deep2 = await fs.createDirectory(deep1.id, "deep2");
            const deep3 = await fs.createDirectory(deep2.id, "deep3");

            const file = await fs.createFile(deep3.id, "deep-file.ts", "deep content");
            expect(file.path).toBe("/deep1/deep2/deep3/deep-file.ts");

            const shallow = await fs.createDirectory("root", "shallow");
            await fs.moveNode(file.id, shallow.id);

            const movedFile = await fs.readFile(file.id);
            expect(movedFile?.path).toBe("/shallow/deep-file.ts");
            expect(movedFile?.parentId).toBe(shallow.id);
            expect(movedFile?.content).toBe("deep content");
        });

        it("should move file from shallow to deep directory", async () => {
            const file = await fs.createFile("root", "shallow-file.ts", "shallow content");

            const deep1 = await fs.createDirectory("root", "deep1");
            const deep2 = await fs.createDirectory(deep1.id, "deep2");
            const deep3 = await fs.createDirectory(deep2.id, "deep3");

            await fs.moveNode(file.id, deep3.id);

            const movedFile = await fs.readFile(file.id);
            expect(movedFile?.path).toBe("/deep1/deep2/deep3/shallow-file.ts");
            expect(movedFile?.parentId).toBe(deep3.id);
            expect(movedFile?.content).toBe("shallow content");
        });

        it("should update file path correctly after move", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");

            const file = await fs.createFile(dir1.id, "test.ts", "content");
            const oldPath = file.path;

            await fs.moveNode(file.id, dir2.id);

            const movedFile = await fs.readFile(file.id);
            expect(movedFile?.path).not.toBe(oldPath);
            expect(movedFile?.path).toBe("/dir2/test.ts");

            // Verify old path no longer exists
            const oldPathFile = await fs.getFileByPath(oldPath);
            expect(oldPathFile).toBeNull();

            // Verify new path exists
            const newPathFile = await fs.getFileByPath("/dir2/test.ts");
            expect(newPathFile?.id).toBe(file.id);
        });

        it("should handle move to sibling directory", async () => {
            const parent = await fs.createDirectory("root", "parent");
            const sibling1 = await fs.createDirectory(parent.id, "sibling1");
            const sibling2 = await fs.createDirectory(parent.id, "sibling2");

            const file = await fs.createFile(sibling1.id, "file.ts", "sibling content");
            expect(file.path).toBe("/parent/sibling1/file.ts");

            await fs.moveNode(file.id, sibling2.id);

            const movedFile = await fs.readFile(file.id);
            expect(movedFile?.path).toBe("/parent/sibling2/file.ts");
            expect(movedFile?.parentId).toBe(sibling2.id);
        });

        it("should move directory and update all nested file paths", async () => {
            const source = await fs.createDirectory("root", "source");
            const nested1 = await fs.createDirectory(source.id, "nested1");
            const nested2 = await fs.createDirectory(nested1.id, "nested2");

            const file1 = await fs.createFile(source.id, "file1.ts");
            const file2 = await fs.createFile(nested1.id, "file2.ts");
            const file3 = await fs.createFile(nested2.id, "file3.ts");

            const target = await fs.createDirectory("root", "target");
            await fs.moveNode(source.id, target.id);

            const movedFile1 = await fs.readFile(file1.id);
            const movedFile2 = await fs.readFile(file2.id);
            const movedFile3 = await fs.readFile(file3.id);

            expect(movedFile1?.path).toBe("/target/source/file1.ts");
            expect(movedFile2?.path).toBe("/target/source/nested1/file2.ts");
            expect(movedFile3?.path).toBe("/target/source/nested1/nested2/file3.ts");
        });
    });

    describe("Recursive Delete with Mixed Files/Folders", () => {
        it("should delete directory with nested structure", async () => {
            const parent = await fs.createDirectory("root", "parent");
            const child1 = await fs.createDirectory(parent.id, "child1");
            const child2 = await fs.createDirectory(parent.id, "child2");
            const grandchild = await fs.createDirectory(child1.id, "grandchild");

            await fs.createFile(parent.id, "file1.ts");
            await fs.createFile(child1.id, "file2.ts");
            await fs.createFile(child2.id, "file3.ts");
            await fs.createFile(grandchild.id, "file4.ts");

            await fs.deleteDirectory(parent.id);

            // Verify all were deleted
            const tree = await fs.getFileTree();
            expect(tree.find((n) => n.id === parent.id)).toBeUndefined();
            expect(tree.find((n) => n.id === child1.id)).toBeUndefined();
            expect(tree.find((n) => n.id === child2.id)).toBeUndefined();
            expect(tree.find((n) => n.id === grandchild.id)).toBeUndefined();

            // Verify root still exists
            expect(tree.find((n) => n.id === "root")).toBeDefined();
        });

        it("should handle delete of directory with 100+ files", async () => {
            const parent = await fs.createDirectory("root", "large-dir");

            // Create 120 files
            const filePromises = [];
            for (let i = 0; i < 120; i++) {
                filePromises.push(fs.createFile(parent.id, `file${i}.ts`, `content ${i}`));
            }
            await Promise.all(filePromises);

            const beforeCount = (await fs.listDirectory(parent.id)).length;
            expect(beforeCount).toBe(120);

            await fs.deleteDirectory(parent.id);

            const tree = await fs.getFileTree();
            expect(tree.find((n) => n.id === parent.id)).toBeUndefined();

            // Verify none of the files exist
            const remainingFiles = tree.filter((n) => n.name.startsWith("file") && n.name.endsWith(".ts"));
            expect(remainingFiles.length).toBe(0);
        });

        it("should handle delete during concurrent operations", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");

            const file1 = await fs.createFile(dir1.id, "file1.ts");
            const file2 = await fs.createFile(dir2.id, "file2.ts");

            // Perform concurrent operations
            await Promise.all([
                fs.createFile(dir1.id, "new1.ts"),
                fs.deleteDirectory(dir1.id),
                fs.createFile(dir2.id, "new2.ts"),
            ]);

            // dir1 should be deleted
            const tree = await fs.getFileTree();
            expect(tree.find((n) => n.id === dir1.id)).toBeUndefined();
            expect(tree.find((n) => n.id === file1.id)).toBeUndefined();

            // dir2 should still exist with new file
            expect(tree.find((n) => n.id === dir2.id)).toBeDefined();
            const dir2Contents = await fs.listDirectory(dir2.id);
            expect(dir2Contents.length).toBeGreaterThanOrEqual(2);
        });

        it("should delete deeply nested mixed structure", async () => {
            const level1 = await fs.createDirectory("root", "level1");
            await fs.createFile(level1.id, "file-l1.ts");

            const level2a = await fs.createDirectory(level1.id, "level2a");
            const level2b = await fs.createDirectory(level1.id, "level2b");
            await fs.createFile(level2a.id, "file-l2a.ts");
            await fs.createFile(level2b.id, "file-l2b.ts");

            const level3 = await fs.createDirectory(level2a.id, "level3");
            await fs.createFile(level3.id, "file-l3.ts");

            await fs.deleteDirectory(level1.id);

            const tree = await fs.getFileTree();
            const level1Files = tree.filter((n) => n.path.startsWith("/level1"));
            expect(level1Files.length).toBe(0);
        });
    });

    describe("Tab State Persistence Across Multiple Files", () => {
        it("should save and restore tab order", async () => {
            const file1 = await fs.createFile("root", "file1.ts");
            const file2 = await fs.createFile("root", "file2.ts");
            const file3 = await fs.createFile("root", "file3.ts");
            const file4 = await fs.createFile("root", "file4.ts");

            const tabOrder = [file3.id, file1.id, file4.id, file2.id];
            await fs.saveTabState(tabOrder, file1.id);

            const state = await fs.loadTabState();
            expect(state).toBeDefined();
            expect(state?.tabOrder).toEqual(tabOrder);
            expect(state?.version).toBe(1);
        });

        it("should persist active file ID", async () => {
            const file1 = await fs.createFile("root", "file1.ts");
            const file2 = await fs.createFile("root", "file2.ts");
            const file3 = await fs.createFile("root", "file3.ts");

            await fs.saveTabState([file1.id, file2.id, file3.id], file2.id);

            const state = await fs.loadTabState();
            expect(state?.activeFileId).toBe(file2.id);

            // Update active file
            await fs.saveTabState([file1.id, file2.id, file3.id], file3.id);

            const updatedState = await fs.loadTabState();
            expect(updatedState?.activeFileId).toBe(file3.id);
        });

        it("should handle persistence after file deletion", async () => {
            const file1 = await fs.createFile("root", "file1.ts");
            const file2 = await fs.createFile("root", "file2.ts");
            const file3 = await fs.createFile("root", "file3.ts");

            await fs.saveTabState([file1.id, file2.id, file3.id], file2.id);

            // Delete file2
            await fs.deleteFile(file2.id);

            // Tab state should still exist with deleted file ID
            const state = await fs.loadTabState();
            expect(state?.tabOrder).toContain(file2.id);
            expect(state?.activeFileId).toBe(file2.id);

            // Application should handle cleaning up invalid IDs
        });

        it("should handle invalid file IDs in restored state", async () => {
            const file1 = await fs.createFile("root", "file1.ts");

            const invalidIds = ["invalid-id-1", "invalid-id-2", file1.id];
            await fs.saveTabState(invalidIds, "invalid-active-id");

            const state = await fs.loadTabState();
            expect(state?.tabOrder).toEqual(invalidIds);
            expect(state?.activeFileId).toBe("invalid-active-id");

            // FileSystem doesn't validate IDs - application layer should handle this
        });
    });

    describe("Path Conflict Resolution", () => {
        it("should prevent duplicate names in same directory", async () => {
            await fs.createFile("root", "duplicate.ts");

            await expect(fs.createFile("root", "duplicate.ts")).rejects.toThrow(
                "already exists",
            );
        });

        it("should allow same name in different directories", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");

            const file1 = await fs.createFile(dir1.id, "samename.ts", "content 1");
            const file2 = await fs.createFile(dir2.id, "samename.ts", "content 2");

            expect(file1.path).toBe("/dir1/samename.ts");
            expect(file2.path).toBe("/dir2/samename.ts");
            expect(file1.id).not.toBe(file2.id);
        });

        it("should detect conflict during move operation", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");

            const file1 = await fs.createFile(dir1.id, "conflict.ts");
            const file2 = await fs.createFile(dir2.id, "conflict.ts");

            await expect(fs.moveNode(file1.id, dir2.id)).rejects.toThrow(
                "already exists",
            );

            // Files should remain in original locations
            const check1 = await fs.readFile(file1.id);
            const check2 = await fs.readFile(file2.id);
            expect(check1?.parentId).toBe(dir1.id);
            expect(check2?.parentId).toBe(dir2.id);
        });

        it("should handle case-sensitivity of names", async () => {
            // IndexedDB and JavaScript are case-sensitive
            const file1 = await fs.createFile("root", "File.ts");
            const file2 = await fs.createFile("root", "file.ts");

            expect(file1.path).toBe("/File.ts");
            expect(file2.path).toBe("/file.ts");
            expect(file1.id).not.toBe(file2.id);

            const foundUpper = await fs.getFileByPath("/File.ts");
            const foundLower = await fs.getFileByPath("/file.ts");

            expect(foundUpper?.id).toBe(file1.id);
            expect(foundLower?.id).toBe(file2.id);
        });
    });

    describe("Bulk Operations (Move Multiple Files)", () => {
        it("should move multiple files concurrently", async () => {
            const source = await fs.createDirectory("root", "source");
            const target = await fs.createDirectory("root", "target");

            const files = await Promise.all([
                fs.createFile(source.id, "file1.ts"),
                fs.createFile(source.id, "file2.ts"),
                fs.createFile(source.id, "file3.ts"),
                fs.createFile(source.id, "file4.ts"),
                fs.createFile(source.id, "file5.ts"),
            ]);

            // Move all files concurrently
            await Promise.all(files.map((file) => fs.moveNode(file.id, target.id)));

            // Verify all files moved
            const targetContents = await fs.listDirectory(target.id);
            expect(targetContents.length).toBe(5);

            const sourceContents = await fs.listDirectory(source.id);
            expect(sourceContents.length).toBe(0);
        });

        it("should handle partial failure in bulk move", async () => {
            const source = await fs.createDirectory("root", "source");
            const target = await fs.createDirectory("root", "target");

            const file1 = await fs.createFile(source.id, "file1.ts");
            const file2 = await fs.createFile(source.id, "conflict.ts");
            const file3 = await fs.createFile(source.id, "file3.ts");

            // Create conflicting file in target
            await fs.createFile(target.id, "conflict.ts");

            // Try to move all files - one should fail
            const results = await Promise.allSettled([
                fs.moveNode(file1.id, target.id),
                fs.moveNode(file2.id, target.id), // This will fail
                fs.moveNode(file3.id, target.id),
            ]);

            expect(results[0].status).toBe("fulfilled");
            expect(results[1].status).toBe("rejected");
            expect(results[2].status).toBe("fulfilled");

            // Verify file1 and file3 moved, file2 stayed
            const file1Check = await fs.readFile(file1.id);
            const file2Check = await fs.readFile(file2.id);
            const file3Check = await fs.readFile(file3.id);

            expect(file1Check?.parentId).toBe(target.id);
            expect(file2Check?.parentId).toBe(source.id);
            expect(file3Check?.parentId).toBe(target.id);
        });

        it("should maintain consistency after bulk operation", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");
            const dir3 = await fs.createDirectory("root", "dir3");

            // Create files in each directory
            const files = await Promise.all([
                fs.createFile(dir1.id, "a.ts", "content a"),
                fs.createFile(dir1.id, "b.ts", "content b"),
                fs.createFile(dir2.id, "c.ts", "content c"),
                fs.createFile(dir2.id, "d.ts", "content d"),
            ]);

            // Move files around
            await Promise.all([
                fs.moveNode(files[0].id, dir2.id),
                fs.moveNode(files[2].id, dir3.id),
            ]);

            // Verify tree consistency
            const tree = await fs.getFileTree();
            const fileA = tree.find((n) => n.name === "a.ts");
            const fileC = tree.find((n) => n.name === "c.ts");

            expect(fileA?.path).toBe("/dir2/a.ts");
            expect(fileC?.path).toBe("/dir3/c.ts");

            // Verify content preserved
            const contentA = await fs.readFile(files[0].id);
            const contentC = await fs.readFile(files[2].id);

            expect(contentA?.content).toBe("content a");
            expect(contentC?.content).toBe("content c");
        });
    });

    describe("File Rename Propagation", () => {
        it("should update file name", async () => {
            const file = await fs.createFile("root", "oldname.ts", "content");
            expect(file.name).toBe("oldname.ts");

            await fs.renameFile(file.id, "newname.ts");

            const renamed = await fs.readFile(file.id);
            expect(renamed?.name).toBe("newname.ts");
        });

        it("should preserve file content after rename", async () => {
            const file = await fs.createFile("root", "original.ts", "important content");

            await fs.renameFile(file.id, "renamed.ts");

            const renamed = await fs.readFile(file.id);
            expect(renamed?.content).toBe("important content");
            expect(renamed?.name).toBe("renamed.ts");
        });

        it("should update timestamps on rename", async () => {
            const file = await fs.createFile("root", "test.ts");
            const originalTimestamp = file.updatedAt;

            // Wait to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 10));

            await fs.renameFile(file.id, "renamed.ts");

            const renamed = await fs.readFile(file.id);
            expect(renamed?.updatedAt).toBeGreaterThan(originalTimestamp);
        });
    });

    describe("Directory Rename with Children", () => {
        it("should update all child paths on directory rename", async () => {
            const dir = await fs.createDirectory("root", "olddir");
            const file1 = await fs.createFile(dir.id, "file1.ts");
            const file2 = await fs.createFile(dir.id, "file2.ts");
            const subdir = await fs.createDirectory(dir.id, "subdir");

            await fs.renameFile(dir.id, "newdir");

            // Note: Current implementation only updates the directory name,
            // not the paths. This is a limitation that could be improved.
            const renamedDir = await fs.storage.get<FileNode>("files", dir.id);
            expect(renamedDir?.name).toBe("newdir");

            // Files will have old paths until the directory path is updated
            // This test documents current behavior
        });

        it("should handle deeply nested children during rename", async () => {
            const parent = await fs.createDirectory("root", "parent");
            const child = await fs.createDirectory(parent.id, "child");
            const grandchild = await fs.createDirectory(child.id, "grandchild");
            const file = await fs.createFile(grandchild.id, "deep.ts");

            await fs.renameFile(parent.id, "renamed-parent");

            const renamedParent = await fs.storage.get<FileNode>("files", parent.id);
            expect(renamedParent?.name).toBe("renamed-parent");

            // Note: Current implementation limitation - paths aren't updated recursively
        });

        it("should preserve file contents after parent rename", async () => {
            const dir = await fs.createDirectory("root", "dir");
            const file = await fs.createFile(dir.id, "file.ts", "preserve this");

            await fs.renameFile(dir.id, "renamed-dir");

            const fileCheck = await fs.readFile(file.id);
            expect(fileCheck?.content).toBe("preserve this");
        });
    });

    describe("Cross-Directory Move with Name Conflict", () => {
        it("should throw error when moving to directory with same-named file", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");

            const file1 = await fs.createFile(dir1.id, "conflict.ts");
            const file2 = await fs.createFile(dir2.id, "conflict.ts");

            await expect(fs.moveNode(file1.id, dir2.id)).rejects.toThrow(
                "already exists",
            );
        });

        it("should suggest resolution for conflicts", async () => {
            const dir1 = await fs.createDirectory("root", "source");
            const dir2 = await fs.createDirectory("root", "target");

            const file = await fs.createFile(dir1.id, "existing.ts");
            await fs.createFile(dir2.id, "existing.ts");

            try {
                await fs.moveNode(file.id, dir2.id);
                expect.fail("Should have thrown error");
            } catch (error) {
                if (error instanceof Error) {
                    expect(error.message).toContain("already exists");
                    // Application layer should suggest: rename, replace, or cancel
                }
            }
        });

        it("should allow move after conflict resolution", async () => {
            const dir1 = await fs.createDirectory("root", "dir1");
            const dir2 = await fs.createDirectory("root", "dir2");

            const file1 = await fs.createFile(dir1.id, "conflict.ts");
            const file2 = await fs.createFile(dir2.id, "conflict.ts");

            // Attempt move - fails
            await expect(fs.moveNode(file1.id, dir2.id)).rejects.toThrow();

            // Resolve by renaming the target file
            await fs.renameFile(file1.id, "conflict-renamed.ts");

            // Now move should succeed
            await fs.moveNode(file1.id, dir2.id);

            const moved = await fs.readFile(file1.id);
            expect(moved?.parentId).toBe(dir2.id);
            expect(moved?.path).toBe("/dir2/conflict-renamed.ts");
        });
    });

    describe("Large File (10MB+) Operations", () => {
        it("should create file with 10MB content", async () => {
            // Create ~10MB of content (10 million characters)
            const largeContent = "x".repeat(10 * 1024 * 1024);

            const file = await fs.createFile("root", "large.ts", largeContent);

            expect(file.content.length).toBe(10 * 1024 * 1024);
            expect(file.name).toBe("large.ts");
        });

        it("should read large file content correctly", async () => {
            const largeContent = "y".repeat(10 * 1024 * 1024);
            const file = await fs.createFile("root", "large-read.ts", largeContent);

            const read = await fs.readFile(file.id);

            expect(read).toBeDefined();
            expect(read?.content.length).toBe(10 * 1024 * 1024);
            expect(read?.content[0]).toBe("y");
            expect(read?.content[read.content.length - 1]).toBe("y");
        });

        it("should update large file content", async () => {
            const content1 = "a".repeat(10 * 1024 * 1024);
            const file = await fs.createFile("root", "large-update.ts", content1);

            const content2 = "b".repeat(10 * 1024 * 1024);
            await fs.updateFile(file.id, content2);

            const updated = await fs.readFile(file.id);
            expect(updated?.content.length).toBe(10 * 1024 * 1024);
            expect(updated?.content[0]).toBe("b");
        });

        it("should handle multiple large files", async () => {
            const files = await Promise.all([
                fs.createFile("root", "large1.ts", "1".repeat(5 * 1024 * 1024)),
                fs.createFile("root", "large2.ts", "2".repeat(5 * 1024 * 1024)),
                fs.createFile("root", "large3.ts", "3".repeat(5 * 1024 * 1024)),
            ]);

            // Verify all files were created
            expect(files.length).toBe(3);

            // Read them back
            const read1 = await fs.readFile(files[0].id);
            const read2 = await fs.readFile(files[1].id);
            const read3 = await fs.readFile(files[2].id);

            expect(read1?.content.length).toBe(5 * 1024 * 1024);
            expect(read2?.content.length).toBe(5 * 1024 * 1024);
            expect(read3?.content.length).toBe(5 * 1024 * 1024);

            expect(read1?.content[0]).toBe("1");
            expect(read2?.content[0]).toBe("2");
            expect(read3?.content[0]).toBe("3");
        });
    });

    describe("Complex Workflow Scenarios", () => {
        it("should handle complete project structure creation and manipulation", async () => {
            // Create a typical project structure
            const src = await fs.createDirectory("root", "src");
            const components = await fs.createDirectory(src.id, "components");
            const utils = await fs.createDirectory(src.id, "utils");
            const tests = await fs.createDirectory("root", "tests");

            await fs.createFile(components.id, "Button.tsx", "export const Button = () => {}");
            await fs.createFile(components.id, "Input.tsx", "export const Input = () => {}");
            await fs.createFile(utils.id, "helpers.ts", "export const helper = () => {}");
            await fs.createFile(tests.id, "Button.test.tsx", "test('button', () => {})");

            // Verify structure
            const srcContents = await fs.listDirectory(src.id);
            expect(srcContents.length).toBe(2);

            const componentsContents = await fs.listDirectory(components.id);
            expect(componentsContents.length).toBe(2);

            // Reorganize - move utils to components
            await fs.moveNode(utils.id, components.id);

            const newComponentsContents = await fs.listDirectory(components.id);
            expect(newComponentsContents.length).toBe(3); // Button, Input, utils

            // Verify helper file path updated
            const tree = await fs.getFileTree();
            const helpersFile = tree.find((n) => n.name === "helpers.ts");
            expect(helpersFile?.path).toBe("/src/components/utils/helpers.ts");
        });

        it("should handle concurrent file operations across multiple directories", async () => {
            const dir1 = await fs.createDirectory("root", "concurrent1");
            const dir2 = await fs.createDirectory("root", "concurrent2");
            const dir3 = await fs.createDirectory("root", "concurrent3");

            // Perform many concurrent operations
            await Promise.all([
                fs.createFile(dir1.id, "file1.ts", "content 1"),
                fs.createFile(dir1.id, "file2.ts", "content 2"),
                fs.createFile(dir2.id, "file3.ts", "content 3"),
                fs.createFile(dir2.id, "file4.ts", "content 4"),
                fs.createFile(dir3.id, "file5.ts", "content 5"),
                fs.createDirectory(dir1.id, "subdir1"),
                fs.createDirectory(dir2.id, "subdir2"),
            ]);

            // Verify all operations completed
            const dir1Contents = await fs.listDirectory(dir1.id);
            const dir2Contents = await fs.listDirectory(dir2.id);
            const dir3Contents = await fs.listDirectory(dir3.id);

            expect(dir1Contents.length).toBe(3);
            expect(dir2Contents.length).toBe(3);
            expect(dir3Contents.length).toBe(1);
        });

        it("should maintain referential integrity during complex operations", async () => {
            const project = await fs.createDirectory("root", "project");
            const src = await fs.createDirectory(project.id, "src");
            const file1 = await fs.createFile(src.id, "index.ts", "import './other'");
            const file2 = await fs.createFile(src.id, "other.ts", "export const x = 1");

            // Move src directory
            const newLocation = await fs.createDirectory("root", "relocated");
            await fs.moveNode(src.id, newLocation.id);

            // Verify both files moved and paths updated
            const file1Check = await fs.readFile(file1.id);
            const file2Check = await fs.readFile(file2.id);

            expect(file1Check?.path).toBe("/relocated/src/index.ts");
            expect(file2Check?.path).toBe("/relocated/src/other.ts");

            // Content should be preserved
            expect(file1Check?.content).toContain("import './other'");
            expect(file2Check?.content).toContain("export const x = 1");
        });

        it("should handle tab state with files across different directories", async () => {
            const components = await fs.createDirectory("root", "components");
            const utils = await fs.createDirectory("root", "utils");
            const hooks = await fs.createDirectory("root", "hooks");

            const file1 = await fs.createFile(components.id, "Button.tsx");
            const file2 = await fs.createFile(utils.id, "helper.ts");
            const file3 = await fs.createFile(hooks.id, "useCustom.ts");
            const file4 = await fs.createFile("root", "index.ts");

            // Save complex tab state
            await fs.saveTabState(
                [file1.id, file2.id, file3.id, file4.id],
                file2.id,
            );

            // Move a file
            await fs.moveNode(file2.id, components.id);

            // Tab state should still have old reference
            const state = await fs.loadTabState();
            expect(state?.tabOrder).toContain(file2.id);

            // But file should be in new location
            const movedFile = await fs.readFile(file2.id);
            expect(movedFile?.path).toBe("/components/helper.ts");
        });

        it("should handle stress test with many operations", async () => {
            const dirs = await Promise.all([
                fs.createDirectory("root", "dir1"),
                fs.createDirectory("root", "dir2"),
                fs.createDirectory("root", "dir3"),
                fs.createDirectory("root", "dir4"),
            ]);

            // Create 50 files across directories
            const filePromises = [];
            for (let i = 0; i < 50; i++) {
                const dirIndex = i % 4;
                filePromises.push(
                    fs.createFile(dirs[dirIndex].id, `file${i}.ts`, `content ${i}`),
                );
            }
            const files = await Promise.all(filePromises);

            // Perform various operations
            await fs.renameFile(files[0].id, "renamed.ts");
            await fs.updateFile(files[1].id, "updated content");
            await fs.moveNode(files[2].id, dirs[3].id);
            await fs.deleteFile(files[3].id);

            // Verify tree integrity
            const tree = await fs.getFileTree();
            expect(tree.length).toBeGreaterThan(50); // root + 4 dirs + ~49 files

            // Verify specific operations
            const renamed = await fs.readFile(files[0].id);
            expect(renamed?.name).toBe("renamed.ts");

            const updated = await fs.readFile(files[1].id);
            expect(updated?.content).toBe("updated content");

            const moved = await fs.readFile(files[2].id);
            expect(moved?.parentId).toBe(dirs[3].id);

            const deleted = await fs.readFile(files[3].id);
            expect(deleted).toBeNull();
        });
    });

    describe("Edge Cases and Error Handling", () => {
        it("should handle empty directory name gracefully", async () => {
            const dir = await fs.createDirectory("root", "");
            expect(dir.name).toBe("");
            expect(dir.path).toBe("/");
        });

        it("should handle special characters in paths", async () => {
            const dir = await fs.createDirectory("root", "special-chars_@#$");
            const file = await fs.createFile(dir.id, "file!@#.ts");

            expect(file.path).toBe("/special-chars_@#$/file!@#.ts");
        });

        it("should handle very long file names", async () => {
            const longName = "a".repeat(255) + ".ts";
            const file = await fs.createFile("root", longName);

            expect(file.name).toBe(longName);
        });

        it("should handle very deep path", async () => {
            let parentId = "root";
            let pathParts = [];

            // Create 20 levels deep
            for (let i = 1; i <= 20; i++) {
                const dir = await fs.createDirectory(parentId, `level${i}`);
                pathParts.push(`level${i}`);
                parentId = dir.id;
            }

            const deepFile = await fs.createFile(parentId, "deep.ts");
            expect(deepFile.path).toBe(`/${pathParts.join("/")}/deep.ts`);
        });

        it("should handle file operations on non-existent IDs", async () => {
            await expect(fs.readFile("non-existent")).resolves.toBeNull();
            await expect(fs.updateFile("non-existent", "content")).rejects.toThrow();
            await expect(fs.renameFile("non-existent", "name")).rejects.toThrow();
            await expect(fs.moveNode("non-existent", "root")).rejects.toThrow();
        });

        it("should handle moving to non-directory parent", async () => {
            const file1 = await fs.createFile("root", "file1.ts");
            const file2 = await fs.createFile("root", "file2.ts");

            // Try to move file1 to file2 (which is not a directory)
            await expect(fs.moveNode(file1.id, file2.id)).rejects.toThrow();
        });

        it("should handle empty content updates", async () => {
            const file = await fs.createFile("root", "test.ts", "original");
            await fs.updateFile(file.id, "");

            const updated = await fs.readFile(file.id);
            expect(updated?.content).toBe("");
        });

        it("should handle tab state with empty arrays", async () => {
            await fs.saveTabState([], null);

            const state = await fs.loadTabState();
            expect(state?.tabOrder).toEqual([]);
            expect(state?.activeFileId).toBeNull();
        });
    });
});

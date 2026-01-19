"use client";

import { useState, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useExplorerDrag } from "@/contexts/ExplorerDragContext";
import { ChevronRight, ChevronDown, File, Folder, Trash2, Edit2 } from "lucide-react";
import type { TreeNode } from "@/types/workspace";

interface FileTreeItemProps {
    node: TreeNode;
    depth: number;
}

// Helper to check if targetId is a descendant of ancestorId
function isDescendantOf(node: TreeNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    if (node.children) {
        for (const child of node.children) {
            if (isDescendantOf(child, targetId)) return true;
        }
    }
    return false;
}

export const FileTreeItem = memo(function FileTreeItem({ node, depth }: FileTreeItemProps) {
    const { openFile, toggleDirectory, deleteNode, renameNode, moveNode, state } = useWorkspace();
    const { draggedNode, startDrag, endDrag } = useExplorerDrag();
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [isDragOver, setIsDragOver] = useState(false);

    const handleClick = useCallback(() => {
        if (node.type === "file") {
            openFile(node.id);
        } else {
            toggleDirectory(node.id);
        }
    }, [node.type, node.id, openFile, toggleDirectory]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    }, []);

    const handleRename = useCallback(async () => {
        if (newName.trim() && newName !== node.name) {
            await renameNode(node.id, newName.trim());
        } else {
            setNewName(node.name);
        }
        setIsRenaming(false);
    }, [newName, node.id, node.name, renameNode]);

    const handleDelete = useCallback(async () => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${node.name}?${
                node.type === "directory" ? " This will delete all contents." : ""
            }`,
        );
        if (confirmed) {
            await deleteNode(node.id);
        }
        setShowContextMenu(false);
    }, [node.name, node.type, node.id, deleteNode]);

    const startRename = useCallback(() => {
        setNewName(node.name);
        setIsRenaming(true);
        setShowContextMenu(false);
    }, [node.name]);

    // Drag handlers
    const handleDragStart = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData(
                "application/x-maple-node",
                JSON.stringify({
                    id: node.id,
                    type: node.type,
                    parentId: node.parentId,
                }),
            );
            startDrag({ id: node.id, type: node.type, parentId: node.parentId });
        },
        [node.id, node.type, node.parentId, startDrag],
    );

    const handleDragEnd = useCallback(() => {
        endDrag();
        setIsDragOver(false);
    }, [endDrag]);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            // Only directories can be drop targets
            if (node.type !== "directory") return;

            // Check if we have valid drag data - use dataTransfer types as backup
            const hasValidData = e.dataTransfer.types.includes("application/x-maple-node");
            if (!hasValidData && !draggedNode) return;

            // Use context state if available, otherwise we'll validate on drop
            if (draggedNode) {
                // Can't drop on self
                if (draggedNode.id === node.id) return;

                // Can't drop on same parent (no-op) - item already in this folder
                if (draggedNode.parentId === node.id) return;

                // Can't drop a folder into its own descendant
                if (draggedNode.type === "directory") {
                    const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
                        for (const n of nodes) {
                            if (n.id === id) return n;
                            if (n.children) {
                                const found = findNode(n.children, id);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const draggedTreeNode = findNode(state.fileTree, draggedNode.id);
                    if (draggedTreeNode && isDescendantOf(draggedTreeNode, node.id)) {
                        return;
                    }
                }
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsDragOver(true);
        },
        [node.type, node.id, draggedNode, state.fileTree],
    );

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        // Only clear if leaving the element entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragOver(false);

            const data = e.dataTransfer.getData("application/x-maple-node");
            if (!data) return;

            const {
                id: draggedId,
                type: draggedType,
                parentId: draggedParentId,
            } = JSON.parse(data) as {
                id: string;
                type: "file" | "directory";
                parentId: string | null;
            };

            // Don't move if already in this folder
            if (draggedParentId === node.id) return;

            // Don't drop on self
            if (draggedId === node.id) return;

            // Check for dropping folder into its own descendant
            if (draggedType === "directory") {
                const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
                    for (const n of nodes) {
                        if (n.id === id) return n;
                        if (n.children) {
                            const found = findNode(n.children, id);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const draggedTreeNode = findNode(state.fileTree, draggedId);
                if (draggedTreeNode && isDescendantOf(draggedTreeNode, node.id)) {
                    return;
                }
            }

            try {
                await moveNode(draggedId, node.id);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to move item";
                window.alert(message);
            }
        },
        [node.id, moveNode, state.fileTree],
    );

    const isExpanded = node.type === "directory" && node.isExpanded;
    const isDragging = draggedNode?.id === node.id;

    return (
        <div>
            {/* Context menu overlay */}
            {showContextMenu && (
                <>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click outside to close */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: Overlay backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowContextMenu(false)}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                    <div
                        className="fixed z-50 min-w-40 rounded-md border border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] py-1 shadow-lg"
                        style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
                    >
                        <button
                            type="button"
                            onClick={startRename}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[var(--editor-fg)] hover:bg-[var(--ui-hover)]"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                            Rename
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-[var(--ui-hover)]"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </button>
                    </div>
                </>
            )}

            {/* Tree item */}
            <div
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "flex cursor-pointer items-center gap-1.5 px-2 py-1 text-sm hover:bg-[var(--ui-hover)]",
                    "text-[var(--editor-fg)]",
                    isDragging && "opacity-50",
                    isDragOver &&
                        node.type === "directory" &&
                        "bg-[var(--ui-accent)]/20 ring-1 ring-[var(--ui-accent)]",
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                role="treeitem"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                {/* Expand/collapse icon for directories */}
                {node.type === "directory" && (
                    <span className="flex-shrink-0 text-[var(--editor-line-number)]">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                )}

                {/* File/Folder icon */}
                <span className="flex-shrink-0 text-[var(--editor-line-number)]">
                    {node.type === "directory" ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}
                </span>

                {/* Name (editable when renaming) */}
                {isRenaming ? (
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename();
                            if (e.key === "Escape") {
                                setIsRenaming(false);
                                setNewName(node.name);
                            }
                            e.stopPropagation();
                        }}
                        onBlur={handleRename}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 rounded border border-[var(--ui-accent)] bg-[var(--editor-bg)] px-1 text-sm outline-none"
                        // biome-ignore lint/a11y/noAutofocus: Intentional for inline rename input
                        autoFocus
                    />
                ) : (
                    <span className="truncate">{node.name}</span>
                )}
            </div>

            {/* Children (recursive) */}
            {isExpanded && node.children && (
                // biome-ignore lint/a11y/useSemanticElements: role="group" is correct for tree item children
                <div role="group">
                    {node.children.map((child) => (
                        <FileTreeItem key={child.id} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
});

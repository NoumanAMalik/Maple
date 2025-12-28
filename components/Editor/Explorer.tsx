"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ExplorerDragProvider, useExplorerDrag } from "@/contexts/ExplorerDragContext";
import { ExplorerHeader, FileTreeItem } from "@/components/Explorer";

interface ExplorerProps {
    isOpen: boolean;
}

function ExplorerContent() {
    const { state, moveNode } = useWorkspace();
    const { draggedNode } = useExplorerDrag();
    const [isRootDragOver, setIsRootDragOver] = useState(false);

    // Root drop zone handlers - for moving items to root level
    const handleRootDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            // Check if we have valid drag data
            const hasValidData = e.dataTransfer.types.includes("application/x-maple-node");
            if (!hasValidData && !draggedNode) return;

            // Don't allow drop if item is already at root level
            if (draggedNode && (draggedNode.parentId === state.rootId || draggedNode.parentId === null)) {
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setIsRootDragOver(true);
        },
        [draggedNode, state.rootId],
    );

    const handleRootDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        // Only clear if leaving the element entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsRootDragOver(false);
        }
    }, []);

    const handleRootDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsRootDragOver(false);

            const data = e.dataTransfer.getData("application/x-maple-node");
            if (!data) return;

            const { id: draggedId, parentId: draggedParentId } = JSON.parse(data) as {
                id: string;
                type: string;
                parentId: string | null;
            };

            // Don't move if already at root
            if (draggedParentId === state.rootId || draggedParentId === null) return;

            try {
                await moveNode(draggedId, state.rootId);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to move item";
                window.alert(message);
            }
        },
        [moveNode, state.rootId],
    );

    return (
        <div className="flex h-full flex-col">
            <ExplorerHeader />
            <div
                className={cn(
                    "flex-1 overflow-y-auto",
                    isRootDragOver && "bg-[var(--ui-accent)]/10 ring-1 ring-inset ring-[var(--ui-accent)]",
                )}
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
                role="tree"
            >
                {state.isInitialized ? (
                    state.fileTree.length > 0 ? (
                        state.fileTree.map((node) => <FileTreeItem key={node.id} node={node} depth={0} />)
                    ) : (
                        <div className="p-4 text-center text-sm text-[var(--editor-line-number)]">
                            No files yet. Create one to get started.
                        </div>
                    )
                ) : (
                    <div className="p-4 text-center text-sm text-[var(--editor-line-number)]">Loading...</div>
                )}
            </div>
        </div>
    );
}

export function Explorer({ isOpen }: ExplorerProps) {
    return (
        <div
            className={cn(
                "h-full overflow-hidden border-l border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)] transition-all duration-300",
                isOpen ? "w-60" : "w-0",
            )}
        >
            {isOpen && (
                <ExplorerDragProvider>
                    <ExplorerContent />
                </ExplorerDragProvider>
            )}
        </div>
    );
}

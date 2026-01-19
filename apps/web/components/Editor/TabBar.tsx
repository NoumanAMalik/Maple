"use client";

import { useCallback, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { X, BookOpen, Code } from "lucide-react";
import type { EditorTab } from "@/types/workspace";

interface DragState {
    draggedTabId: string;
    draggedIndex: number;
    dragOverTabId: string | null;
    dropPosition: "before" | "after" | null;
    dropAtEnd: boolean;
}

export const TabBar = memo(function TabBar() {
    const { state, closeTab, dispatch } = useWorkspace();
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);

    const handleTabClick = useCallback(
        (tabId: string) => {
            dispatch({ type: "SET_ACTIVE_TAB", payload: { tabId } });
        },
        [dispatch],
    );

    const handleCloseTab = useCallback(
        (e: React.MouseEvent, tab: EditorTab) => {
            e.stopPropagation();

            // Check if dirty
            if (tab.isDirty) {
                const confirmed = window.confirm(`${tab.fileName} has unsaved changes. Close anyway?`);
                if (!confirmed) return;
            }

            closeTab(tab.id);
        },
        [closeTab],
    );

    // Drag event handlers
    const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, tabId: string, index: number) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tabId);
        e.dataTransfer.setData("application/x-maple-tab", JSON.stringify({ tabId, index }));

        // Set drag state after a brief delay to prevent flash
        requestAnimationFrame(() => {
            setDragState({
                draggedTabId: tabId,
                draggedIndex: index,
                dragOverTabId: null,
                dropPosition: null,
                dropAtEnd: false,
            });
        });
    }, []);

    const handleDragOver = useCallback(
        (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            // Don't show indicator when dragging over self
            if (dragState?.draggedTabId === tabId) {
                setDragState((prev) =>
                    prev
                        ? {
                              ...prev,
                              dragOverTabId: null,
                              dropPosition: null,
                              dropAtEnd: false,
                          }
                        : null,
                );
                return;
            }

            // Determine drop position based on mouse X position relative to tab center
            const rect = e.currentTarget.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            const dropPosition = e.clientX < midpoint ? "before" : "after";

            setDragState((prev) =>
                prev
                    ? {
                          ...prev,
                          dragOverTabId: tabId,
                          dropPosition,
                          dropAtEnd: false,
                      }
                    : null,
            );
        },
        [dragState?.draggedTabId],
    );

    // Handler for the end zone (empty space after tabs)
    const handleEndZoneDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        setDragState((prev) =>
            prev
                ? {
                      ...prev,
                      dragOverTabId: null,
                      dropPosition: null,
                      dropAtEnd: true,
                  }
                : null,
        );
    }, []);

    const handleEndZoneDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();

            const data = e.dataTransfer.getData("application/x-maple-tab");
            if (!data) {
                setDragState(null);
                return;
            }

            const { index: draggedIndex } = JSON.parse(data) as { tabId: string; index: number };
            const targetIndex = state.tabs.length - 1;

            // Move to end (only if not already at end)
            if (draggedIndex !== targetIndex) {
                dispatch({ type: "REORDER_TABS", payload: { fromIndex: draggedIndex, toIndex: targetIndex } });
            }

            setDragState(null);
        },
        [dispatch, state.tabs.length],
    );

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        // Only clear if leaving the tab entirely (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragState((prev) =>
                prev
                    ? {
                          ...prev,
                          dragOverTabId: null,
                          dropPosition: null,
                          dropAtEnd: false,
                      }
                    : null,
            );
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>, _dropTabId: string, dropIndex: number) => {
            e.preventDefault();

            const data = e.dataTransfer.getData("application/x-maple-tab");
            if (!data) {
                setDragState(null);
                return;
            }

            const { index: draggedIndex } = JSON.parse(data) as { tabId: string; index: number };

            // Calculate final index based on drop position
            let targetIndex = dropIndex;

            if (dragState?.dropPosition === "after") {
                targetIndex = dropIndex + 1;
            }

            // Adjust for removal of dragged item
            if (draggedIndex < targetIndex) {
                targetIndex -= 1;
            }

            // Dispatch reorder action
            if (draggedIndex !== targetIndex) {
                dispatch({ type: "REORDER_TABS", payload: { fromIndex: draggedIndex, toIndex: targetIndex } });
            }

            // Clear drag state
            setDragState(null);
        },
        [dispatch, dragState?.dropPosition],
    );

    const handleDragEnd = useCallback(() => {
        setDragState(null);
    }, []);

    // Can only drag if there are multiple tabs
    const canDrag = state.tabs.length > 1;

    const isMarkdownFile = (fileName: string): boolean => {
        return fileName.endsWith(".md") || fileName.endsWith(".markdown");
    };

    const handleTogglePreview = useCallback(
        (e: React.MouseEvent, tabId: string) => {
            e.stopPropagation();
            dispatch({ type: "TOGGLE_PREVIEW_MODE", payload: { tabId } });
        },
        [dispatch],
    );

    if (state.tabs.length === 0) {
        return (
            <div className="flex h-9 items-center border-b border-[var(--ui-border)] bg-[var(--ui-tab-bg)]">
                <div className="px-4 text-sm text-[var(--editor-line-number)]">No files open</div>
            </div>
        );
    }

    return (
        <div
            className="flex h-9 items-center overflow-x-auto border-b border-[var(--ui-border)] bg-[var(--ui-tab-bg)]"
            role="tablist"
        >
            {state.tabs.map((tab, index) => {
                const isActive = tab.id === state.activeTabId;
                const isHovered = hoveredTab === tab.id;
                const isDragging = dragState?.draggedTabId === tab.id;
                const isDragOver = dragState?.dragOverTabId === tab.id;

                return (
                    <div key={tab.id} className="relative flex h-full items-center">
                        {/* Drop indicator - before */}
                        {isDragOver && dragState?.dropPosition === "before" && (
                            <div className="absolute left-0 top-1 bottom-1 z-10 w-0.5 rounded-full bg-[var(--ui-accent)]" />
                        )}

                        <div
                            draggable={canDrag}
                            onDragStart={(e) => handleDragStart(e, tab.id, index)}
                            onDragOver={(e) => handleDragOver(e, tab.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, tab.id, index)}
                            onDragEnd={handleDragEnd}
                            tabIndex={0}
                            onClick={() => handleTabClick(tab.id)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleTabClick(tab.id);
                                }
                            }}
                            onMouseEnter={() => setHoveredTab(tab.id)}
                            onMouseLeave={() => setHoveredTab(null)}
                            className={cn(
                                "group flex h-full min-w-0 max-w-xs items-center gap-2 border-r border-[var(--ui-border)] px-3 transition-colors",
                                isActive
                                    ? "bg-[var(--ui-tab-active-bg)] text-[var(--editor-fg)]"
                                    : "bg-[var(--ui-tab-bg)] text-[var(--editor-line-number)] hover:bg-[var(--ui-hover)]",
                                isDragging && "opacity-50",
                                canDrag && !dragState && "cursor-grab",
                                dragState && "cursor-grabbing",
                            )}
                            aria-selected={isActive}
                            role="tab"
                        >
                            {/* File name */}
                            <span className="truncate text-sm">
                                {tab.fileName}
                                {tab.isDirty ? " \u2022" : ""}
                            </span>

                            {/* Preview toggle for markdown files */}
                            {isMarkdownFile(tab.fileName) && (
                                <button
                                    type="button"
                                    onClick={(e) => handleTogglePreview(e, tab.id)}
                                    className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--ui-border)]"
                                    aria-label={tab.isPreviewMode ? "Edit markdown" : "Preview markdown"}
                                >
                                    {tab.isPreviewMode ? (
                                        <Code className="h-3.5 w-3.5" />
                                    ) : (
                                        <BookOpen className="h-3.5 w-3.5" />
                                    )}
                                </button>
                            )}

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={(e) => handleCloseTab(e, tab)}
                                className={cn(
                                    "ml-auto flex-shrink-0 rounded p-0.5 transition-colors",
                                    "hover:bg-[var(--ui-border)]",
                                    !isHovered && !isActive && "opacity-0 group-hover:opacity-100",
                                )}
                                aria-label={`Close ${tab.fileName}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Drop indicator - after */}
                        {isDragOver && dragState?.dropPosition === "after" && (
                            <div className="absolute right-0 top-1 bottom-1 z-10 w-0.5 rounded-full bg-[var(--ui-accent)]" />
                        )}
                    </div>
                );
            })}

            {/* End zone - catches drops past the last tab */}
            {dragState && (
                // biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone doesn't need keyboard interaction
                <div
                    className="relative flex h-full min-w-8 flex-1 items-center"
                    onDragOver={handleEndZoneDragOver}
                    onDrop={handleEndZoneDrop}
                >
                    {/* Drop indicator at end */}
                    {dragState.dropAtEnd && (
                        <div className="absolute left-0 top-1 bottom-1 z-10 w-0.5 rounded-full bg-[var(--ui-accent)]" />
                    )}
                </div>
            )}
        </div>
    );
});

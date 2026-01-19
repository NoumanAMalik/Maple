"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface DraggedNode {
    id: string;
    type: "file" | "directory";
    parentId: string | null;
}

interface ExplorerDragContextValue {
    draggedNode: DraggedNode | null;
    setDraggedNode: (node: DraggedNode | null) => void;
    startDrag: (node: DraggedNode) => void;
    endDrag: () => void;
}

const ExplorerDragContext = createContext<ExplorerDragContextValue | null>(null);

export function ExplorerDragProvider({ children }: { children: ReactNode }) {
    const [draggedNode, setDraggedNode] = useState<DraggedNode | null>(null);

    const startDrag = useCallback((node: DraggedNode) => {
        setDraggedNode(node);
    }, []);

    const endDrag = useCallback(() => {
        setDraggedNode(null);
    }, []);

    return (
        <ExplorerDragContext.Provider value={{ draggedNode, setDraggedNode, startDrag, endDrag }}>
            {children}
        </ExplorerDragContext.Provider>
    );
}

export function useExplorerDrag(): ExplorerDragContextValue {
    const context = useContext(ExplorerDragContext);
    if (!context) {
        throw new Error("useExplorerDrag must be used within ExplorerDragProvider");
    }
    return context;
}

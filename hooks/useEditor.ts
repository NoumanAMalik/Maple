"use client";

import { useState, useCallback, useRef } from "react";
import type { EditorState, CursorPosition, EditorConfig } from "@/types/editor";
import { defaultEditorConfig } from "@/types/editor";

interface UseEditorOptions {
    initialContent?: string;
    config?: Partial<EditorConfig>;
    onChange?: (content: string) => void;
}

interface UseEditorReturn {
    state: EditorState;
    config: EditorConfig;
    setContent: (content: string) => void;
    setCursor: (position: CursorPosition) => void;
    insertText: (text: string) => void;
    deleteSelection: () => void;
    undo: () => void;
    redo: () => void;
}

export function useEditor(options: UseEditorOptions = {}): UseEditorReturn {
    const { initialContent = "", config: userConfig, onChange } = options;

    const config: EditorConfig = { ...defaultEditorConfig, ...userConfig };

    const [state, setState] = useState<EditorState>({
        content: initialContent,
        cursorPosition: { line: 1, column: 1 },
        selections: [],
        scrollTop: 0,
        scrollLeft: 0,
    });

    // History for undo/redo
    const historyRef = useRef<string[]>([initialContent]);
    const historyIndexRef = useRef(0);

    const setContent = useCallback(
        (content: string) => {
            setState((prev) => ({ ...prev, content }));
            onChange?.(content);

            // Add to history
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
            historyRef.current.push(content);
            historyIndexRef.current = historyRef.current.length - 1;
        },
        [onChange],
    );

    const setCursor = useCallback((position: CursorPosition) => {
        setState((prev) => ({ ...prev, cursorPosition: position }));
    }, []);

    const insertText = useCallback(
        (text: string) => {
            setState((prev) => {
                // Simple insertion at cursor - to be expanded
                const newContent = prev.content + text;
                onChange?.(newContent);
                return { ...prev, content: newContent };
            });
        },
        [onChange],
    );

    const deleteSelection = useCallback(() => {
        setState((prev) => {
            if (prev.selections.length === 0) return prev;
            // To be implemented
            return prev;
        });
    }, []);

    const undo = useCallback(() => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
            const content = historyRef.current[historyIndexRef.current];
            setState((prev) => ({ ...prev, content }));
            onChange?.(content);
        }
    }, [onChange]);

    const redo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            const content = historyRef.current[historyIndexRef.current];
            setState((prev) => ({ ...prev, content }));
            onChange?.(content);
        }
    }, [onChange]);

    return {
        state,
        config,
        setContent,
        setCursor,
        insertText,
        deleteSelection,
        undo,
        redo,
    };
}

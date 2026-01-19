"use client";

import { useRef, useEffect, useCallback, type KeyboardEvent, type ClipboardEvent, type CompositionEvent } from "react";
import type { EditorCommand, CursorDirection } from "@/types/editor";

interface HiddenTextareaProps {
    /** Execute an editor command */
    onCommand: (command: EditorCommand) => void;
    /** Get currently selected text (for copy) */
    getSelectedText: () => string;
    /** Whether the editor should be focused */
    autoFocus?: boolean;
    /** Called when focus state changes */
    onFocusChange?: (focused: boolean) => void;
    /** Tab size for tab key handling */
    tabSize: number;
}

/**
 * Hidden textarea for capturing keyboard input and clipboard operations.
 * This enables proper IME support, clipboard handling, and accessibility.
 */
export function HiddenTextarea({
    onCommand,
    getSelectedText,
    autoFocus = true,
    onFocusChange,
    tabSize,
}: HiddenTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isComposingRef = useRef(false);

    // Focus the textarea
    const focus = useCallback(() => {
        textareaRef.current?.focus();
    }, []);

    // Initial focus
    useEffect(() => {
        if (autoFocus) {
            // Delay to ensure DOM is ready
            requestAnimationFrame(() => {
                focus();
            });
        }
    }, [autoFocus, focus]);

    // Handle composition (IME) start
    const handleCompositionStart = useCallback(() => {
        isComposingRef.current = true;
    }, []);

    // Handle composition (IME) end
    const handleCompositionEnd = useCallback(
        (e: CompositionEvent<HTMLTextAreaElement>) => {
            isComposingRef.current = false;

            // Insert the composed text
            const text = e.data;
            if (text) {
                onCommand({ type: "insert", text });
            }

            // Clear textarea
            if (textareaRef.current) {
                textareaRef.current.value = "";
            }
        },
        [onCommand],
    );

    // Handle regular input
    const handleInput = useCallback(() => {
        // Ignore during composition
        if (isComposingRef.current) return;

        const textarea = textareaRef.current;
        if (!textarea || !textarea.value) return;

        const text = textarea.value;
        onCommand({ type: "insert", text });

        // Clear textarea for next input
        textarea.value = "";
    }, [onCommand]);

    // Handle keyboard events
    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLTextAreaElement>) => {
            // Ignore during composition
            if (isComposingRef.current) return;

            const { key, metaKey, ctrlKey, shiftKey, altKey } = e;
            const mod = metaKey || ctrlKey;

            // Undo: Cmd+Z
            if (mod && key === "z" && !shiftKey) {
                e.preventDefault();
                onCommand({ type: "undo" });
                return;
            }

            // Redo: Cmd+Shift+Z or Cmd+Y
            if (mod && ((key === "z" && shiftKey) || key === "y")) {
                e.preventDefault();
                onCommand({ type: "redo" });
                return;
            }

            // Select All: Cmd+A
            if (mod && key === "a") {
                e.preventDefault();
                onCommand({ type: "selectAll" });
                return;
            }

            // Copy: Cmd+C (handled by onCopy, but prevent default behavior)
            if (mod && key === "c") {
                // Let it propagate to onCopy handler
                return;
            }

            // Cut: Cmd+X (handled by onCut, but prevent default behavior)
            if (mod && key === "x") {
                // Let it propagate to onCut handler
                return;
            }

            // Paste: Cmd+V (handled by onPaste)
            if (mod && key === "v") {
                // Let it propagate to onPaste handler
                return;
            }

            // Navigation keys
            let direction: CursorDirection | null = null;
            let extend = shiftKey;

            switch (key) {
                case "ArrowLeft":
                    e.preventDefault();
                    if (mod && altKey) {
                        direction = "wordLeft";
                    } else if (mod) {
                        direction = "lineStart";
                    } else if (altKey) {
                        direction = "wordLeft";
                    } else {
                        direction = "left";
                    }
                    break;

                case "ArrowRight":
                    e.preventDefault();
                    if (mod && altKey) {
                        direction = "wordRight";
                    } else if (mod) {
                        direction = "lineEnd";
                    } else if (altKey) {
                        direction = "wordRight";
                    } else {
                        direction = "right";
                    }
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    if (mod) {
                        direction = "documentStart";
                    } else {
                        direction = "up";
                    }
                    break;

                case "ArrowDown":
                    e.preventDefault();
                    if (mod) {
                        direction = "documentEnd";
                    } else {
                        direction = "down";
                    }
                    break;

                case "Home":
                    e.preventDefault();
                    direction = mod ? "documentStart" : "lineStart";
                    break;

                case "End":
                    e.preventDefault();
                    direction = mod ? "documentEnd" : "lineEnd";
                    break;

                case "Backspace":
                    e.preventDefault();
                    if (altKey) {
                        // Delete word left
                        onCommand({ type: "moveCursor", direction: "wordLeft", extend: true });
                        onCommand({ type: "deleteSelection" });
                    } else if (mod) {
                        // Delete to line start
                        onCommand({ type: "moveCursor", direction: "lineStart", extend: true });
                        onCommand({ type: "deleteSelection" });
                    } else {
                        onCommand({ type: "deleteBackward" });
                    }
                    return;

                case "Delete":
                    e.preventDefault();
                    if (altKey) {
                        // Delete word right
                        onCommand({ type: "moveCursor", direction: "wordRight", extend: true });
                        onCommand({ type: "deleteSelection" });
                    } else if (mod) {
                        // Delete to line end
                        onCommand({ type: "moveCursor", direction: "lineEnd", extend: true });
                        onCommand({ type: "deleteSelection" });
                    } else {
                        onCommand({ type: "deleteForward" });
                    }
                    return;

                case "Enter":
                    e.preventDefault();
                    onCommand({ type: "insert", text: "\n" });
                    return;

                case "Tab": {
                    e.preventDefault();
                    // Insert spaces instead of tab character
                    const spaces = " ".repeat(tabSize);
                    onCommand({ type: "insert", text: spaces });
                    return;
                }

                case "Escape":
                    // Clear selection? Or let it propagate
                    return;

                default:
                    // Let other keys propagate to onInput
                    return;
            }

            if (direction) {
                onCommand({ type: "moveCursor", direction, extend });
            }
        },
        [onCommand, tabSize],
    );

    // Handle copy
    const handleCopy = useCallback(
        (e: ClipboardEvent<HTMLTextAreaElement>) => {
            const selectedText = getSelectedText();
            if (selectedText) {
                e.preventDefault();
                e.clipboardData.setData("text/plain", selectedText);
                onCommand({ type: "copy" });
            }
        },
        [getSelectedText, onCommand],
    );

    // Handle cut
    const handleCut = useCallback(
        (e: ClipboardEvent<HTMLTextAreaElement>) => {
            const selectedText = getSelectedText();
            if (selectedText) {
                e.preventDefault();
                e.clipboardData.setData("text/plain", selectedText);
                onCommand({ type: "cut" });
            }
        },
        [getSelectedText, onCommand],
    );

    // Handle paste
    const handlePaste = useCallback(
        (e: ClipboardEvent<HTMLTextAreaElement>) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            if (text) {
                onCommand({ type: "paste", text });
            }
        },
        [onCommand],
    );

    // Handle focus
    const handleFocus = useCallback(() => {
        onFocusChange?.(true);
    }, [onFocusChange]);

    // Handle blur
    const handleBlur = useCallback(() => {
        onFocusChange?.(false);
    }, [onFocusChange]);

    return (
        <textarea
            ref={textareaRef}
            className="hidden-textarea"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "1px",
                height: "1px",
                padding: 0,
                margin: 0,
                border: "none",
                outline: "none",
                resize: "none",
                overflow: "hidden",
                opacity: 0.01, // Nearly invisible but still accessible
                pointerEvents: "auto",
                zIndex: 100,
                caretColor: "transparent",
            }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label="Code editor text input"
            aria-multiline="true"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            tabIndex={0}
        />
    );
}

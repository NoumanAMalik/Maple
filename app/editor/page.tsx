"use client";

import { useCallback, useRef } from "react";
import { useEditor } from "@/hooks/useEditor";
import { useTokenizerWorker } from "@/hooks/useTokenizerWorker";
import { HighlightedCode } from "@/lib/highlighting";
import { EDITOR_CONSTANTS } from "@/utils/constants";

/**
 * Convert a character offset to line and column numbers.
 */
function offsetToLineColumn(content: string, offset: number): { line: number; column: number } {
    const lines = content.slice(0, offset).split("\n");
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
    };
}

const SAMPLE_CODE = `// Welcome to Maple Editor
// A web-based code editor with custom syntax highlighting

const greeting = "Hello, World!";
const number = 42;
const isActive = true;

function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

class Calculator {
    private value: number = 0;

    add(x: number): Calculator {
        this.value += x;
        return this;
    }

    get result(): number {
        return this.value;
    }
}

// Template literal example
const message = \`The answer is \${number}\`;

/*
 * Multi-line comment
 * with multiple lines
 */

export { fibonacci, Calculator };
`;

export default function EditorPage() {
    const { state, setContent, setCursor } = useEditor({
        initialContent: SAMPLE_CODE,
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Use worker-based tokenizer for non-blocking syntax highlighting
    const { highlightedLines, isTokenizing } = useTokenizerWorker({
        content: state.content,
        language: "typescript",
        debounceMs: 16, // ~60fps, minimal debounce since worker handles the heavy lifting
    });

    // Update cursor position from textarea selection
    const updateCursorPosition = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const offset = textarea.selectionStart;
        const { line, column } = offsetToLineColumn(state.content, offset);
        setCursor({ line, column });
    }, [state.content, setCursor]);

    // Handle content changes
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setContent(e.target.value);
            // Update cursor position after content change
            requestAnimationFrame(() => {
                updateCursorPosition();
            });
        },
        [setContent, updateCursorPosition],
    );

    return (
        <div className="flex h-screen w-full flex-col bg-[var(--editor-bg)]">
            {/* Tab Bar - Placeholder */}
            <div className="flex h-9 items-center border-b border-[var(--ui-border)] bg-[var(--ui-tab-bg)]">
                <div className="flex h-full items-center border-r border-[var(--ui-border)] bg-[var(--ui-tab-active-bg)] px-4">
                    <span className="text-sm text-[var(--editor-fg)]">untitled.ts</span>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - Placeholder */}
                <div className="w-60 border-r border-[var(--ui-border)] bg-[var(--ui-sidebar-bg)]">
                    <div className="p-4">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                            Explorer
                        </h2>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="relative flex-1 overflow-auto">
                    {/* Line Numbers */}
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-14 border-r border-[var(--ui-border)] bg-[var(--editor-gutter)]">
                        {state.content.split("\n").map((_, i) => (
                            <div
                                key={i}
                                className="h-5 px-2 text-right text-sm leading-5 text-[var(--editor-line-number)]"
                            >
                                {i + 1}
                            </div>
                        ))}
                    </div>

                    {/* Code Area */}
                    <div className="relative ml-14 min-h-full">
                        {/* Syntax Highlighted Layer */}
                        <pre className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre p-2 font-mono text-sm text-[var(--editor-fg)]">
                            <HighlightedCode lines={highlightedLines} lineHeight={EDITOR_CONSTANTS.LINE_HEIGHT} />
                        </pre>

                        {/* Input Layer */}
                        <textarea
                            ref={textareaRef}
                            className="absolute inset-0 w-full resize-none bg-transparent p-2 font-mono text-sm leading-5 text-transparent caret-[var(--editor-cursor)] outline-none"
                            value={state.content}
                            onChange={handleChange}
                            onSelect={updateCursorPosition}
                            onClick={updateCursorPosition}
                            onKeyUp={updateCursorPosition}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                        />
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex h-6 items-center justify-between border-t border-[var(--ui-border)] bg-[var(--ui-statusbar-bg)] px-2 text-xs text-white">
                <div className="flex items-center gap-4">
                    <span>Maple Editor</span>
                    {isTokenizing && <span className="opacity-70">Tokenizing...</span>}
                </div>
                <div className="flex items-center gap-4">
                    <span>
                        Ln {state.cursorPosition.line}, Col {state.cursorPosition.column}
                    </span>
                    <span>TypeScript</span>
                    <span>UTF-8</span>
                </div>
            </div>
        </div>
    );
}

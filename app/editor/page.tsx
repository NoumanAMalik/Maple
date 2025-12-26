"use client";

import { useEditor } from "@/hooks/useEditor";

export default function EditorPage() {
    const { state, setContent } = useEditor({
        initialContent: "// Welcome to Maple Editor\n// Start coding here...\n",
    });

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
                        <pre className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre p-2 font-mono text-sm leading-5 text-[var(--editor-fg)]">
                            <code>{state.content}</code>
                        </pre>

                        {/* Input Layer */}
                        <textarea
                            className="absolute inset-0 w-full resize-none bg-transparent p-2 font-mono text-sm leading-5 text-transparent caret-[var(--editor-cursor)] outline-none"
                            value={state.content}
                            onChange={(e) => setContent(e.target.value)}
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
                </div>
                <div className="flex items-center gap-4">
                    <span>Ln 1, Col 1</span>
                    <span>TypeScript</span>
                    <span>UTF-8</span>
                </div>
            </div>
        </div>
    );
}

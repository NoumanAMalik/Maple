"use client";

import { useState, useCallback } from "react";
import { ActivityBar, CodeEditor, Explorer } from "@/components/Editor";
import type { CursorPosition } from "@/types/editor";

// Sample content for testing
const SAMPLE_CONTENT = `// Welcome to Maple Editor
// A custom-built code editor with VS Code-like experience

function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate some values
const results: number[] = [];
for (let i = 0; i < 10; i++) {
    results.push(fibonacci(i));
}

console.log("Fibonacci sequence:", results);

interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

class UserService {
    private users: Map<string, User> = new Map();

    create(name: string, email: string): User {
        const user: User = {
            id: crypto.randomUUID(),
            name,
            email,
            createdAt: new Date(),
        };
        this.users.set(user.id, user);
        return user;
    }

    findById(id: string): User | undefined {
        return this.users.get(id);
    }

    findAll(): User[] {
        return Array.from(this.users.values());
    }

    delete(id: string): boolean {
        return this.users.delete(id);
    }
}

// Create some test users
const service = new UserService();
const alice = service.create("Alice", "alice@example.com");
const bob = service.create("Bob", "bob@example.com");

console.log("Users:", service.findAll());
`;

export default function EditorPage() {
    const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });
    const [isDirty, setIsDirty] = useState(false);
    const [isExplorerOpen, setIsExplorerOpen] = useState(true);

    const handleContentChange = useCallback((_content: string) => {
        setIsDirty(true);
    }, []);

    const handleCursorChange = useCallback((position: CursorPosition) => {
        setCursorPosition(position);
    }, []);

    const toggleExplorer = useCallback(() => {
        setIsExplorerOpen((prev) => !prev);
    }, []);

    return (
        <div className="flex h-screen w-full flex-col bg-[var(--editor-bg)]">
            {/* Tab Bar */}
            <div className="flex h-9 items-center border-b border-[var(--ui-border)] bg-[var(--ui-tab-bg)]">
                <div className="flex h-full items-center border-r border-[var(--ui-border)] bg-[var(--ui-tab-active-bg)] px-4">
                    <span className="text-sm text-[var(--editor-fg)]">untitled.ts{isDirty ? " *" : ""}</span>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Editor Content */}
                <div className="relative flex-1 overflow-hidden">
                    <CodeEditor
                        initialContent={SAMPLE_CONTENT}
                        onChange={handleContentChange}
                        onCursorChange={handleCursorChange}
                        autoFocus
                    />
                </div>

                <Explorer isOpen={isExplorerOpen} />
                <ActivityBar isExplorerOpen={isExplorerOpen} onToggleExplorer={toggleExplorer} />
            </div>

            {/* Status Bar */}
            <div className="flex h-6 items-center justify-between border-t border-[var(--ui-border)] bg-[var(--ui-statusbar-bg)] px-2 text-xs text-white">
                <div className="flex items-center gap-4">
                    <span>Maple Editor</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>
                        Ln {cursorPosition.line}, Col {cursorPosition.column}
                    </span>
                    <span>TypeScript</span>
                    <span>UTF-8</span>
                </div>
            </div>
        </div>
    );
}

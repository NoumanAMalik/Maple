"use client";

import { useEffect, useState, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

// Helper to get all file names at root level
function getRootFileNames(fileTree: { name: string }[]): Set<string> {
    return new Set(fileTree.map((node) => node.name));
}

// Generate unique filename like untitled.txt, untitled-1.txt, untitled-2.txt, etc.
function generateUniqueFileName(existingNames: Set<string>, baseName = "untitled", ext = "txt"): string {
    const fullName = `${baseName}.${ext}`;
    if (!existingNames.has(fullName)) {
        return fullName;
    }

    let counter = 1;
    while (existingNames.has(`${baseName}-${counter}.${ext}`)) {
        counter++;
    }
    return `${baseName}-${counter}.${ext}`;
}

function FeatureCard({ title, description, delay }: { title: string; description: string; delay: number }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`
                group relative px-5 py-4 rounded-xl
                border border-[var(--ui-border)] bg-[var(--ui-hover)]/30
                backdrop-blur-sm
                transition-all duration-500 ease-out
                hover:border-[var(--ui-accent)]/40 hover:bg-[var(--ui-hover)]/50
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
        >
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-xl bg-[var(--ui-accent)]/0 group-hover:bg-[var(--ui-accent)]/5 transition-colors duration-300" />

            <h3 className="relative text-sm font-medium text-[var(--editor-fg)] mb-1.5">{title}</h3>
            <p className="relative text-xs text-[var(--editor-line-number)] leading-relaxed">{description}</p>
        </div>
    );
}

function KeyboardShortcut({ keys, label, delay }: { keys: string[]; label: string; delay: number }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className={`
                flex items-center gap-3 transition-all duration-500 ease-out
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
            `}
        >
            <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                    <span key={i}>
                        <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-medium text-[var(--editor-fg)]/80 bg-[var(--ui-hover)] border border-[var(--ui-border)] rounded-md shadow-[0_1px_0_var(--ui-border)]">
                            {key}
                        </kbd>
                        {i < keys.length - 1 && <span className="text-[var(--editor-line-number)] mx-0.5">+</span>}
                    </span>
                ))}
            </div>
            <span className="text-xs text-[var(--editor-line-number)]">{label}</span>
        </div>
    );
}

export function WelcomeScreen() {
    const { state, createFile } = useWorkspace();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        // Trigger initial animation
        const timer = setTimeout(() => setIsLoaded(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleCreateFile = useCallback(async () => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            const existingNames = getRootFileNames(state.fileTree);
            const fileName = generateUniqueFileName(existingNames);
            await createFile(state.rootId, fileName);
        } finally {
            setIsCreating(false);
        }
    }, [isCreating, createFile, state.rootId, state.fileTree]);

    // Detect platform for keyboard shortcuts (client-side only to avoid hydration errors)
    const [cmdKey, setCmdKey] = useState("Ctrl");

    useEffect(() => {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        setCmdKey(isMac ? "\u2318" : "Ctrl");
    }, []);

    return (
        <div className="relative h-full w-full overflow-auto bg-[var(--editor-bg)]">
            {/* Grain texture overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.025]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Decorative ambient glow */}
            <div
                className={`
                    absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-[600px] h-[400px] rounded-full
                    bg-gradient-to-br from-[var(--ui-accent)]/8 via-transparent to-[var(--ui-accent)]/4
                    blur-3xl pointer-events-none
                    transition-opacity duration-1000
                    ${isLoaded ? "opacity-100" : "opacity-0"}
                `}
            />

            {/* Content container */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-8 py-12">
                {/* Branding */}
                <div
                    className={`
                        text-center mb-8
                        transition-all duration-700 ease-out
                        ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
                    `}
                >
                    <h1 className="font-serif italic text-5xl text-[var(--editor-fg)] tracking-tight mb-4">Maple</h1>
                    <p className="text-xl text-[var(--editor-fg)]/90 font-light tracking-wide">
                        Code beautifully, right here
                    </p>
                </div>

                {/* Description */}
                <p
                    className={`
                        text-sm text-[var(--editor-line-number)] text-center max-w-md mb-10
                        transition-all duration-700 delay-100 ease-out
                        ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
                    `}
                >
                    A browser-native editor with custom syntax highlighting built from scratch.
                </p>

                {/* CTA Button */}
                <button
                    type="button"
                    onClick={handleCreateFile}
                    disabled={isCreating}
                    className={`
                        group relative
                        inline-flex items-center gap-2.5
                        px-6 py-3 rounded-full
                        bg-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)]
                        text-white text-sm font-medium
                        shadow-lg shadow-[var(--ui-accent)]/20
                        hover:shadow-xl hover:shadow-[var(--ui-accent)]/30
                        hover:-translate-y-0.5
                        active:translate-y-0 active:shadow-lg
                        transition-all duration-200 ease-out
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                        ${isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"}
                    `}
                    style={{ transitionDelay: isLoaded ? "200ms" : "0ms" }}
                >
                    <svg
                        className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {isCreating ? "Creating..." : "Create New File"}
                </button>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-2xl w-full">
                    <FeatureCard
                        title="Custom Tokenizer"
                        description="Hand-crafted syntax highlighting. No Monaco, no CodeMirror."
                        delay={400}
                    />
                    <FeatureCard
                        title="Browser Native"
                        description="No installation. Open a tab and start coding."
                        delay={500}
                    />
                    <FeatureCard
                        title="Local Storage"
                        description="Your files stay in your browser. Private by default."
                        delay={600}
                    />
                </div>

                {/* Keyboard shortcuts */}
                <div
                    className={`
                        mt-12 pt-8 border-t border-[var(--ui-border)]/50
                        transition-all duration-700 ease-out
                        ${isLoaded ? "opacity-100" : "opacity-0"}
                    `}
                    style={{ transitionDelay: "600ms" }}
                >
                    <p className="text-xs text-[var(--editor-line-number)] text-center mb-4 uppercase tracking-wider">
                        Keyboard Shortcuts
                    </p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        <KeyboardShortcut keys={[cmdKey, "N"]} label="New File" delay={700} />
                        <KeyboardShortcut keys={[cmdKey, "S"]} label="Save File" delay={750} />
                        <KeyboardShortcut keys={[cmdKey, "1"]} label="Close Tab" delay={800} />
                        <KeyboardShortcut keys={[cmdKey, "B"]} label="Toggle Sidebar" delay={850} />
                    </div>
                </div>
            </div>
        </div>
    );
}

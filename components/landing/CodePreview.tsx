export function CodePreview(): React.JSX.Element {
    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-maple-accent/10 via-transparent to-maple-accent/5 rounded-3xl blur-2xl" />

            {/* Code window */}
            <div className="relative bg-editor-bg rounded-xl overflow-hidden shadow-2xl border border-ui-border">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-ui-sidebar-bg border-b border-ui-border">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="ml-2 text-xs text-editor-line-number font-mono">app.tsx</span>
                </div>

                {/* Code content */}
                <div className="p-5 font-mono text-sm leading-relaxed">
                    <div className="flex">
                        <span className="w-8 text-editor-line-number text-right mr-4 select-none">1</span>
                        <span>
                            <span className="text-syntax-keyword">function</span>
                            <span className="text-syntax-function"> greet</span>
                            <span className="text-editor-fg">(</span>
                            <span className="text-syntax-parameter">name</span>
                            <span className="text-editor-fg">) {"{"}</span>
                        </span>
                    </div>
                    <div className="flex">
                        <span className="w-8 text-editor-line-number text-right mr-4 select-none">2</span>
                        <span>
                            <span className="text-editor-fg">{"  "}</span>
                            <span className="text-syntax-keyword">return</span>
                            {/* biome-ignore lint/suspicious/noTemplateCurlyInString: displaying code */}
                            <span className="text-syntax-string">{" `Hello, ${name}`"}</span>
                            <span className="text-editor-fg">;</span>
                        </span>
                    </div>
                    <div className="flex">
                        <span className="w-8 text-editor-line-number text-right mr-4 select-none">3</span>
                        <span className="text-editor-fg">{"}"}</span>
                    </div>
                    <div className="flex">
                        <span className="w-8 text-editor-line-number text-right mr-4 select-none">4</span>
                        <span className="text-editor-fg" />
                    </div>
                    <div className="flex">
                        <span className="w-8 text-editor-line-number text-right mr-4 select-none">5</span>
                        <span>
                            <span className="text-syntax-comment">{"// Built from scratch"}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

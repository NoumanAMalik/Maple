"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkDirective from "remark-directive";
import remarkTufteNotes from "@/lib/markdown/remarkTufteNotes";
import { TufteSidenote } from "@/components/markdown/TufteSidenote";
import { TufteMarginnote } from "@/components/markdown/TufteMarginnote";

interface TufteMarkdownProps {
    markdown: string;
    className?: string;
}

export default function TufteMarkdown({ markdown, className }: TufteMarkdownProps) {
    return (
        <article className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkDirective, remarkTufteNotes]}
                components={
                    {
                        sidenote: TufteSidenote as Components["div"],
                        marginnote: TufteMarginnote as Components["div"],
                    } as Partial<Components>
                }
            >
                {markdown}
            </ReactMarkdown>
        </article>
    );
}

"use client";

import { memo, useMemo, type ReactNode } from "react";
import type { EditorConfig } from "@/types/editor";
import type { Token } from "@/lib/tokenizer/types";
import { tokenizeSingleLine } from "@/lib/tokenizer/tokenizeLine";
import { getTokenColor } from "@/lib/tokenizer/colors";

interface LineProps {
    lineNumber: number;
    content: string;
    isCurrent: boolean;
    config: EditorConfig;
    tokens?: Token[];
}

function renderWithTokens(content: string, tokens: Token[]): ReactNode {
    if (tokens.length === 0) {
        return content || "\u00A0";
    }

    const segments: ReactNode[] = [];
    let lastEnd = 0;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const tokenEnd = token.start + token.length;

        if (token.start > lastEnd) {
            segments.push(content.slice(lastEnd, token.start));
        }

        const text = content.slice(token.start, tokenEnd);
        const color = getTokenColor(token.type);

        if (color) {
            segments.push(
                <span key={i} style={{ color }}>
                    {text}
                </span>,
            );
        } else {
            segments.push(text);
        }

        lastEnd = tokenEnd;
    }

    if (lastEnd < content.length) {
        segments.push(content.slice(lastEnd));
    }

    return segments.length > 0 ? segments : "\u00A0";
}

export const Line = memo(function Line({ lineNumber, content, isCurrent, config, tokens }: LineProps) {
    const rendered = useMemo(() => {
        if (tokens) {
            return renderWithTokens(content, tokens);
        }
        const { tokens: computedTokens } = tokenizeSingleLine(config.language, content);
        return renderWithTokens(content, computedTokens);
    }, [content, config.language, tokens]);

    return (
        <div
            className="editor-line"
            data-line={lineNumber}
            style={{
                height: `${config.lineHeight}px`,
                lineHeight: `${config.lineHeight}px`,
                backgroundColor: isCurrent ? "var(--editor-active-line)" : "transparent",
                fontFamily: config.fontFamily,
                fontSize: `${config.fontSize}px`,
                whiteSpace: "pre",
                paddingLeft: "8px",
                paddingRight: "8px",
                color: "var(--editor-fg)",
                minWidth: "100%",
                boxSizing: "border-box",
            }}
        >
            {rendered}
        </div>
    );
});

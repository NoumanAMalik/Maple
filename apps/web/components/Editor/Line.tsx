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
    matches?: Array<{ column: number; length: number; isCurrent: boolean }>;
}

function renderWithTokens(
    content: string,
    tokens: Token[],
    matches?: Array<{ column: number; length: number; isCurrent: boolean }>,
): ReactNode {
    if (!content) {
        return "\u00A0";
    }

    // If no tokens and no matches, return plain content
    if (tokens.length === 0 && (!matches || matches.length === 0)) {
        return content;
    }

    // Create a map of character positions to their properties
    const charData: Array<{
        char: string;
        color?: string;
        matchType?: "regular" | "current";
    }> = [];

    for (let i = 0; i < content.length; i++) {
        charData.push({ char: content[i] });
    }

    // Apply token colors
    for (const token of tokens) {
        const color = getTokenColor(token.type);
        if (color) {
            const end = Math.min(token.start + token.length, content.length);
            for (let i = token.start; i < end; i++) {
                charData[i].color = color;
            }
        }
    }

    // Apply match highlights (column is 1-indexed, convert to 0-indexed)
    if (matches) {
        for (const match of matches) {
            const start = match.column - 1;
            const end = Math.min(start + match.length, content.length);
            const matchType = match.isCurrent ? "current" : "regular";
            for (let i = start; i < end; i++) {
                charData[i].matchType = matchType;
            }
        }
    }

    // Build segments by grouping consecutive characters with same styling
    const segments: ReactNode[] = [];
    let i = 0;
    let segmentKey = 0;

    while (i < charData.length) {
        const current = charData[i];
        let j = i + 1;

        // Find consecutive characters with same color and matchType
        while (
            j < charData.length &&
            charData[j].color === current.color &&
            charData[j].matchType === current.matchType
        ) {
            j++;
        }

        const text = content.slice(i, j);
        const style: React.CSSProperties = {};

        if (current.color) {
            style.color = current.color;
        }

        if (current.matchType) {
            style.backgroundColor = current.matchType === "current" ? "var(--match-current)" : "var(--match-highlight)";
        }

        if (Object.keys(style).length > 0) {
            segments.push(
                <span key={segmentKey++} style={style}>
                    {text}
                </span>,
            );
        } else {
            segments.push(text);
        }

        i = j;
    }

    return segments.length > 0 ? segments : "\u00A0";
}

export const Line = memo(function Line({ lineNumber, content, isCurrent, config, tokens, matches }: LineProps) {
    const rendered = useMemo(() => {
        if (tokens) {
            return renderWithTokens(content, tokens, matches);
        }
        const { tokens: computedTokens } = tokenizeSingleLine(config.language, content);
        return renderWithTokens(content, computedTokens, matches);
    }, [content, config.language, tokens, matches]);

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

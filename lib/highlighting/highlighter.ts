import type { ReactNode } from "react";
import { createElement } from "react";
import type { Token } from "@/lib/tokenizer/types";
import { getTokenClass } from "./styles";

/**
 * Represents a line with its highlighted content.
 */
export interface HighlightedLine {
    /** Line number (1-indexed) */
    lineNumber: number;
    /** React elements for this line */
    elements: ReactNode[];
    /** Whether this line is empty */
    isEmpty: boolean;
}

/**
 * Convert tokens to highlighted React elements, organized by line.
 * @param tokens - Array of tokens to convert
 * @param minLines - Minimum number of lines to ensure in the result (used for optimistic padding)
 */
export function createHighlightedLines(tokens: Token[], minLines?: number): HighlightedLine[] {
    if (tokens.length === 0) {
        if (minLines && minLines > 0) {
            const result: HighlightedLine[] = [];
            for (let i = 1; i <= minLines; i++) {
                result.push({ lineNumber: i, elements: [], isEmpty: true });
            }
            return result;
        }
        return [{ lineNumber: 1, elements: [], isEmpty: true }];
    }

    const lineMap = new Map<number, ReactNode[]>();
    let maxLine = 1;

    for (const token of tokens) {
        const line = token.line;
        maxLine = Math.max(maxLine, line);

        if (!lineMap.has(line)) {
            lineMap.set(line, []);
        }

        const elements = lineMap.get(line)!;
        const className = getTokenClass(token.type);

        // Create a span for this token
        // Key includes line number to ensure uniqueness across lines
        const element = createElement(
            "span",
            {
                key: `${token.line}-${token.start}-${token.type}`,
                className: className || undefined,
                "data-token-type": token.type,
            },
            token.value,
        );

        elements.push(element);
    }

    // Use the greater of maxLine from tokens or minLines parameter
    const totalLines = Math.max(maxLine, minLines ?? 0);

    // Build result array ensuring all lines are present
    const result: HighlightedLine[] = [];

    for (let i = 1; i <= totalLines; i++) {
        const elements = lineMap.get(i) ?? [];
        result.push({
            lineNumber: i,
            elements,
            isEmpty: elements.length === 0,
        });
    }

    return result;
}

/**
 * Convert tokens to a flat array of React elements.
 * Useful for simple rendering without line tracking.
 */
export function createHighlightedElements(tokens: Token[]): ReactNode[] {
    return tokens.map((token) => {
        const className = getTokenClass(token.type);
        return createElement(
            "span",
            {
                key: `${token.line}-${token.start}-${token.type}`,
                className: className || undefined,
            },
            token.value,
        );
    });
}

/**
 * Convert tokens to plain HTML string.
 * Useful for server-side rendering or static output.
 */
export function createHighlightedHTML(tokens: Token[]): string {
    return tokens
        .map((token) => {
            const className = getTokenClass(token.type);
            const escapedValue = escapeHTML(token.value);
            if (className) {
                return `<span class="${className}">${escapedValue}</span>`;
            }
            return escapedValue;
        })
        .join("");
}

/**
 * Escape HTML special characters.
 */
function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

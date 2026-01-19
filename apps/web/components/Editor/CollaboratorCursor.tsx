"use client";

import { memo, useMemo } from "react";
import type { Collaborator } from "@/hooks/useCollab";
import type { EditorConfig } from "@/types/editor";

interface CollaboratorCursorProps {
    collaborator: Collaborator;
    charWidth: number;
    config: EditorConfig;
    firstVisibleLine: number;
    lastVisibleLine: number;
}

export const CollaboratorCursor = memo(function CollaboratorCursor({
    collaborator,
    charWidth,
    config,
    firstVisibleLine,
    lastVisibleLine,
}: CollaboratorCursorProps) {
    const { cursor, color, displayName } = collaborator;

    const isVisible = cursor.line >= firstVisibleLine && cursor.line <= lastVisibleLine;

    const style = useMemo(() => {
        if (!isVisible) return null;

        const top = (cursor.line - 1) * config.lineHeight;
        const left = (cursor.column - 1) * charWidth;

        return {
            top,
            left,
        };
    }, [isVisible, cursor, config.lineHeight, charWidth]);

    if (!isVisible || !style) return null;

    return (
        <div
            className="pointer-events-none absolute"
            style={{
                top: style.top,
                left: style.left,
                zIndex: 10,
            }}
        >
            {/* Name pill */}
            <div
                className="absolute -top-5 left-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-medium leading-tight"
                style={{
                    backgroundColor: color,
                    color: "#111418",
                }}
            >
                {displayName}
            </div>

            {/* Cursor caret */}
            <div
                className="absolute top-0 left-0"
                style={{
                    width: 2,
                    height: config.lineHeight,
                    backgroundColor: color,
                }}
            />
        </div>
    );
});

interface CollaboratorCursorsProps {
    collaborators: Collaborator[];
    charWidth: number;
    config: EditorConfig;
    firstVisibleLine: number;
    lastVisibleLine: number;
}

export const CollaboratorCursors = memo(function CollaboratorCursors({
    collaborators,
    charWidth,
    config,
    firstVisibleLine,
    lastVisibleLine,
}: CollaboratorCursorsProps) {
    if (collaborators.length === 0) return null;

    return (
        <>
            {collaborators.map((collaborator) => (
                <CollaboratorCursor
                    key={collaborator.clientId}
                    collaborator={collaborator}
                    charWidth={charWidth}
                    config={config}
                    firstVisibleLine={firstVisibleLine}
                    lastVisibleLine={lastVisibleLine}
                />
            ))}
        </>
    );
});

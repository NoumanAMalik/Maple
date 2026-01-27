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
            className="absolute"
            style={{
                top: style.top,
                left: style.left,
                zIndex: 10,
            }}
        >
            {/* Name pill - hidden by default, animates on hover */}
            <div
                className="absolute -top-5 left-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-medium leading-tight opacity-0 translate-y-1 transition-all duration-150 ease-out peer-hover:opacity-100 peer-hover:translate-y-0 pointer-events-none"
                style={{
                    backgroundColor: color,
                    color: "#111418",
                }}
            >
                {displayName}
            </div>

            {/* Cursor caret - always visible */}
            <div
                className="peer absolute top-0 left-0 pointer-events-auto"
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

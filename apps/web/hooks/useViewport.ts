"use client";

import { useState, useEffect, useCallback, useMemo, type RefObject } from "react";
import type { ViewState } from "@/types/editor";
import { getVisibleLineRange } from "@/lib/editor/coordinates";

interface UseViewportOptions {
    /** Reference to the scroll container element */
    containerRef: RefObject<HTMLDivElement | null>;
    /** Total number of lines in the document */
    lineCount: number;
    /** Height of each line in pixels */
    lineHeight: number;
    /** Number of extra lines to render above/below viewport */
    buffer?: number;
}

interface UseViewportReturn {
    /** Current viewport state */
    viewState: ViewState;
    /** Update scroll position */
    setScroll: (scrollTop: number, scrollLeft: number) => void;
    /** Scroll to make a line visible */
    scrollToLine: (lineNumber: number) => void;
    /** Scroll to make a position visible */
    scrollToPosition: (line: number, column: number, charWidth: number) => void;
}

/**
 * Hook for managing viewport state and virtual scrolling calculations.
 */
export function useViewport({
    containerRef,
    lineCount,
    lineHeight,
    buffer = 5,
}: UseViewportOptions): UseViewportReturn {
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Observe container dimensions
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initial measurement
        setDimensions({
            width: container.clientWidth,
            height: container.clientHeight,
        });

        // Watch for size changes
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [containerRef]);

    // Ensure dimensions stay in sync on rerenders (e.g., test updates or missed observers)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        setDimensions((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });

    // Calculate visible line range
    const visibleRange = useMemo(() => {
        return getVisibleLineRange(scrollTop, dimensions.height, lineHeight, lineCount, buffer);
    }, [scrollTop, dimensions.height, lineHeight, lineCount, buffer]);

    // Build complete view state
    const viewState: ViewState = useMemo(
        () => ({
            scrollTop,
            scrollLeft,
            viewportWidth: dimensions.width,
            viewportHeight: dimensions.height,
            firstVisibleLine: visibleRange.firstVisibleLine,
            lastVisibleLine: visibleRange.lastVisibleLine,
        }),
        [scrollTop, scrollLeft, dimensions, visibleRange],
    );

    // Update scroll position
    const setScroll = useCallback((newScrollTop: number, newScrollLeft: number) => {
        setScrollTop(newScrollTop);
        setScrollLeft(newScrollLeft);
    }, []);

    // Scroll to make a specific line visible
    const scrollToLine = useCallback(
        (lineNumber: number) => {
            const container = containerRef.current;
            if (!container) return;

            const lineTop = (lineNumber - 1) * lineHeight;
            const lineBottom = lineTop + lineHeight;

            // Check if line is already visible
            if (lineTop >= scrollTop && lineBottom <= scrollTop + dimensions.height) {
                return; // Already visible
            }

            // Center the line in the viewport
            const lineCenter = lineTop + lineHeight / 2;
            const viewportCenter = dimensions.height / 2;
            let newScrollTop = lineCenter - viewportCenter;

            // Clamp to valid range
            const maxScrollTop = Math.max(0, lineCount * lineHeight - dimensions.height);
            newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));

            container.scrollTop = newScrollTop;
            setScrollTop(newScrollTop);
        },
        [containerRef, lineHeight, scrollTop, dimensions.height, lineCount],
    );

    // Scroll to make a specific position visible (line and column)
    const scrollToPosition = useCallback(
        (line: number, column: number, charWidth: number) => {
            const container = containerRef.current;
            if (!container) return;

            // Vertical scrolling
            scrollToLine(line);

            // Horizontal scrolling
            const gutterWidth = 60; // EDITOR_CONSTANTS.GUTTER_WIDTH
            const padding = 8;
            const cursorX = gutterWidth + padding + (column - 1) * charWidth;
            const cursorRight = cursorX + charWidth;

            const viewportLeft = scrollLeft;
            const viewportRight = scrollLeft + dimensions.width;

            let newScrollLeft = scrollLeft;

            if (cursorX < viewportLeft + gutterWidth + padding) {
                // Cursor is to the left of viewport
                newScrollLeft = Math.max(0, cursorX - gutterWidth - padding - 20);
            } else if (cursorRight > viewportRight - padding) {
                // Cursor is to the right of viewport
                newScrollLeft = cursorRight - dimensions.width + padding + 20;
            }

            if (newScrollLeft !== scrollLeft) {
                container.scrollLeft = newScrollLeft;
                setScrollLeft(newScrollLeft);
            }
        },
        [containerRef, scrollToLine, scrollLeft, dimensions.width],
    );

    return {
        viewState,
        setScroll,
        scrollToLine,
        scrollToPosition,
    };
}

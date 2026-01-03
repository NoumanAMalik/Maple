import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useViewport } from "./useViewport";
import type { RefObject } from "react";

function createMockContainer(refValue: HTMLDivElement | null = null): RefObject<HTMLDivElement | null> {
    const mockRef = {
        current: refValue,
    };
    return mockRef as unknown as RefObject<HTMLDivElement | null>;
}

function createMockElement(width = 800, height = 600): HTMLDivElement {
    const scrollState = { top: 0, left: 0 };
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", { value: width, writable: true });
    Object.defineProperty(element, "clientHeight", { value: height, writable: true });
    Object.defineProperty(element, "scrollTop", {
        get: () => scrollState.top,
        set: (v: number) => {
            scrollState.top = v;
        },
        configurable: true,
    });
    Object.defineProperty(element, "scrollLeft", {
        get: () => scrollState.left,
        set: (v: number) => {
            scrollState.left = v;
        },
        configurable: true,
    });
    element.scrollTo = vi.fn((options?: ScrollToOptions | number, left?: number) => {
        if (typeof options === "number") {
            scrollState.top = options;
            if (left !== undefined) scrollState.left = left;
        } else if (options) {
            if (options.top !== undefined) scrollState.top = options.top;
            if (options.left !== undefined) scrollState.left = options.left;
        }
    });
    return element;
}

describe("useViewport", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("Initialization", () => {
        it("should initialize with zero scroll position", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            expect(result.current.viewState.scrollTop).toBe(0);
            expect(result.current.viewState.scrollLeft).toBe(0);
            expect(result.current.viewState.viewportWidth).toBe(800);
            expect(result.current.viewState.viewportHeight).toBe(600);
        });

        it("should calculate visible line range", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                    buffer: 5,
                }),
            );

            expect(result.current.viewState.firstVisibleLine).toBe(1);
            expect(result.current.viewState.lastVisibleLine).toBe(35); // 600/20 + buffer*2
        });

        it("should handle zero line count", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 0,
                    lineHeight: 20,
                }),
            );

            expect(result.current.viewState.firstVisibleLine).toBe(0);
            expect(result.current.viewState.lastVisibleLine).toBe(0);
        });

        it("should use default buffer value of 5", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            expect(result.current.viewState.firstVisibleLine).toBe(1);
            expect(result.current.viewState.lastVisibleLine).toBe(35);
        });

        it("should handle custom buffer value", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                    buffer: 10,
                }),
            );

            expect(result.current.viewState.firstVisibleLine).toBe(1);
            expect(result.current.viewState.lastVisibleLine).toBe(40); // 600/20 + 10*2
        });
    });

    describe("setScroll", () => {
        it("should update scroll position", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.setScroll(100, 50);
            });

            expect(result.current.viewState.scrollTop).toBe(100);
            expect(result.current.viewState.scrollLeft).toBe(50);
        });

        it("should update visible range when scroll changes", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                    buffer: 5,
                }),
            );

            act(() => {
                result.current.setScroll(200, 0);
            });

            expect(result.current.viewState.scrollTop).toBe(200);
            expect(result.current.viewState.firstVisibleLine).toBe(11); // 200/20 + 1
            expect(result.current.viewState.lastVisibleLine).toBe(45);
        });
    });

    describe("scrollToLine", () => {
        it("should scroll line into view", () => {
            const mockElement = createMockElement();
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToLine(50);
            });

            expect(mockElement.scrollTop).toBeGreaterThan(0);
            expect(result.current.viewState.scrollTop).toBe(mockElement.scrollTop);
        });

        it("should not scroll if line is already visible", () => {
            const mockElement = createMockElement();
            mockElement.scrollTop = 100;
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.setScroll(100, 0);
            });

            act(() => {
                result.current.scrollToLine(6);
            });

            expect(mockElement.scrollTop).toBe(100);
        });

        it("should scroll to first line", () => {
            const mockElement = createMockElement();
            mockElement.scrollTop = 500;
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToLine(1);
            });

            expect(result.current.viewState.scrollTop).toBe(0);
        });

        it("should scroll to last line", () => {
            const mockElement = createMockElement();
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToLine(100);
            });

            expect(result.current.viewState.scrollTop).toBeGreaterThan(0);
        });

        it("should handle line number larger than document", () => {
            const mockElement = createMockElement();
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 50,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToLine(100);
            });

            expect(result.current.viewState.scrollTop).toBeGreaterThan(0);
        });

        it("should handle line number less than 1", () => {
            const mockElement = createMockElement();
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToLine(-5);
            });

            expect(result.current.viewState.scrollTop).toBe(0);
        });
    });

    describe("scrollToPosition", () => {
        it("should scroll to make position visible", () => {
            const mockElement = createMockElement();
            mockElement.scrollTop = 1000;
            mockElement.scrollLeft = 0;
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToPosition(1, 1, 10);
            });

            expect(result.current.viewState.scrollTop).toBeLessThan(1000);
        });

        it("should scroll horizontally when column is out of view", () => {
            const mockElement = createMockElement();
            mockElement.scrollTop = 0;
            mockElement.scrollLeft = 0;
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToPosition(1, 100, 10);
            });

            expect(result.current.viewState.scrollLeft).toBeGreaterThan(0);
        });

        it("should handle position at start of line", () => {
            const mockElement = createMockElement();
            mockElement.scrollTop = 500;
            mockElement.scrollLeft = 100;
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToPosition(1, 1, 10);
            });

            expect(result.current.viewState.scrollLeft).toBe(0);
        });

        it("should not scroll if position is already visible", () => {
            const mockElement = createMockElement();
            mockElement.scrollTop = 0;
            mockElement.scrollLeft = 0;
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            act(() => {
                result.current.scrollToPosition(1, 1, 10);
            });

            expect(result.current.viewState.scrollLeft).toBe(0);
        });
    });

    describe("Edge Cases", () => {
        it("should handle null container ref", () => {
            const nullRef = createMockContainer(null);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef: nullRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            expect(result.current.viewState.viewportWidth).toBe(0);
            expect(result.current.viewState.viewportHeight).toBe(0);
        });

        it("should handle very large line height", () => {
            const containerRef = createMockContainer(createMockElement());
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 100,
                }),
            );

            expect(result.current.viewState.firstVisibleLine).toBe(1);
            expect(result.current.viewState.lastVisibleLine).toBe(11);
        });

        it("should handle very small viewport", () => {
            const mockElement = createMockElement(100, 50);
            const containerRef = createMockContainer(mockElement);
            const { result } = renderHook(() =>
                useViewport({
                    containerRef,
                    lineCount: 100,
                    lineHeight: 20,
                }),
            );

            expect(result.current.viewState.viewportWidth).toBe(100);
            expect(result.current.viewState.viewportHeight).toBe(50);
            expect(result.current.viewState.lastVisibleLine).toBe(7);
        });
    });
});

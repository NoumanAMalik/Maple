import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFindReplace } from "./useFindReplace";

describe("useFindReplace", () => {
    describe("Initialization", () => {
        it("should initialize with empty query", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            expect(result.current.findQuery).toBe("");
            expect(result.current.replaceQuery).toBe("");
            expect(result.current.matches).toEqual([]);
            expect(result.current.currentMatchIndex).toBe(-1);
        });

        it("should initialize with caseSensitive false", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello", isOpen: true }));

            expect(result.current.caseSensitive).toBe(false);
        });

        it("should initialize with useRegex false", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello", isOpen: true }));

            expect(result.current.useRegex).toBe(false);
        });

        it("should initialize with showReplace false", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello", isOpen: true }));

            expect(result.current.showReplace).toBe(false);
        });

        it("should have hasMatches false initially", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello", isOpen: true }));

            expect(result.current.hasMatches).toBe(false);
            expect(result.current.matchCount).toBe(0);
        });
    });

    describe("State Updates", () => {
        it("should update findQuery", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.findQuery).toBe("hello");
        });

        it("should update replaceQuery", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setReplaceQuery("hi");
            });

            expect(result.current.replaceQuery).toBe("hi");
        });

        it("should toggle caseSensitive", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            expect(result.current.caseSensitive).toBe(false);

            act(() => {
                result.current.toggleCaseSensitive();
            });

            expect(result.current.caseSensitive).toBe(true);

            act(() => {
                result.current.toggleCaseSensitive();
            });

            expect(result.current.caseSensitive).toBe(false);
        });

        it("should toggle useRegex", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            expect(result.current.useRegex).toBe(false);

            act(() => {
                result.current.toggleUseRegex();
            });

            expect(result.current.useRegex).toBe(true);

            act(() => {
                result.current.toggleUseRegex();
            });

            expect(result.current.useRegex).toBe(false);
        });

        it("should toggle showReplace", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            expect(result.current.showReplace).toBe(false);

            act(() => {
                result.current.toggleShowReplace();
            });

            expect(result.current.showReplace).toBe(true);

            act(() => {
                result.current.toggleShowReplace();
            });

            expect(result.current.showReplace).toBe(false);
        });
    });

    describe("Search Functionality", () => {
        it("should find all matches", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello hello hello", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.matches.length).toBe(3);
            expect(result.current.hasMatches).toBe(true);
            expect(result.current.matchCount).toBe(3);
        });

        it("should handle no matches", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("xyz");
            });

            expect(result.current.matches).toEqual([]);
            expect(result.current.hasMatches).toBe(false);
            expect(result.current.matchCount).toBe(0);
            expect(result.current.currentMatchIndex).toBe(-1);
        });

        it("should handle empty query", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("");
            });

            expect(result.current.matches).toEqual([]);
            expect(result.current.currentMatchIndex).toBe(-1);
        });

        it("should search when isOpen changes to true", () => {
            const { result, rerender } = renderHook(
                ({ isOpen }) => useFindReplace({ content: "hello world", isOpen }),
                { initialProps: { isOpen: false } },
            );

            act(() => {
                result.current.setFindQuery("hello");
            });

            rerender({ isOpen: true });

            expect(result.current.matches.length).toBeGreaterThan(0);
        });

        it("should reset currentMatchIndex when closed", () => {
            const { result, rerender } = renderHook(
                ({ isOpen }) => useFindReplace({ content: "hello world", isOpen }),
                { initialProps: { isOpen: false } },
            );

            act(() => {
                result.current.setFindQuery("hello");
            });

            rerender({ isOpen: true });

            expect(result.current.currentMatchIndex).toBe(0);

            rerender({ isOpen: false });

            expect(result.current.currentMatchIndex).toBe(-1);
        });
    });

    describe("Case Sensitivity", () => {
        it("should find matches case-insensitively by default", () => {
            const { result } = renderHook(() => useFindReplace({ content: "Hello hello HELLO", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.matches.length).toBe(3);
        });

        it("should find matches case-sensitively when enabled", () => {
            const { result } = renderHook(() => useFindReplace({ content: "Hello hello HELLO", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
                result.current.toggleCaseSensitive();
            });

            expect(result.current.matches.length).toBe(1);
        });
    });

    describe("Regex Search", () => {
        it("should handle regex pattern", () => {
            const { result } = renderHook(() => useFindReplace({ content: "item1 item2 item3", isOpen: true }));

            act(() => {
                result.current.setFindQuery("item\\d+");
                result.current.toggleUseRegex();
            });

            expect(result.current.matches.length).toBe(3);
        });

        it("should handle regex with capture groups", () => {
            const { result } = renderHook(() => useFindReplace({ content: "price: $100, price: $200", isOpen: true }));

            act(() => {
                result.current.setFindQuery("\\$(\\d+)");
                result.current.toggleUseRegex();
            });

            expect(result.current.matches.length).toBe(2);
        });

        it("should handle invalid regex gracefully", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("[unclosed");
                result.current.toggleUseRegex();
            });

            expect(result.current.matches).toEqual([]);
        });
    });

    describe("Navigation", () => {
        it("should find next match", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello hello hello", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.currentMatchIndex).toBe(0);

            act(() => {
                result.current.findNext();
            });

            expect(result.current.currentMatchIndex).toBe(1);

            act(() => {
                result.current.findNext();
            });

            expect(result.current.currentMatchIndex).toBe(2);
        });

        it("should wrap around when finding next at end", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello hello", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.currentMatchIndex).toBe(0);

            act(() => {
                result.current.findNext();
            });

            expect(result.current.currentMatchIndex).toBe(1);

            act(() => {
                result.current.findNext();
            });

            expect(result.current.currentMatchIndex).toBe(0);
        });

        it("should find previous match", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello hello hello", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.currentMatchIndex).toBe(0);

            act(() => {
                result.current.findPrevious();
            });

            expect(result.current.currentMatchIndex).toBe(2);

            act(() => {
                result.current.findPrevious();
            });

            expect(result.current.currentMatchIndex).toBe(1);
        });

        it("should wrap around when finding previous at start", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello hello", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
            });

            act(() => {
                result.current.findPrevious();
            });

            expect(result.current.currentMatchIndex).toBe(1);
        });

        it("should do nothing when no matches", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("xyz");
            });

            act(() => {
                result.current.findNext();
            });

            expect(result.current.currentMatchIndex).toBe(-1);

            act(() => {
                result.current.findPrevious();
            });

            expect(result.current.currentMatchIndex).toBe(-1);
        });
    });

    describe("Replace", () => {
        it("should replace current match", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
                result.current.setReplaceQuery("hi");
            });

            const newContent = result.current.replaceCurrent();

            expect(newContent).toBe("hi world");
        });

        it("should return null when no matches", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("xyz");
            });

            const newContent = result.current.replaceCurrent();

            expect(newContent).toBeNull();
        });

        it("should replace all matches", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello hello hello", isOpen: true }));

            act(() => {
                result.current.setFindQuery("hello");
                result.current.setReplaceQuery("hi");
            });

            const newContent = result.current.replaceAll();

            expect(newContent).toBe("hi hi hi");
        });

        it("should handle replace all with regex capture groups", () => {
            const { result } = renderHook(() => useFindReplace({ content: "price: $100, price: $200", isOpen: true }));

            act(() => {
                result.current.setFindQuery("\\$(\\d+)");
                result.current.setReplaceQuery("USD$$$1");
                result.current.toggleUseRegex();
            });

            const newContent = result.current.replaceAll();

            expect(newContent).toBe("price: USD$100, price: USD$200");
        });

        it("should return null for replace all when no matches", () => {
            const { result } = renderHook(() => useFindReplace({ content: "hello world", isOpen: true }));

            act(() => {
                result.current.setFindQuery("xyz");
            });

            const newContent = result.current.replaceAll();

            expect(newContent).toBeNull();
        });
    });

    describe("Content Changes", () => {
        it("should update matches when content changes", () => {
            const { result, rerender } = renderHook(({ content }) => useFindReplace({ content, isOpen: true }), {
                initialProps: { content: "hello" },
            });

            act(() => {
                result.current.setFindQuery("hello");
            });

            expect(result.current.matches.length).toBe(1);

            rerender({ content: "hello world" });

            expect(result.current.matches.length).toBe(1);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty content", () => {
            const { result } = renderHook(() => useFindReplace({ content: "", isOpen: true }));

            act(() => {
                result.current.setFindQuery("test");
            });

            expect(result.current.matches).toEqual([]);
        });

        it("should handle very long content", () => {
            const longContent = "test ".repeat(10000);
            const { result } = renderHook(() => useFindReplace({ content: longContent, isOpen: true }));

            act(() => {
                result.current.setFindQuery("test");
            });

            expect(result.current.matches.length).toBe(10000);
        });

        it("should handle special regex characters in search", () => {
            const { result } = renderHook(() => useFindReplace({ content: "a.b c*d [e]", isOpen: true }));

            act(() => {
                result.current.setFindQuery("a.b");
            });

            expect(result.current.matches.length).toBe(1);
        });

        it("should handle unicode content", () => {
            const { result } = renderHook(() => useFindReplace({ content: "Hello 世界 こんにちは", isOpen: true }));

            act(() => {
                result.current.setFindQuery("世界");
            });

            expect(result.current.matches.length).toBe(1);
        });
    });
});

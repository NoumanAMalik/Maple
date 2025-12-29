import { useState, useEffect, useCallback } from "react";
import { findAllMatches, replaceMatch, replaceAllMatches, type SearchMatch } from "@/lib/search/findInDocument";

interface UseFindReplaceProps {
    content: string;
    isOpen: boolean;
}

interface UseFindReplaceReturn {
    findQuery: string;
    setFindQuery: (query: string) => void;
    replaceQuery: string;
    setReplaceQuery: (query: string) => void;
    matches: SearchMatch[];
    currentMatchIndex: number;
    caseSensitive: boolean;
    toggleCaseSensitive: () => void;
    useRegex: boolean;
    toggleUseRegex: () => void;
    showReplace: boolean;
    toggleShowReplace: () => void;
    findNext: () => void;
    findPrevious: () => void;
    replaceCurrent: () => string | null;
    replaceAll: () => string | null;
    hasMatches: boolean;
    matchCount: number;
}

/**
 * Custom hook for managing Find & Replace functionality
 */
export function useFindReplace({ content, isOpen }: UseFindReplaceProps): UseFindReplaceReturn {
    const [findQuery, setFindQuery] = useState("");
    const [replaceQuery, setReplaceQuery] = useState("");
    const [matches, setMatches] = useState<SearchMatch[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [showReplace, setShowReplace] = useState(false);

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setCurrentMatchIndex(-1);
        }
    }, [isOpen]);

    // Search when query or options change
    useEffect(() => {
        if (!findQuery) {
            setMatches([]);
            setCurrentMatchIndex(-1);
            return;
        }

        const results = findAllMatches(content, findQuery, caseSensitive, useRegex);
        setMatches(results);
        setCurrentMatchIndex(results.length > 0 ? 0 : -1);
    }, [content, findQuery, caseSensitive, useRegex]);

    const toggleCaseSensitive = useCallback(() => {
        setCaseSensitive((prev) => !prev);
    }, []);

    const toggleUseRegex = useCallback(() => {
        setUseRegex((prev) => !prev);
    }, []);

    const toggleShowReplace = useCallback(() => {
        setShowReplace((prev) => !prev);
    }, []);

    const findNext = useCallback(() => {
        if (matches.length === 0) return;
        setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }, [matches.length]);

    const findPrevious = useCallback(() => {
        if (matches.length === 0) return;
        setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }, [matches.length]);

    const replaceCurrent = useCallback((): string | null => {
        if (matches.length === 0 || currentMatchIndex < 0) return null;

        const match = matches[currentMatchIndex];
        const newContent = replaceMatch(content, match, replaceQuery);

        return newContent;
    }, [content, matches, currentMatchIndex, replaceQuery]);

    const replaceAll = useCallback((): string | null => {
        if (matches.length === 0) return null;

        const newContent = replaceAllMatches(content, findQuery, replaceQuery, caseSensitive, useRegex);

        return newContent;
    }, [content, findQuery, replaceQuery, caseSensitive, useRegex, matches.length]);

    return {
        findQuery,
        setFindQuery,
        replaceQuery,
        setReplaceQuery,
        matches,
        currentMatchIndex,
        caseSensitive,
        toggleCaseSensitive,
        useRegex,
        toggleUseRegex,
        showReplace,
        toggleShowReplace,
        findNext,
        findPrevious,
        replaceCurrent,
        replaceAll,
        hasMatches: matches.length > 0,
        matchCount: matches.length,
    };
}

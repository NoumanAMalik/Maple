export interface SearchMatch {
    line: number;
    column: number;
    length: number;
    offset: number;
}

/**
 * Find all matches of a query in the document content
 * @param content - The document content to search
 * @param query - The search query
 * @param caseSensitive - Whether to perform case-sensitive search
 * @param useRegex - Whether to treat query as regex pattern
 * @returns Array of search matches with position information
 */
export function findAllMatches(
    content: string,
    query: string,
    caseSensitive: boolean,
    useRegex: boolean,
): SearchMatch[] {
    if (!query) return [];

    const matches: SearchMatch[] = [];
    const lines = content.split("\n");
    let offset = 0;

    let searchPattern: RegExp;
    try {
        if (useRegex) {
            searchPattern = new RegExp(query, caseSensitive ? "g" : "gi");
        } else {
            // Escape special regex characters for literal search
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            searchPattern = new RegExp(escaped, caseSensitive ? "g" : "gi");
        }
    } catch {
        return []; // Invalid regex
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Reset lastIndex for global regex
        searchPattern.lastIndex = 0;

        let match = searchPattern.exec(line);
        while (match !== null) {
            matches.push({
                line: lineNum + 1, // 1-indexed line number
                column: match.index + 1, // 1-indexed column number
                length: match[0].length,
                offset: offset + match.index,
            });

            // Prevent infinite loop on zero-length matches
            if (match[0].length === 0) {
                searchPattern.lastIndex++;
            }

            match = searchPattern.exec(line);
        }

        offset += line.length + 1; // +1 for newline character
    }

    return matches;
}

/**
 * Replace a single match in the content
 * @param content - The document content
 * @param match - The match to replace
 * @param replacement - The replacement text
 * @returns Updated content with the match replaced
 */
export function replaceMatch(content: string, match: SearchMatch, replacement: string): string {
    const before = content.substring(0, match.offset);
    const after = content.substring(match.offset + match.length);
    return before + replacement + after;
}

/**
 * Replace all matches in the content
 * @param content - The document content
 * @param query - The search query
 * @param replacement - The replacement text
 * @param caseSensitive - Whether to perform case-sensitive search
 * @param useRegex - Whether to treat query as regex pattern
 * @returns Updated content with all matches replaced
 */
export function replaceAllMatches(
    content: string,
    query: string,
    replacement: string,
    caseSensitive: boolean,
    useRegex: boolean,
): string {
    if (!query) return content;

    try {
        let searchPattern: RegExp;
        if (useRegex) {
            searchPattern = new RegExp(query, caseSensitive ? "g" : "gi");
        } else {
            // Escape special regex characters for literal search
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            searchPattern = new RegExp(escaped, caseSensitive ? "g" : "gi");
        }
        return content.replace(searchPattern, replacement);
    } catch {
        return content; // Invalid regex, return unchanged
    }
}

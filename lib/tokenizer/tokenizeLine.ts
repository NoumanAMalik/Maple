import type { LanguageId, LineState, TokenizeLineResult } from "./types";
import { javascriptTokenizer } from "./languages";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

const tokenizers = {
    javascript: javascriptTokenizer,
    typescript: javascriptTokenizer,
    plaintext: {
        languageId: "plaintext" as const,
        initialState: INITIAL_STATE,
        tokenizeLine: (_line: string): TokenizeLineResult => ({
            tokens: [],
            endState: INITIAL_STATE,
        }),
    },
};

export function getInitialLineState(language: LanguageId): LineState {
    return tokenizers[language]?.initialState ?? INITIAL_STATE;
}

export function tokenizeSingleLine(language: LanguageId, line: string, startState?: LineState): TokenizeLineResult {
    const tokenizer = tokenizers[language];
    if (!tokenizer) {
        return { tokens: [], endState: INITIAL_STATE };
    }
    return tokenizer.tokenizeLine(line, startState ?? tokenizer.initialState);
}

export function getLanguageFromFilename(filename: string): LanguageId {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    switch (ext) {
        case "js":
        case "jsx":
        case "mjs":
        case "cjs":
            return "javascript";
        case "ts":
        case "tsx":
        case "mts":
        case "cts":
            return "typescript";
        default:
            return "plaintext";
    }
}

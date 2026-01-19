import type { LanguageId, LineState } from "../types";
import type { TokenizerWorkerRequest, TokenizerWorkerResponse, SerializableLineHighlight } from "./types";
import { getInitialLineState, tokenizeSingleLine } from "../tokenizeLine";

// Shadow copy of document lines in worker
let documentLines: string[] = [];
let currentLanguage: LanguageId = "plaintext";
let highlightLines: SerializableLineHighlight[] = [];

function statesEqual(a: LineState, b: LineState): boolean {
    return a.kind === b.kind && a.templateExpressionDepth === b.templateExpressionDepth;
}

function tokenizeFullDocument(language: LanguageId, lines: string[], version: number): TokenizerWorkerResponse {
    const result: SerializableLineHighlight[] = [];
    let state = getInitialLineState(language);

    for (const lineText of lines) {
        const tokenResult = tokenizeSingleLine(language, lineText, state);
        result.push({
            stateBefore: state,
            stateAfter: tokenResult.endState,
            tokens: tokenResult.tokens,
        });
        state = tokenResult.endState;
    }

    return {
        type: "init-complete",
        version,
        lines: result,
    };
}

function tokenizeIncremental(
    language: LanguageId,
    changedFromLine: number,
    linesFromChanged: string[],
    totalLineCount: number,
    version: number,
): TokenizerWorkerResponse {
    // Update shadow document
    documentLines = [...documentLines.slice(0, changedFromLine - 1), ...linesFromChanged];

    // Ensure correct length
    if (documentLines.length > totalLineCount) {
        documentLines.length = totalLineCount;
    }

    const newHighlightLines: SerializableLineHighlight[] = [];

    // Copy unchanged lines
    const unchangedCount = Math.min(changedFromLine - 1, highlightLines.length);
    for (let i = 0; i < unchangedCount; i++) {
        newHighlightLines.push(highlightLines[i]);
    }

    // Start state from previous line or initial
    let state = unchangedCount > 0 ? newHighlightLines[unchangedCount - 1].stateAfter : getInitialLineState(language);

    let stateChanged = true;
    let i = unchangedCount;

    // Tokenize from changed line with early-exit optimization
    while (i < totalLineCount) {
        const lineText = documentLines[i] ?? "";
        const result = tokenizeSingleLine(language, lineText, state);

        const existingLine = highlightLines[i];
        if (
            !stateChanged &&
            existingLine &&
            statesEqual(existingLine.stateBefore, state) &&
            statesEqual(existingLine.stateAfter, result.endState)
        ) {
            // States match, copy remaining unchanged lines
            for (let j = i; j < highlightLines.length && j < totalLineCount; j++) {
                newHighlightLines.push(highlightLines[j]);
            }
            break;
        }

        newHighlightLines.push({
            stateBefore: state,
            stateAfter: result.endState,
            tokens: result.tokens,
        });

        stateChanged = !existingLine || !statesEqual(existingLine.stateAfter, result.endState);
        state = result.endState;
        i++;
    }

    // Fill remaining lines if needed
    while (newHighlightLines.length < totalLineCount) {
        const lineText = documentLines[newHighlightLines.length] ?? "";
        const result = tokenizeSingleLine(language, lineText, state);
        newHighlightLines.push({
            stateBefore: state,
            stateAfter: result.endState,
            tokens: result.tokens,
        });
        state = result.endState;
    }

    // Trim if needed
    if (newHighlightLines.length > totalLineCount) {
        newHighlightLines.length = totalLineCount;
    }

    // Only return the changed portion to minimize message size
    const changedLines = newHighlightLines.slice(changedFromLine - 1);

    return {
        type: "update-complete",
        version,
        changedFromLine,
        lines: changedLines,
    };
}

// Message handler
self.onmessage = (event: MessageEvent<TokenizerWorkerRequest>) => {
    const request = event.data;

    try {
        switch (request.type) {
            case "init": {
                currentLanguage = request.language;
                documentLines = [...request.lines];
                const response = tokenizeFullDocument(request.language, request.lines, request.version);
                if (response.type === "init-complete") {
                    highlightLines = response.lines;
                }
                self.postMessage(response);
                break;
            }

            case "update": {
                if (request.language !== currentLanguage) {
                    // Language changed, do full re-init
                    currentLanguage = request.language;
                    const allLines = [
                        ...documentLines.slice(0, request.changedFromLine - 1),
                        ...request.linesFromChanged,
                    ];
                    allLines.length = request.totalLineCount;
                    documentLines = allLines;
                    const response = tokenizeFullDocument(request.language, documentLines, request.version);
                    if (response.type === "init-complete") {
                        highlightLines = response.lines;
                    }
                    self.postMessage(response);
                } else {
                    const response = tokenizeIncremental(
                        request.language,
                        request.changedFromLine,
                        request.linesFromChanged,
                        request.totalLineCount,
                        request.version,
                    );
                    if (response.type === "update-complete") {
                        highlightLines = [...highlightLines.slice(0, request.changedFromLine - 1), ...response.lines];
                        highlightLines.length = request.totalLineCount;
                    }
                    self.postMessage(response);
                }
                break;
            }

            case "dispose": {
                documentLines = [];
                highlightLines = [];
                break;
            }
        }
    } catch (error) {
        const errorResponse: TokenizerWorkerResponse = {
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
            version: "version" in request ? request.version : -1,
        };
        self.postMessage(errorResponse);
    }
};

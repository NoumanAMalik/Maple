import type { LanguageId, LineState, Token } from "./types";
import { getInitialLineState, tokenizeSingleLine } from "./tokenizeLine";

export interface LineHighlight {
    stateBefore: LineState;
    stateAfter: LineState;
    tokens: Token[];
}

export interface DocumentHighlightState {
    language: LanguageId;
    lines: LineHighlight[];
    version: number;
}

function statesEqual(a: LineState, b: LineState): boolean {
    return a.kind === b.kind && a.templateExpressionDepth === b.templateExpressionDepth;
}

export function createDocumentHighlightState(
    language: LanguageId,
    getLine: (lineNumber: number) => string,
    lineCount: number,
    version: number,
): DocumentHighlightState {
    const lines: LineHighlight[] = [];
    let state = getInitialLineState(language);

    for (let i = 1; i <= lineCount; i++) {
        const lineText = getLine(i);
        const result = tokenizeSingleLine(language, lineText, state);
        lines.push({
            stateBefore: state,
            stateAfter: result.endState,
            tokens: result.tokens,
        });
        state = result.endState;
    }

    return { language, lines, version };
}

export function updateDocumentHighlightState(
    doc: DocumentHighlightState,
    getLine: (lineNumber: number) => string,
    lineCount: number,
    changedFromLine: number,
    newVersion: number,
): DocumentHighlightState {
    if (doc.version === newVersion) {
        return doc;
    }

    const { language } = doc;
    const newLines: LineHighlight[] = [];

    const unchangedCount = Math.min(changedFromLine - 1, doc.lines.length);
    for (let i = 0; i < unchangedCount; i++) {
        newLines.push(doc.lines[i]);
    }

    let state = unchangedCount > 0 ? newLines[unchangedCount - 1].stateAfter : getInitialLineState(language);
    let stateChanged = true;
    let i = unchangedCount;

    while (i < lineCount) {
        const lineText = getLine(i + 1);
        const result = tokenizeSingleLine(language, lineText, state);

        const existingLine = doc.lines[i];
        if (
            !stateChanged &&
            existingLine &&
            statesEqual(existingLine.stateBefore, state) &&
            statesEqual(existingLine.stateAfter, result.endState)
        ) {
            for (let j = i; j < doc.lines.length && j < lineCount; j++) {
                newLines.push(doc.lines[j]);
            }
            break;
        }

        newLines.push({
            stateBefore: state,
            stateAfter: result.endState,
            tokens: result.tokens,
        });

        stateChanged = !existingLine || !statesEqual(existingLine.stateAfter, result.endState);
        state = result.endState;
        i++;
    }

    while (newLines.length < lineCount) {
        const lineText = getLine(newLines.length + 1);
        const result = tokenizeSingleLine(language, lineText, state);
        newLines.push({
            stateBefore: state,
            stateAfter: result.endState,
            tokens: result.tokens,
        });
        state = result.endState;
    }

    if (newLines.length > lineCount) {
        newLines.length = lineCount;
    }

    return { language, lines: newLines, version: newVersion };
}

export function getLineTokens(doc: DocumentHighlightState, lineNumber: number): Token[] {
    const index = lineNumber - 1;
    if (index < 0 || index >= doc.lines.length) {
        return [];
    }
    return doc.lines[index].tokens;
}

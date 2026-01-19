import type { LanguageId, Token, LineState } from "../types";

// Messages from main thread TO worker
export type TokenizerWorkerRequest =
    | {
          type: "init";
          language: LanguageId;
          lines: string[];
          version: number;
      }
    | {
          type: "update";
          language: LanguageId;
          changedFromLine: number;
          linesFromChanged: string[];
          totalLineCount: number;
          version: number;
      }
    | {
          type: "dispose";
      };

// Line highlight data (serializable version)
export interface SerializableLineHighlight {
    stateBefore: LineState;
    stateAfter: LineState;
    tokens: Token[];
}

// Messages from worker TO main thread
export type TokenizerWorkerResponse =
    | {
          type: "init-complete";
          version: number;
          lines: SerializableLineHighlight[];
      }
    | {
          type: "update-complete";
          version: number;
          changedFromLine: number;
          lines: SerializableLineHighlight[];
      }
    | {
          type: "error";
          message: string;
          version: number;
      };

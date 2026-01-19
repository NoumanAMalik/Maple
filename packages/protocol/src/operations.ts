export interface InsertOp {
    type: "insert";
    pos: number;
    text: string;
}

export interface DeleteOp {
    type: "delete";
    pos: number;
    len: number;
}

export type Operation = InsertOp | DeleteOp;

export interface Position {
    line: number;
    column: number;
}

export interface Selection {
    start: Position;
    end: Position;
}

export interface Presence {
    cursor: Position;
    selection?: Selection;
}

export interface Actor {
    clientId: string;
    displayName?: string;
    color: string;
}

"use client";

import { useId } from "react";
import type { Element } from "hast";
import type { ReactNode } from "react";

interface TufteSidenoteProps {
    node: Element;
    children?: ReactNode;
}

export function TufteSidenote({ children }: TufteSidenoteProps): ReactNode {
    const id = useId();

    return (
        <>
            <label htmlFor={id} className="margin-toggle sidenote-number" />
            <input id={id} type="checkbox" className="margin-toggle" />
            <span className="sidenote">{children}</span>
        </>
    );
}

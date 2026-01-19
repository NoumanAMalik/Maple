"use client";

import { useId } from "react";
import type { Element } from "hast";
import type { ReactNode } from "react";

interface TufteMarginnoteProps {
    node: Element;
    children?: ReactNode;
}

export function TufteMarginnote({ children }: TufteMarginnoteProps): ReactNode {
    const id = useId();

    return (
        <>
            <label htmlFor={id} className="margin-toggle">
                ⊕
            </label>
            <input id={id} type="checkbox" className="margin-toggle" />
            <span className="marginnote">{children}</span>
        </>
    );
}

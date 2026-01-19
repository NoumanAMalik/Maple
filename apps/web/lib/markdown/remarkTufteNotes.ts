import type { Root } from "mdast";
import type { Directives } from "mdast-util-directive";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const TUFTE_DIRECTIVES = ["sidenote", "marginnote"] as const;
type TufteKind = (typeof TUFTE_DIRECTIVES)[number];

function isTufteDirective(node: Directives): node is Directives & { name: TufteKind } {
    return TUFTE_DIRECTIVES.includes(node.name as TufteKind);
}

const remarkTufteNotes: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, (node) => {
            if (node.type !== "textDirective" && node.type !== "leafDirective") {
                return;
            }

            const directive = node as Directives;
            if (!isTufteDirective(directive)) {
                return;
            }

            directive.data = directive.data || {};
            directive.data.hName = directive.name;
            directive.data.hProperties = {
                ...(directive.data.hProperties as Record<string, unknown>),
                "data-tufte-kind": directive.name,
            };
        });
    };
};

export default remarkTufteNotes;

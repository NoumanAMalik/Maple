import { describe, it, expect } from "vitest";
import { htmlTokenizer } from "./html";
import type { LineState } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

describe("HTML Tokenizer", () => {
    describe("Void Elements", () => {
        it("should tokenize <area>", () => {
            const result = htmlTokenizer.tokenizeLine("<area shape=\"rect\" coords=\"0,0,100,100\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <base>", () => {
            const result = htmlTokenizer.tokenizeLine("<base href=\"https://example.com\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <col>", () => {
            const result = htmlTokenizer.tokenizeLine("<col span=\"2\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <link>", () => {
            const result = htmlTokenizer.tokenizeLine("<link rel=\"stylesheet\" href=\"styles.css\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <meta>", () => {
            const result = htmlTokenizer.tokenizeLine("<meta charset=\"UTF-8\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <br>", () => {
            const result = htmlTokenizer.tokenizeLine("<br>", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <hr>", () => {
            const result = htmlTokenizer.tokenizeLine("<hr>", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <img>", () => {
            const result = htmlTokenizer.tokenizeLine("<img src=\"image.png\" alt=\"description\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <input>", () => {
            const result = htmlTokenizer.tokenizeLine("<input type=\"text\" name=\"username\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });
    });

    describe("Self-Closing Tags", () => {
        it("should tokenize self-closing without space <br/>", () => {
            const result = htmlTokenizer.tokenizeLine("<br/>", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(tagToken).toBeDefined();
            expect(punctuation.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize self-closing with space <br />", () => {
            const result = htmlTokenizer.tokenizeLine("<br />", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(tagToken).toBeDefined();
            expect(punctuation.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize self-closing <img />", () => {
            const result = htmlTokenizer.tokenizeLine("<img src=\"image.png\" />", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize self-closing <input />", () => {
            const result = htmlTokenizer.tokenizeLine("<input type=\"text\" />", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });
    });

    describe("Attributes", () => {
        it("should tokenize attributes without values", () => {
            const result = htmlTokenizer.tokenizeLine("<input disabled>", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize multiple attributes without values", () => {
            const result = htmlTokenizer.tokenizeLine("<input disabled readonly required>", INITIAL_STATE);
            const attrTokens = result.tokens.filter((t) => t.type === "attribute");
            expect(attrTokens.length).toBe(3);
        });

        it("should tokenize attributes with no quotes", () => {
            const result = htmlTokenizer.tokenizeLine("<div class=foo>", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(attrToken).toBeDefined();
            expect(stringToken).toBeDefined();
        });

        it("should tokenize attributes with single quotes", () => {
            const result = htmlTokenizer.tokenizeLine("<div class='foo'>", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(attrToken).toBeDefined();
            expect(stringToken).toBeDefined();
        });

        it("should tokenize attributes with double quotes", () => {
            const result = htmlTokenizer.tokenizeLine('<div class="foo">', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(attrToken).toBeDefined();
            expect(stringToken).toBeDefined();
        });

        it("should tokenize data attributes", () => {
            const result = htmlTokenizer.tokenizeLine('<div data-value="test">', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize multiple data attributes", () => {
            const result = htmlTokenizer.tokenizeLine('<div data-id="123" data-name="foo" data-active="true">', INITIAL_STATE);
            const attrTokens = result.tokens.filter((t) => t.type === "attribute");
            expect(attrTokens.length).toBe(3);
        });

        it("should tokenize event attributes", () => {
            const result = htmlTokenizer.tokenizeLine('<button onclick="handleClick()">Click</button>', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize onload attribute", () => {
            const result = htmlTokenizer.tokenizeLine('<body onload="init()">', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize onerror attribute", () => {
            const result = htmlTokenizer.tokenizeLine('<img src="image.png" onerror="handleError()">', INITIAL_STATE);
            const attrTokens = result.tokens.filter((t) => t.type === "attribute");
            expect(attrTokens.length).toBe(2);
        });

        it("should tokenize multiple attributes with mixed quotes", () => {
            const result = htmlTokenizer.tokenizeLine('<input type="text" name=\'username\' placeholder=hint disabled>', INITIAL_STATE);
            const attrTokens = result.tokens.filter((t) => t.type === "attribute");
            expect(attrTokens.length).toBe(4);
        });

        it("should tokenize attributes with escaped quotes", () => {
            const result = htmlTokenizer.tokenizeLine('<div title="Say \\"hello\\"">', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize aria attributes", () => {
            const result = htmlTokenizer.tokenizeLine('<button aria-label="Close" aria-hidden="false">', INITIAL_STATE);
            const attrTokens = result.tokens.filter((t) => t.type === "attribute");
            expect(attrTokens.length).toBe(2);
        });
    });

    describe("SVG Elements", () => {
        it("should tokenize <svg> tag", () => {
            const result = htmlTokenizer.tokenizeLine('<svg width="100" height="100">', INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <circle> tag", () => {
            const result = htmlTokenizer.tokenizeLine('<circle cx="50" cy="50" r="40" />', INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <path> tag", () => {
            const result = htmlTokenizer.tokenizeLine('<path d="M10 10 L90 90" />', INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <rect> tag", () => {
            const result = htmlTokenizer.tokenizeLine('<rect x="10" y="10" width="80" height="80" />', INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });
    });

    describe("DOCTYPE Declarations", () => {
        it("should tokenize <!DOCTYPE html>", () => {
            const result = htmlTokenizer.tokenizeLine("<!DOCTYPE html>", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize <!DOCTYPE HTML> (uppercase)", () => {
            const result = htmlTokenizer.tokenizeLine("<!DOCTYPE HTML>", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize legacy DOCTYPE", () => {
            const result = htmlTokenizer.tokenizeLine('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">', INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Comments", () => {
        it("should tokenize single-line comments", () => {
            const result = htmlTokenizer.tokenizeLine("<!-- This is a comment -->", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle multi-line comment start", () => {
            const result = htmlTokenizer.tokenizeLine("<!-- This is the start", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should continue multi-line comment", () => {
            const result = htmlTokenizer.tokenizeLine("middle of comment", { kind: "block-comment", templateExpressionDepth: 0 });
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should close multi-line comment", () => {
            const result = htmlTokenizer.tokenizeLine("end of comment -->", { kind: "block-comment", templateExpressionDepth: 0 });
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle comment with code after", () => {
            const result = htmlTokenizer.tokenizeLine("<!-- comment --> <div>", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(commentToken).toBeDefined();
            expect(tagToken).toBeDefined();
        });
    });

    describe("HTML Entities", () => {
        it("should tokenize named entities", () => {
            const result = htmlTokenizer.tokenizeLine("&nbsp;&lt;&gt;&amp;&quot;", INITIAL_STATE);
            const constantTokens = result.tokens.filter((t) => t.type === "constant");
            expect(constantTokens.length).toBeGreaterThanOrEqual(4);
        });

        it("should tokenize numeric entities", () => {
            const result = htmlTokenizer.tokenizeLine("&#65;&#66;&#67;", INITIAL_STATE);
            const constantTokens = result.tokens.filter((t) => t.type === "constant");
            expect(constantTokens.length).toBe(3);
        });

        it("should tokenize hex entities", () => {
            const result = htmlTokenizer.tokenizeLine("&#x41;&#x42;&#x43;", INITIAL_STATE);
            const constantTokens = result.tokens.filter((t) => t.type === "constant");
            expect(constantTokens.length).toBe(3);
        });

        it("should tokenize uppercase hex entities", () => {
            const result = htmlTokenizer.tokenizeLine("&#X41;&#X42;", INITIAL_STATE);
            const constantTokens = result.tokens.filter((t) => t.type === "constant");
            expect(constantTokens.length).toBe(2);
        });
    });

    describe("Closing Tags", () => {
        it("should tokenize simple closing tag", () => {
            const result = htmlTokenizer.tokenizeLine("</div>", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(tagToken).toBeDefined();
            expect(punctuation.length).toBe(2); // </ and >
        });

        it("should tokenize closing tag with whitespace", () => {
            const result = htmlTokenizer.tokenizeLine("</div  >", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize multiple closing tags", () => {
            const result = htmlTokenizer.tokenizeLine("</div></span></p>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(3);
        });
    });

    describe("Unclosed Tags", () => {
        it("should handle unclosed opening tag", () => {
            const result = htmlTokenizer.tokenizeLine("<div class=\"foo\"", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle tag without closing bracket", () => {
            const result = htmlTokenizer.tokenizeLine("<div", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should handle unclosed attribute value", () => {
            const result = htmlTokenizer.tokenizeLine('<div class="foo', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });
    });

    describe("Malformed HTML", () => {
        it("should handle missing closing bracket", () => {
            const result = htmlTokenizer.tokenizeLine("<div class=\"foo\"", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should handle unclosed quotes in attributes", () => {
            const result = htmlTokenizer.tokenizeLine('<div class="unclosed>', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should handle mismatched quotes", () => {
            const result = htmlTokenizer.tokenizeLine('<div class="value\'>', INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should handle tag with no name", () => {
            const result = htmlTokenizer.tokenizeLine("<>", INITIAL_STATE);
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(punctuation.length).toBeGreaterThanOrEqual(1);
        });

        it("should handle multiple equals signs", () => {
            const result = htmlTokenizer.tokenizeLine('<div class=="foo">', INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Standard HTML Tags", () => {
        it("should tokenize <div> tag", () => {
            const result = htmlTokenizer.tokenizeLine("<div></div>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(2);
        });

        it("should tokenize <span> tag", () => {
            const result = htmlTokenizer.tokenizeLine("<span class=\"highlight\">", INITIAL_STATE);
            const tagToken = result.tokens.find((t) => t.type === "tag");
            expect(tagToken).toBeDefined();
        });

        it("should tokenize <p> tag", () => {
            const result = htmlTokenizer.tokenizeLine("<p>Paragraph text</p>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(2);
        });

        it("should tokenize heading tags", () => {
            const result = htmlTokenizer.tokenizeLine("<h1>Title</h1>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(2);
        });

        it("should tokenize <a> tag with href", () => {
            const result = htmlTokenizer.tokenizeLine('<a href="https://example.com">Link</a>', INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(tagTokens.length).toBe(2);
            expect(attrToken).toBeDefined();
        });

        it("should tokenize <ul> and <li> tags", () => {
            const result = htmlTokenizer.tokenizeLine("<ul><li>Item</li></ul>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(4);
        });

        it("should tokenize <table> tags", () => {
            const result = htmlTokenizer.tokenizeLine("<table><tr><td>Cell</td></tr></table>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(6);
        });

        it("should tokenize <form> and <input> tags", () => {
            const result = htmlTokenizer.tokenizeLine('<form><input type="text"></form>', INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe("Complex HTML", () => {
        it("should handle nested tags", () => {
            const result = htmlTokenizer.tokenizeLine("<div><span><a>Link</a></span></div>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(6);
        });

        it("should handle tags with multiple attributes", () => {
            const result = htmlTokenizer.tokenizeLine('<div id="main" class="container" data-value="123" style="color: red;">', INITIAL_STATE);
            const attrTokens = result.tokens.filter((t) => t.type === "attribute");
            expect(attrTokens.length).toBe(4);
        });

        it("should handle mixed content", () => {
            const result = htmlTokenizer.tokenizeLine('<!-- Comment --> <div class="test">Text &nbsp; Entity</div>', INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(commentToken).toBeDefined();
            expect(tagTokens.length).toBeGreaterThanOrEqual(2);
            expect(constantToken).toBeDefined();
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty lines", () => {
            const result = htmlTokenizer.tokenizeLine("", INITIAL_STATE);
            expect(result.tokens.length).toBe(0);
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle whitespace-only lines", () => {
            const result = htmlTokenizer.tokenizeLine("    ", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle tabs", () => {
            const result = htmlTokenizer.tokenizeLine("\t<div>", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle tags with hyphens in names", () => {
            const result = htmlTokenizer.tokenizeLine("<custom-element></custom-element>", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBe(2);
        });
    });
});

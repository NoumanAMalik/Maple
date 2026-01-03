import { describe, it, expect } from "vitest";
import { cssTokenizer } from "./css";
import type { LineState } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

describe("CSS Tokenizer", () => {
    describe("At-Rules", () => {
        it("should tokenize @media with complex queries", () => {
            const result = cssTokenizer.tokenizeLine("@media (min-width: 768px) and (max-width: 1024px) {", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @keyframes with percentage values", () => {
            const result = cssTokenizer.tokenizeLine("@keyframes slide { 0% { left: 0; } 100% { left: 100%; } }", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @font-face with multiple descriptors", () => {
            const result = cssTokenizer.tokenizeLine("@font-face {", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @supports with logical operators", () => {
            const result = cssTokenizer.tokenizeLine("@supports (display: grid) {", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @container queries", () => {
            const result = cssTokenizer.tokenizeLine("@container (min-width: 400px) {", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @import", () => {
            const result = cssTokenizer.tokenizeLine("@import url('styles.css');", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @charset", () => {
            const result = cssTokenizer.tokenizeLine("@charset \"UTF-8\";", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });

        it("should tokenize @page", () => {
            const result = cssTokenizer.tokenizeLine("@page { margin: 1in; }", INITIAL_STATE);
            const keyword = result.tokens.find((t) => t.type === "keyword");
            expect(keyword).toBeDefined();
        });
    });

    describe("CSS Functions", () => {
        it("should tokenize rgb() function", () => {
            const result = cssTokenizer.tokenizeLine("color: rgb(255, 0, 0);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize rgba() with alpha channel", () => {
            const result = cssTokenizer.tokenizeLine("background: rgba(0, 0, 0, 0.5);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize hsl() function", () => {
            const result = cssTokenizer.tokenizeLine("color: hsl(120, 100%, 50%);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize hsla() with alpha", () => {
            const result = cssTokenizer.tokenizeLine("color: hsla(240, 100%, 50%, 0.3);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize calc() with nested operations", () => {
            const result = cssTokenizer.tokenizeLine("width: calc(100% - 20px);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize calc() with complex expressions", () => {
            const result = cssTokenizer.tokenizeLine("width: calc((100% / 3) - (2 * 10px));", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize linear-gradient() with multiple stops", () => {
            const result = cssTokenizer.tokenizeLine("background: linear-gradient(to right, red, yellow, green);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize radial-gradient() with positions", () => {
            const result = cssTokenizer.tokenizeLine("background: radial-gradient(circle at center, red 0%, blue 100%);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize var() with fallback", () => {
            const result = cssTokenizer.tokenizeLine("color: var(--primary-color, #000);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize clamp() function", () => {
            const result = cssTokenizer.tokenizeLine("font-size: clamp(1rem, 2.5vw, 2rem);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize min() function", () => {
            const result = cssTokenizer.tokenizeLine("width: min(100%, 500px);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize max() function", () => {
            const result = cssTokenizer.tokenizeLine("height: max(200px, 50vh);", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize url() function", () => {
            const result = cssTokenizer.tokenizeLine("background: url('image.png');", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize transform functions", () => {
            const result = cssTokenizer.tokenizeLine("transform: translateX(10px) rotate(45deg) scale(1.5);", INITIAL_STATE);
            const funcTokens = result.tokens.filter((t) => t.type === "function");
            expect(funcTokens.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe("Selectors", () => {
        it("should tokenize attribute selector [attr]", () => {
            const result = cssTokenizer.tokenizeLine("input[type] {", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize attribute selector [attr=value]", () => {
            const result = cssTokenizer.tokenizeLine("input[type=\"text\"] {", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize attribute selector [attr~=value]", () => {
            const result = cssTokenizer.tokenizeLine("div[class~=\"active\"] {", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize attribute selector [attr^=value]", () => {
            const result = cssTokenizer.tokenizeLine("a[href^=\"https\"] {", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize attribute selector [attr$=value]", () => {
            const result = cssTokenizer.tokenizeLine("img[src$=\".png\"] {", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize attribute selector [attr*=value]", () => {
            const result = cssTokenizer.tokenizeLine("a[href*=\"example\"] {", INITIAL_STATE);
            const attrToken = result.tokens.find((t) => t.type === "attribute");
            expect(attrToken).toBeDefined();
        });

        it("should tokenize class selectors", () => {
            const result = cssTokenizer.tokenizeLine(".container .item {", INITIAL_STATE);
            const classTokens = result.tokens.filter((t) => t.type === "class");
            expect(classTokens.length).toBe(2);
        });

        it("should tokenize ID selectors", () => {
            const result = cssTokenizer.tokenizeLine("#header #nav {", INITIAL_STATE);
            const idTokens = result.tokens.filter((t) => t.type === "constant");
            expect(idTokens.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize tag selectors", () => {
            const result = cssTokenizer.tokenizeLine("div p span {", INITIAL_STATE);
            const tagTokens = result.tokens.filter((t) => t.type === "tag");
            expect(tagTokens.length).toBeGreaterThanOrEqual(3);
        });

        it("should tokenize universal selector", () => {
            const result = cssTokenizer.tokenizeLine("* { margin: 0; }", INITIAL_STATE);
            const operator = result.tokens.find((t) => t.type === "operator");
            expect(operator).toBeDefined();
        });
    });

    describe("Pseudo-classes and Pseudo-elements", () => {
        it("should tokenize ::before pseudo-element", () => {
            const result = cssTokenizer.tokenizeLine("div::before {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "identifier" || t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize ::after pseudo-element", () => {
            const result = cssTokenizer.tokenizeLine("div::after {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "identifier" || t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize ::first-line pseudo-element", () => {
            const result = cssTokenizer.tokenizeLine("p::first-line {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "identifier" || t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize ::selection pseudo-element", () => {
            const result = cssTokenizer.tokenizeLine("::selection {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "identifier" || t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize :hover pseudo-class", () => {
            const result = cssTokenizer.tokenizeLine("a:hover {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize :nth-child() with parameter", () => {
            const result = cssTokenizer.tokenizeLine("li:nth-child(2n+1) {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize :not() pseudo-class", () => {
            const result = cssTokenizer.tokenizeLine("div:not(.active) {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize :first-child", () => {
            const result = cssTokenizer.tokenizeLine("li:first-child {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });

        it("should tokenize :last-child", () => {
            const result = cssTokenizer.tokenizeLine("li:last-child {", INITIAL_STATE);
            const pseudoToken = result.tokens.find((t) => t.type === "keyword");
            expect(pseudoToken).toBeDefined();
        });
    });

    describe("Colors", () => {
        it("should tokenize 3-digit hex colors", () => {
            const result = cssTokenizer.tokenizeLine("color: #f00;", INITIAL_STATE);
            const hexToken = result.tokens.find((t) => t.type === "constant");
            expect(hexToken).toBeDefined();
        });

        it("should tokenize 6-digit hex colors", () => {
            const result = cssTokenizer.tokenizeLine("color: #ff0000;", INITIAL_STATE);
            const hexToken = result.tokens.find((t) => t.type === "constant");
            expect(hexToken).toBeDefined();
        });

        it("should tokenize 8-digit hex colors with alpha", () => {
            const result = cssTokenizer.tokenizeLine("color: #ff0000ff;", INITIAL_STATE);
            const hexToken = result.tokens.find((t) => t.type === "constant");
            expect(hexToken).toBeDefined();
        });

        it("should tokenize 4-digit hex colors with alpha", () => {
            const result = cssTokenizer.tokenizeLine("color: #f00f;", INITIAL_STATE);
            const hexToken = result.tokens.find((t) => t.type === "constant");
            expect(hexToken).toBeDefined();
        });
    });

    describe("Numbers and Units", () => {
        it("should tokenize pixel values", () => {
            const result = cssTokenizer.tokenizeLine("width: 100px;", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize em values", () => {
            const result = cssTokenizer.tokenizeLine("font-size: 1.5em;", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize percentage values", () => {
            const result = cssTokenizer.tokenizeLine("width: 50%;", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize rem values", () => {
            const result = cssTokenizer.tokenizeLine("padding: 2rem;", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize viewport units", () => {
            const result = cssTokenizer.tokenizeLine("height: 100vh; width: 100vw;", INITIAL_STATE);
            const numberTokens = result.tokens.filter((t) => t.type === "number");
            expect(numberTokens.length).toBe(2);
        });

        it("should tokenize decimal numbers", () => {
            const result = cssTokenizer.tokenizeLine("opacity: 0.5;", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize numbers without units", () => {
            const result = cssTokenizer.tokenizeLine("z-index: 100;", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });
    });

    describe("Comments", () => {
        it("should tokenize single-line block comments", () => {
            const result = cssTokenizer.tokenizeLine("/* comment */ .class {", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle multi-line comment start", () => {
            const result = cssTokenizer.tokenizeLine("/* start of comment", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should continue multi-line comment", () => {
            const result = cssTokenizer.tokenizeLine("middle of comment", { kind: "block-comment", templateExpressionDepth: 0 });
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("block-comment");
        });

        it("should close multi-line comment", () => {
            const result = cssTokenizer.tokenizeLine("end of comment */", { kind: "block-comment", templateExpressionDepth: 0 });
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });
    });

    describe("Strings", () => {
        it("should tokenize double-quoted strings", () => {
            const result = cssTokenizer.tokenizeLine('content: "hello";', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize single-quoted strings", () => {
            const result = cssTokenizer.tokenizeLine("content: 'world';", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should handle escape sequences", () => {
            const result = cssTokenizer.tokenizeLine('content: "line1\\nline2";', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should handle escaped quotes", () => {
            const result = cssTokenizer.tokenizeLine('content: "say \\"hello\\"";', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should handle unclosed strings", () => {
            const result = cssTokenizer.tokenizeLine('content: "unclosed', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });
    });

    describe("Complex Nesting", () => {
        it("should handle nested selectors", () => {
            const result = cssTokenizer.tokenizeLine(".parent { .child { color: red; } }", INITIAL_STATE);
            const classTokens = result.tokens.filter((t) => t.type === "class");
            expect(classTokens.length).toBe(2);
        });

        it("should handle multiple selector combinations", () => {
            const result = cssTokenizer.tokenizeLine(".parent > .child + .sibling ~ .other {", INITIAL_STATE);
            const classTokens = result.tokens.filter((t) => t.type === "class");
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(classTokens.length).toBe(4);
            expect(operators.length).toBeGreaterThanOrEqual(3);
        });

        it("should handle complex selector chains", () => {
            const result = cssTokenizer.tokenizeLine("div#id.class[attr]:hover::before {", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Properties", () => {
        it("should tokenize property names", () => {
            const result = cssTokenizer.tokenizeLine("background-color: red;", INITIAL_STATE);
            const propertyToken = result.tokens.find((t) => t.type === "property");
            expect(propertyToken).toBeDefined();
        });

        it("should tokenize custom properties (CSS variables)", () => {
            const result = cssTokenizer.tokenizeLine("--primary-color: #ff0000;", INITIAL_STATE);
            const propertyToken = result.tokens.find((t) => t.type === "property");
            expect(propertyToken).toBeDefined();
        });

        it("should tokenize vendor prefixed properties", () => {
            const result = cssTokenizer.tokenizeLine("-webkit-transform: rotate(45deg);", INITIAL_STATE);
            const propertyToken = result.tokens.find((t) => t.type === "property");
            expect(propertyToken).toBeDefined();
        });
    });

    describe("Operators and Punctuation", () => {
        it("should tokenize colons", () => {
            const result = cssTokenizer.tokenizeLine("color: red;", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(1);
        });

        it("should tokenize semicolons", () => {
            const result = cssTokenizer.tokenizeLine("color: red;", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.some((t) => t.length === 1)).toBe(true);
        });

        it("should tokenize braces", () => {
            const result = cssTokenizer.tokenizeLine(".class { }", INITIAL_STATE);
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(punctuation.length).toBe(2);
        });

        it("should tokenize parentheses", () => {
            const result = cssTokenizer.tokenizeLine("rgba(255, 0, 0, 0.5)", INITIAL_STATE);
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(punctuation.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize combinators", () => {
            const result = cssTokenizer.tokenizeLine(".a > .b + .c ~ .d", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty lines", () => {
            const result = cssTokenizer.tokenizeLine("", INITIAL_STATE);
            expect(result.tokens.length).toBe(0);
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle whitespace-only lines", () => {
            const result = cssTokenizer.tokenizeLine("    ", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle multiple spaces", () => {
            const result = cssTokenizer.tokenizeLine(".class     {", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle tabs", () => {
            const result = cssTokenizer.tokenizeLine("\t.class {", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle !important", () => {
            const result = cssTokenizer.tokenizeLine("color: red !important;", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });
});

import { describe, it, expect } from "vitest";
import { pythonTokenizer } from "./python";
import { cssTokenizer } from "./css";
import { htmlTokenizer } from "./html";
import { markdownTokenizer } from "./markdown";
import { jsonTokenizer } from "./json";
import type { LineState } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

describe("Python Tokenizer", () => {
    it("should tokenize keywords", () => {
        const result = pythonTokenizer.tokenizeLine("def foo(x):", INITIAL_STATE);
        const keywords = result.tokens.filter((t) => t.type === "keyword");
        expect(keywords.length).toBeGreaterThan(0);
    });

    it("should tokenize strings with prefixes", () => {
        const result = pythonTokenizer.tokenizeLine('msg = f"Hello {name}"', INITIAL_STATE);
        const strings = result.tokens.filter((t) => t.type === "string");
        expect(strings.length).toBe(1);
    });

    it("should tokenize triple-quoted strings", () => {
        const result = pythonTokenizer.tokenizeLine('"""docstring', INITIAL_STATE);
        expect(result.endState.kind).toBe("triple-string");
    });

    it("should close triple-quoted strings", () => {
        const startState: LineState = { kind: "triple-string", templateExpressionDepth: 1 };
        const result = pythonTokenizer.tokenizeLine('end"""', startState);
        expect(result.endState.kind).toBe("normal");
    });

    it("should tokenize decorators", () => {
        const result = pythonTokenizer.tokenizeLine("@staticmethod", INITIAL_STATE);
        const tokens = result.tokens;
        expect(tokens[0].type).toBe("keyword"); // @
        expect(tokens[1].type).toBe("function"); // staticmethod
    });

    it("should tokenize builtins", () => {
        const result = pythonTokenizer.tokenizeLine("print(len(data))", INITIAL_STATE);
        const functions = result.tokens.filter((t) => t.type === "function");
        expect(functions.length).toBe(2); // print and len
    });

    it("should tokenize comments", () => {
        const result = pythonTokenizer.tokenizeLine("x = 1  # comment", INITIAL_STATE);
        const comment = result.tokens.find((t) => t.type === "comment");
        expect(comment).toBeDefined();
    });

    it("should tokenize numbers", () => {
        const result = pythonTokenizer.tokenizeLine("x = 0x1A + 0b1010 + 1.5e10 + 3j", INITIAL_STATE);
        const numbers = result.tokens.filter((t) => t.type === "number");
        expect(numbers.length).toBe(4);
    });

    it("should recognize class names", () => {
        const result = pythonTokenizer.tokenizeLine("class MyClass:", INITIAL_STATE);
        const classToken = result.tokens.find((t) => t.type === "class");
        expect(classToken).toBeDefined();
    });
});

describe("CSS Tokenizer", () => {
    it("should tokenize at-rules", () => {
        const result = cssTokenizer.tokenizeLine("@media (max-width: 768px) {", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined();
    });

    it("should tokenize properties", () => {
        const result = cssTokenizer.tokenizeLine("  color: red;", INITIAL_STATE);
        const property = result.tokens.find((t) => t.type === "property");
        expect(property).toBeDefined();
    });

    it("should tokenize hex colors", () => {
        const result = cssTokenizer.tokenizeLine("background: #FF5733;", INITIAL_STATE);
        const hexColor = result.tokens.find((t) => t.type === "constant" && t.start > 10);
        expect(hexColor).toBeDefined();
    });

    it("should tokenize class selectors", () => {
        const result = cssTokenizer.tokenizeLine(".my-class {", INITIAL_STATE);
        const classToken = result.tokens.find((t) => t.type === "class");
        expect(classToken).toBeDefined();
    });

    it("should tokenize ID selectors", () => {
        const result = cssTokenizer.tokenizeLine("#my-id {", INITIAL_STATE);
        const idToken = result.tokens.find((t) => t.type === "constant");
        expect(idToken).toBeDefined();
    });

    it("should tokenize pseudo-classes", () => {
        const result = cssTokenizer.tokenizeLine("a:hover {", INITIAL_STATE);
        const pseudo = result.tokens.find((t) => t.type === "keyword" && t.start > 0);
        expect(pseudo).toBeDefined();
    });

    it("should tokenize functions", () => {
        const result = cssTokenizer.tokenizeLine("background: linear-gradient(red, blue);", INITIAL_STATE);
        const func = result.tokens.find((t) => t.type === "function");
        expect(func).toBeDefined();
    });

    it("should handle block comments", () => {
        const result = cssTokenizer.tokenizeLine("/* comment", INITIAL_STATE);
        expect(result.endState.kind).toBe("block-comment");

        const result2 = cssTokenizer.tokenizeLine(" end */", result.endState);
        expect(result2.endState.kind).toBe("normal");
    });

    it("should tokenize numbers with units", () => {
        const result = cssTokenizer.tokenizeLine("width: 100px; font-size: 2em; opacity: 0.5;", INITIAL_STATE);
        const numbers = result.tokens.filter((t) => t.type === "number");
        expect(numbers.length).toBe(3);
    });
});

describe("HTML Tokenizer", () => {
    it("should tokenize tags", () => {
        const result = htmlTokenizer.tokenizeLine("<div>content</div>", INITIAL_STATE);
        const tags = result.tokens.filter((t) => t.type === "tag");
        expect(tags.length).toBe(2);
    });

    it("should tokenize attributes", () => {
        const result = htmlTokenizer.tokenizeLine('<div class="container" id="main">', INITIAL_STATE);
        const attributes = result.tokens.filter((t) => t.type === "attribute");
        expect(attributes.length).toBe(2);
    });

    it("should tokenize attribute values", () => {
        const result = htmlTokenizer.tokenizeLine('<img src="image.jpg" alt="Image">', INITIAL_STATE);
        const strings = result.tokens.filter((t) => t.type === "string");
        expect(strings.length).toBe(2);
    });

    it("should tokenize self-closing tags", () => {
        const result = htmlTokenizer.tokenizeLine("<br />", INITIAL_STATE);
        const tag = result.tokens.find((t) => t.type === "tag");
        expect(tag).toBeDefined();
    });

    it("should tokenize DOCTYPE", () => {
        const result = htmlTokenizer.tokenizeLine("<!DOCTYPE html>", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined();
    });

    it("should handle HTML comments", () => {
        const result = htmlTokenizer.tokenizeLine("<!-- comment", INITIAL_STATE);
        expect(result.endState.kind).toBe("block-comment");

        const result2 = htmlTokenizer.tokenizeLine(" end -->", result.endState);
        expect(result2.endState.kind).toBe("normal");
    });

    it("should tokenize entities", () => {
        const result = htmlTokenizer.tokenizeLine("&lt; &nbsp; &#x20;", INITIAL_STATE);
        const constants = result.tokens.filter((t) => t.type === "constant");
        expect(constants.length).toBe(3);
    });

    it("should tokenize closing tags", () => {
        const result = htmlTokenizer.tokenizeLine("</div>", INITIAL_STATE);
        const punctuation = result.tokens.filter((t) => t.type === "punctuation");
        expect(punctuation.length).toBe(2); // </ and >
    });
});

describe("Markdown Tokenizer", () => {
    it("should tokenize headings", () => {
        const result = markdownTokenizer.tokenizeLine("# Heading 1", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined();
    });

    it("should tokenize inline code", () => {
        const result = markdownTokenizer.tokenizeLine("Use `const` keyword", INITIAL_STATE);
        const string = result.tokens.find((t) => t.type === "string");
        expect(string).toBeDefined();
    });

    it("should tokenize bold with **", () => {
        const result = markdownTokenizer.tokenizeLine("This is **bold** text", INITIAL_STATE);
        const keywords = result.tokens.filter((t) => t.type === "keyword");
        expect(keywords.length).toBe(2); // Opening and closing **
    });

    it("should tokenize italic with *", () => {
        const result = markdownTokenizer.tokenizeLine("This is *italic* text", INITIAL_STATE);
        const keywords = result.tokens.filter((t) => t.type === "keyword");
        expect(keywords.length).toBe(2);
    });

    it("should tokenize links", () => {
        const result = markdownTokenizer.tokenizeLine("[link text](https://example.com)", INITIAL_STATE);
        const string = result.tokens.find((t) => t.type === "string");
        const constant = result.tokens.find((t) => t.type === "constant");
        expect(string).toBeDefined(); // link text
        expect(constant).toBeDefined(); // url
    });

    it("should tokenize images", () => {
        const result = markdownTokenizer.tokenizeLine("![alt text](image.jpg)", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined(); // !
    });

    it("should tokenize list items", () => {
        const result = markdownTokenizer.tokenizeLine("- List item", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined();
    });

    it("should tokenize blockquotes", () => {
        const result = markdownTokenizer.tokenizeLine("> Quote", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined();
    });

    it("should tokenize horizontal rules", () => {
        const result = markdownTokenizer.tokenizeLine("---", INITIAL_STATE);
        const keyword = result.tokens.find((t) => t.type === "keyword");
        expect(keyword).toBeDefined();
    });

    it("should handle code blocks", () => {
        const result = markdownTokenizer.tokenizeLine("```javascript", INITIAL_STATE);
        expect(result.endState.kind).toBe("block-comment");

        const result2 = markdownTokenizer.tokenizeLine("const x = 1;", result.endState);
        expect(result2.endState.kind).toBe("block-comment");

        const result3 = markdownTokenizer.tokenizeLine("```", result2.endState);
        expect(result3.endState.kind).toBe("normal");
    });

    it("should tokenize strikethrough", () => {
        const result = markdownTokenizer.tokenizeLine("~~strikethrough~~", INITIAL_STATE);
        const keywords = result.tokens.filter((t) => t.type === "keyword");
        expect(keywords.length).toBe(2);
    });
});

describe("JSON Tokenizer", () => {
    it("should tokenize object keys as properties", () => {
        const result = jsonTokenizer.tokenizeLine('  "name": "value",', INITIAL_STATE);
        const property = result.tokens.find((t) => t.type === "property");
        expect(property).toBeDefined();
    });

    it("should tokenize string values", () => {
        const result = jsonTokenizer.tokenizeLine('  "key": "value"', INITIAL_STATE);
        const strings = result.tokens.filter((t) => t.type === "string");
        expect(strings.length).toBe(1); // "value"
    });

    it("should tokenize numbers", () => {
        const result = jsonTokenizer.tokenizeLine('  "count": 42,', INITIAL_STATE);
        const number = result.tokens.find((t) => t.type === "number");
        expect(number).toBeDefined();
    });

    it("should tokenize negative numbers", () => {
        const result = jsonTokenizer.tokenizeLine('  "temp": -273.15', INITIAL_STATE);
        const number = result.tokens.find((t) => t.type === "number");
        expect(number).toBeDefined();
    });

    it("should tokenize scientific notation", () => {
        const result = jsonTokenizer.tokenizeLine('  "value": 1.5e10', INITIAL_STATE);
        const number = result.tokens.find((t) => t.type === "number");
        expect(number).toBeDefined();
    });

    it("should tokenize boolean constants", () => {
        const result = jsonTokenizer.tokenizeLine('  "active": true, "disabled": false', INITIAL_STATE);
        const constants = result.tokens.filter((t) => t.type === "constant");
        expect(constants.length).toBe(2);
    });

    it("should tokenize null", () => {
        const result = jsonTokenizer.tokenizeLine('  "data": null', INITIAL_STATE);
        const constant = result.tokens.find((t) => t.type === "constant");
        expect(constant).toBeDefined();
    });

    it("should tokenize arrays", () => {
        const result = jsonTokenizer.tokenizeLine('  "items": [1, 2, 3]', INITIAL_STATE);
        const punctuation = result.tokens.filter((t) => t.type === "punctuation");
        expect(punctuation.length).toBeGreaterThan(0);
    });

    it("should handle escape sequences in strings", () => {
        const result = jsonTokenizer.tokenizeLine('  "text": "Line 1\\nLine 2"', INITIAL_STATE);
        const string = result.tokens.find((t) => t.type === "string");
        expect(string).toBeDefined();
    });

    it("should always end in normal state", () => {
        const result = jsonTokenizer.tokenizeLine('{"key": "value"}', INITIAL_STATE);
        expect(result.endState.kind).toBe("normal");
    });
});

import { describe, it, expect } from "vitest";
import { pythonTokenizer } from "./python";
import type { LineState } from "../types";

const INITIAL_STATE: LineState = {
    kind: "normal",
    templateExpressionDepth: 0,
};

describe("Python Tokenizer", () => {
    describe("Decorators", () => {
        it("should tokenize @staticmethod decorator", () => {
            const result = pythonTokenizer.tokenizeLine("@staticmethod", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(keywordToken).toBeDefined();
            expect(funcToken).toBeDefined();
        });

        it("should tokenize @classmethod decorator", () => {
            const result = pythonTokenizer.tokenizeLine("@classmethod", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(keywordToken).toBeDefined();
            expect(funcToken).toBeDefined();
        });

        it("should tokenize @property decorator", () => {
            const result = pythonTokenizer.tokenizeLine("@property", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(keywordToken).toBeDefined();
            expect(funcToken).toBeDefined();
        });

        it("should tokenize @dataclass decorator", () => {
            const result = pythonTokenizer.tokenizeLine("@dataclass", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(keywordToken).toBeDefined();
            expect(funcToken).toBeDefined();
        });

        it("should tokenize @abstractmethod decorator", () => {
            const result = pythonTokenizer.tokenizeLine("@abstractmethod", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(keywordToken).toBeDefined();
            expect(funcToken).toBeDefined();
        });

        it("should tokenize dotted decorator @functools.lru_cache", () => {
            const result = pythonTokenizer.tokenizeLine("@functools.lru_cache", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize decorator with arguments @decorator(arg)", () => {
            const result = pythonTokenizer.tokenizeLine("@decorator(arg)", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(keywordToken).toBeDefined();
            expect(punctuation.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize decorator with multiple arguments", () => {
            const result = pythonTokenizer.tokenizeLine("@decorator(arg1, arg2, arg3)", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });

        it("should tokenize decorator with keyword arguments", () => {
            const result = pythonTokenizer.tokenizeLine("@decorator(maxsize=128)", INITIAL_STATE);
            const keywordToken = result.tokens.find((t) => t.type === "keyword");
            expect(keywordToken).toBeDefined();
        });
    });

    describe("Triple-Quoted Strings", () => {
        it("should tokenize triple-quoted string with double quotes", () => {
            const result = pythonTokenizer.tokenizeLine('"""Hello, World!"""', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should tokenize triple-quoted string with single quotes", () => {
            const result = pythonTokenizer.tokenizeLine("'''Hello, World!'''", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle triple-quoted string with content on first line", () => {
            const result = pythonTokenizer.tokenizeLine('"""content"""', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle unclosed triple-quoted string", () => {
            const result = pythonTokenizer.tokenizeLine('"""unclosed', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("triple-string");
        });

        it("should continue triple-quoted string across lines", () => {
            const result = pythonTokenizer.tokenizeLine("middle of string", {
                kind: "triple-string",
                templateExpressionDepth: 1,
            });
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("triple-string");
        });

        it("should close triple-quoted string", () => {
            const result = pythonTokenizer.tokenizeLine('end"""', {
                kind: "triple-string",
                templateExpressionDepth: 1,
            });
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle escape sequences in triple-quoted strings", () => {
            const result = pythonTokenizer.tokenizeLine('"""line1\\nline2"""', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should handle multi-line docstring", () => {
            const result1 = pythonTokenizer.tokenizeLine('"""', INITIAL_STATE);
            expect(result1.endState.kind).toBe("triple-string");

            const result2 = pythonTokenizer.tokenizeLine("This is a docstring", result1.endState);
            expect(result2.endState.kind).toBe("triple-string");

            const result3 = pythonTokenizer.tokenizeLine('"""', result2.endState);
            expect(result3.endState.kind).toBe("normal");
        });
    });

    describe("F-Strings", () => {
        it("should tokenize basic f-string", () => {
            const result = pythonTokenizer.tokenizeLine('f"hello {name}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with expressions", () => {
            const result = pythonTokenizer.tokenizeLine('f"{x + y}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with nested braces", () => {
            const result = pythonTokenizer.tokenizeLine('f"{{{x}}}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with conversion !r", () => {
            const result = pythonTokenizer.tokenizeLine('f"{x!r}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with conversion !s", () => {
            const result = pythonTokenizer.tokenizeLine('f"{x!s}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with conversion !a", () => {
            const result = pythonTokenizer.tokenizeLine('f"{x!a}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with format spec", () => {
            const result = pythonTokenizer.tokenizeLine('f"{x:.2f}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with width and precision", () => {
            const result = pythonTokenizer.tokenizeLine('f"{x:10.2f}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize uppercase F-string", () => {
            const result = pythonTokenizer.tokenizeLine('F"hello {name}"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize f-string with single quotes", () => {
            const result = pythonTokenizer.tokenizeLine("f'hello {name}'", INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });
    });

    describe("Type Hints", () => {
        it("should tokenize function with type hints", () => {
            const result = pythonTokenizer.tokenizeLine("def foo(x: int) -> str:", INITIAL_STATE);
            const defToken = result.tokens.find((t) => t.type === "keyword");
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(defToken).toBeDefined();
            expect(punctuation.length).toBeGreaterThanOrEqual(3);
        });

        it("should tokenize multiple parameters with type hints", () => {
            const result = pythonTokenizer.tokenizeLine("def add(a: int, b: int) -> int:", INITIAL_STATE);
            const defToken = result.tokens.find((t) => t.type === "keyword");
            expect(defToken).toBeDefined();
        });

        it("should tokenize optional type hints", () => {
            const result = pythonTokenizer.tokenizeLine("def foo(x: Optional[int]) -> None:", INITIAL_STATE);
            const defToken = result.tokens.find((t) => t.type === "keyword");
            expect(defToken).toBeDefined();
        });

        it("should tokenize list type hints", () => {
            const result = pythonTokenizer.tokenizeLine("def foo(items: List[str]) -> List[str]:", INITIAL_STATE);
            const defToken = result.tokens.find((t) => t.type === "keyword");
            expect(defToken).toBeDefined();
        });

        it("should tokenize dict type hints", () => {
            const result = pythonTokenizer.tokenizeLine(
                "def foo(data: Dict[str, int]) -> Dict[str, int]:",
                INITIAL_STATE,
            );
            const defToken = result.tokens.find((t) => t.type === "keyword");
            expect(defToken).toBeDefined();
        });

        it("should tokenize union type hints", () => {
            const result = pythonTokenizer.tokenizeLine("def foo(x: Union[int, str]) -> None:", INITIAL_STATE);
            const defToken = result.tokens.find((t) => t.type === "keyword");
            expect(defToken).toBeDefined();
        });

        it("should tokenize variable annotation", () => {
            const result = pythonTokenizer.tokenizeLine("name: str = 'John'", INITIAL_STATE);
            const punctuation = result.tokens.filter((t) => t.type === "punctuation");
            expect(punctuation.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Context Managers", () => {
        it("should tokenize with statement", () => {
            const result = pythonTokenizer.tokenizeLine("with open('file.txt') as f:", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(2); // with and as
        });

        it("should tokenize multiple context managers", () => {
            const result = pythonTokenizer.tokenizeLine("with open('a.txt') as a, open('b.txt') as b:", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(3);
        });

        it("should tokenize with statement and expression", () => {
            const result = pythonTokenizer.tokenizeLine("with lock:", INITIAL_STATE);
            const withToken = result.tokens.find((t) => t.type === "keyword");
            expect(withToken).toBeDefined();
        });
    });

    describe("Async Functions", () => {
        it("should tokenize async def", () => {
            const result = pythonTokenizer.tokenizeLine("async def foo():", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(2); // async and def
        });

        it("should tokenize await expression", () => {
            const result = pythonTokenizer.tokenizeLine("result = await fetch_data()", INITIAL_STATE);
            const awaitToken = result.tokens.find((t) => t.type === "keyword");
            expect(awaitToken).toBeDefined();
        });

        it("should tokenize async with", () => {
            const result = pythonTokenizer.tokenizeLine("async with session.get(url) as response:", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(3); // async, with, as
        });

        it("should tokenize async for", () => {
            const result = pythonTokenizer.tokenizeLine("async for item in iterator:", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(3); // async, for, in
        });
    });

    describe("Match/Case Statements", () => {
        it("should tokenize match statement", () => {
            const result = pythonTokenizer.tokenizeLine("match value:", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize case statement", () => {
            const result = pythonTokenizer.tokenizeLine("case 1:", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });

        it("should tokenize case with pattern", () => {
            const result = pythonTokenizer.tokenizeLine("case [x, y]:", INITIAL_STATE);
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe("Walrus Operator", () => {
        it("should tokenize walrus operator :=", () => {
            const result = pythonTokenizer.tokenizeLine("if (n := len(x)) > 0:", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize walrus in while loop", () => {
            const result = pythonTokenizer.tokenizeLine("while (line := file.readline()):", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(1);
        });

        it("should tokenize walrus in list comprehension", () => {
            const result = pythonTokenizer.tokenizeLine("[y for x in data if (y := transform(x))]", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("String Prefixes", () => {
        it("should tokenize r-string (raw string)", () => {
            const result = pythonTokenizer.tokenizeLine('r"\\n is not a newline"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize b-string (bytes)", () => {
            const result = pythonTokenizer.tokenizeLine('b"hello"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize u-string (unicode)", () => {
            const result = pythonTokenizer.tokenizeLine('u"hello"', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize uppercase string prefixes", () => {
            const result = pythonTokenizer.tokenizeLine('R"raw" F"format" B"bytes"', INITIAL_STATE);
            const stringTokens = result.tokens.filter((t) => t.type === "string");
            expect(stringTokens.length).toBe(3);
        });

        it("should tokenize triple-quoted f-string", () => {
            const result = pythonTokenizer.tokenizeLine('f"""hello {name}"""', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });

        it("should tokenize triple-quoted r-string", () => {
            const result = pythonTokenizer.tokenizeLine('r"""raw string"""', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });
    });

    describe("Keywords", () => {
        it("should tokenize def keyword", () => {
            const result = pythonTokenizer.tokenizeLine("def foo():", INITIAL_STATE);
            const defToken = result.tokens.find((t) => t.type === "keyword");
            expect(defToken).toBeDefined();
        });

        it("should tokenize class keyword", () => {
            const result = pythonTokenizer.tokenizeLine("class Foo:", INITIAL_STATE);
            const classToken = result.tokens.find((t) => t.type === "keyword");
            expect(classToken).toBeDefined();
        });

        it("should tokenize if/elif/else", () => {
            const result1 = pythonTokenizer.tokenizeLine("if x > 0:", INITIAL_STATE);
            const result2 = pythonTokenizer.tokenizeLine("elif x < 0:", INITIAL_STATE);
            const result3 = pythonTokenizer.tokenizeLine("else:", INITIAL_STATE);
            expect(result1.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result2.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result3.tokens.find((t) => t.type === "keyword")).toBeDefined();
        });

        it("should tokenize for/in loop", () => {
            const result = pythonTokenizer.tokenizeLine("for item in items:", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(2);
        });

        it("should tokenize while loop", () => {
            const result = pythonTokenizer.tokenizeLine("while True:", INITIAL_STATE);
            const whileToken = result.tokens.find((t) => t.type === "keyword");
            expect(whileToken).toBeDefined();
        });

        it("should tokenize try/except/finally", () => {
            const result1 = pythonTokenizer.tokenizeLine("try:", INITIAL_STATE);
            const result2 = pythonTokenizer.tokenizeLine("except Exception as e:", INITIAL_STATE);
            const result3 = pythonTokenizer.tokenizeLine("finally:", INITIAL_STATE);
            expect(result1.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result2.tokens.filter((t) => t.type === "keyword").length).toBeGreaterThanOrEqual(2);
            expect(result3.tokens.find((t) => t.type === "keyword")).toBeDefined();
        });

        it("should tokenize return", () => {
            const result = pythonTokenizer.tokenizeLine("return value", INITIAL_STATE);
            const returnToken = result.tokens.find((t) => t.type === "keyword");
            expect(returnToken).toBeDefined();
        });

        it("should tokenize yield", () => {
            const result = pythonTokenizer.tokenizeLine("yield value", INITIAL_STATE);
            const yieldToken = result.tokens.find((t) => t.type === "keyword");
            expect(yieldToken).toBeDefined();
        });

        it("should tokenize import/from", () => {
            const result = pythonTokenizer.tokenizeLine("from os import path", INITIAL_STATE);
            const keywords = result.tokens.filter((t) => t.type === "keyword");
            expect(keywords.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("Constants", () => {
        it("should tokenize True", () => {
            const result = pythonTokenizer.tokenizeLine("x = True", INITIAL_STATE);
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(constantToken).toBeDefined();
        });

        it("should tokenize False", () => {
            const result = pythonTokenizer.tokenizeLine("x = False", INITIAL_STATE);
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(constantToken).toBeDefined();
        });

        it("should tokenize None", () => {
            const result = pythonTokenizer.tokenizeLine("x = None", INITIAL_STATE);
            const constantToken = result.tokens.find((t) => t.type === "constant");
            expect(constantToken).toBeDefined();
        });
    });

    describe("Numbers", () => {
        it("should tokenize integers", () => {
            const result = pythonTokenizer.tokenizeLine("x = 42", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize floats", () => {
            const result = pythonTokenizer.tokenizeLine("x = 3.14", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize hex numbers", () => {
            const result = pythonTokenizer.tokenizeLine("x = 0xFF", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize binary numbers", () => {
            const result = pythonTokenizer.tokenizeLine("x = 0b1010", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize octal numbers", () => {
            const result = pythonTokenizer.tokenizeLine("x = 0o755", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize scientific notation", () => {
            const result = pythonTokenizer.tokenizeLine("x = 1.5e10", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });

        it("should tokenize complex numbers", () => {
            const result = pythonTokenizer.tokenizeLine("x = 3+4j", INITIAL_STATE);
            const numberTokens = result.tokens.filter((t) => t.type === "number");
            expect(numberTokens.length).toBeGreaterThanOrEqual(1);
        });

        it("should tokenize numbers with underscores", () => {
            const result = pythonTokenizer.tokenizeLine("x = 1_000_000", INITIAL_STATE);
            const numberToken = result.tokens.find((t) => t.type === "number");
            expect(numberToken).toBeDefined();
        });
    });

    describe("Comments", () => {
        it("should tokenize line comments", () => {
            const result = pythonTokenizer.tokenizeLine("# This is a comment", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
        });

        it("should tokenize inline comments", () => {
            const result = pythonTokenizer.tokenizeLine("x = 5  # Set x to 5", INITIAL_STATE);
            const commentToken = result.tokens.find((t) => t.type === "comment");
            expect(commentToken).toBeDefined();
        });
    });

    describe("Operators", () => {
        it("should tokenize arithmetic operators", () => {
            const result = pythonTokenizer.tokenizeLine("a + b - c * d / e % f", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBe(5);
        });

        it("should tokenize floor division operator //", () => {
            const result = pythonTokenizer.tokenizeLine("a // b", INITIAL_STATE);
            const operator = result.tokens.find((t) => t.type === "operator");
            expect(operator).toBeDefined();
        });

        it("should tokenize power operator **", () => {
            const result = pythonTokenizer.tokenizeLine("a ** b", INITIAL_STATE);
            const operator = result.tokens.find((t) => t.type === "operator");
            expect(operator).toBeDefined();
        });

        it("should tokenize comparison operators", () => {
            const result = pythonTokenizer.tokenizeLine("a == b != c < d > e <= f >= g", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(6);
        });

        it("should tokenize bitwise operators", () => {
            const result = pythonTokenizer.tokenizeLine("a & b | c ^ d ~ e << f >> g", INITIAL_STATE);
            const operators = result.tokens.filter((t) => t.type === "operator");
            expect(operators.length).toBeGreaterThanOrEqual(7);
        });

        it("should tokenize logical operators", () => {
            const result1 = pythonTokenizer.tokenizeLine("a and b", INITIAL_STATE);
            const result2 = pythonTokenizer.tokenizeLine("c or d", INITIAL_STATE);
            const result3 = pythonTokenizer.tokenizeLine("not e", INITIAL_STATE);
            expect(result1.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result2.tokens.find((t) => t.type === "keyword")).toBeDefined();
            expect(result3.tokens.find((t) => t.type === "keyword")).toBeDefined();
        });
    });

    describe("Builtins", () => {
        it("should tokenize print function", () => {
            const result = pythonTokenizer.tokenizeLine("print('hello')", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize len function", () => {
            const result = pythonTokenizer.tokenizeLine("len(items)", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize range function", () => {
            const result = pythonTokenizer.tokenizeLine("range(10)", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });

        it("should tokenize type constructors", () => {
            const result = pythonTokenizer.tokenizeLine("str(x) int(y) float(z) bool(a)", INITIAL_STATE);
            const funcTokens = result.tokens.filter((t) => t.type === "function");
            expect(funcTokens.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe("Classes", () => {
        it("should tokenize class names (PascalCase)", () => {
            const result = pythonTokenizer.tokenizeLine("class MyClass:", INITIAL_STATE);
            const classToken = result.tokens.find((t) => t.type === "class");
            expect(classToken).toBeDefined();
        });

        it("should tokenize class instantiation", () => {
            const result = pythonTokenizer.tokenizeLine("obj = MyClass()", INITIAL_STATE);
            const funcToken = result.tokens.find((t) => t.type === "function");
            expect(funcToken).toBeDefined();
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty lines", () => {
            const result = pythonTokenizer.tokenizeLine("", INITIAL_STATE);
            expect(result.tokens.length).toBe(0);
            expect(result.endState.kind).toBe("normal");
        });

        it("should handle whitespace-only lines", () => {
            const result = pythonTokenizer.tokenizeLine("    ", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle tabs", () => {
            const result = pythonTokenizer.tokenizeLine("\tdef foo():", INITIAL_STATE);
            const whitespaceToken = result.tokens.find((t) => t.type === "whitespace");
            expect(whitespaceToken).toBeDefined();
        });

        it("should handle escaped characters in strings", () => {
            const result = pythonTokenizer.tokenizeLine('"hello\\nworld\\t\\r\\""', INITIAL_STATE);
            const stringToken = result.tokens.find((t) => t.type === "string");
            expect(stringToken).toBeDefined();
        });
    });
});

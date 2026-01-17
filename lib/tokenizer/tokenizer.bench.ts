import { bench, describe } from "vitest";
import { javascriptTokenizer } from "./languages/javascript";
import { pythonTokenizer } from "./languages/python";
import { cssTokenizer } from "./languages/css";
import { htmlTokenizer } from "./languages/html";
import { markdownTokenizer } from "./languages/markdown";
import { jsonTokenizer } from "./languages/json";
import { createDocumentHighlightState, updateDocumentHighlightState } from "./documentState";

const INITIAL_STATE = {
    kind: "normal" as const,
    templateExpressionDepth: 0,
};

describe("JavaScript Tokenizer Performance", () => {
    bench("tokenize short line", () => {
        javascriptTokenizer.tokenizeLine("const x = 1;", INITIAL_STATE);
    });

    bench("tokenize medium line", () => {
        javascriptTokenizer.tokenizeLine('import { useState, useEffect } from "react";', INITIAL_STATE);
    });

    bench("tokenize long line", () => {
        javascriptTokenizer.tokenizeLine(
            "const result = data.filter(x => x.value > 0).map(x => ({ ...x, processed: true })).reduce((acc, val) => acc + val.amount, 0);",
            INITIAL_STATE,
        );
    });

    bench("tokenize with template string", () => {
        javascriptTokenizer.tokenizeLine("const msg = `Hello ${user.name}, you have ${count} items`;", INITIAL_STATE);
    });

    bench("tokenize with comments", () => {
        javascriptTokenizer.tokenizeLine("const x = 1; // This is a comment about the variable", INITIAL_STATE);
    });

    bench("tokenize 100 lines", () => {
        for (let i = 0; i < 100; i++) {
            javascriptTokenizer.tokenizeLine("const x = 1;", INITIAL_STATE);
        }
    });
});

describe("Python Tokenizer Performance", () => {
    bench("tokenize short line", () => {
        pythonTokenizer.tokenizeLine("x = 1", INITIAL_STATE);
    });

    bench("tokenize function definition", () => {
        pythonTokenizer.tokenizeLine("def calculate_total(items, tax_rate=0.08):", INITIAL_STATE);
    });

    bench("tokenize with f-string", () => {
        pythonTokenizer.tokenizeLine('result = f"Total: {sum(values):.2f}"', INITIAL_STATE);
    });

    bench("tokenize with decorator", () => {
        pythonTokenizer.tokenizeLine("@staticmethod", INITIAL_STATE);
    });

    bench("tokenize 100 lines", () => {
        for (let i = 0; i < 100; i++) {
            pythonTokenizer.tokenizeLine("x = 1", INITIAL_STATE);
        }
    });
});

describe("CSS Tokenizer Performance", () => {
    bench("tokenize short line", () => {
        cssTokenizer.tokenizeLine("  color: red;", INITIAL_STATE);
    });

    bench("tokenize selector", () => {
        cssTokenizer.tokenizeLine(".btn-primary:hover {", INITIAL_STATE);
    });

    bench("tokenize with function", () => {
        cssTokenizer.tokenizeLine("background: linear-gradient(45deg, #FF6B6B, #4ECDC4);", INITIAL_STATE);
    });

    bench("tokenize media query", () => {
        cssTokenizer.tokenizeLine("@media (max-width: 768px) and (orientation: landscape) {", INITIAL_STATE);
    });

    bench("tokenize 100 lines", () => {
        for (let i = 0; i < 100; i++) {
            cssTokenizer.tokenizeLine("  color: red;", INITIAL_STATE);
        }
    });
});

describe("HTML Tokenizer Performance", () => {
    bench("tokenize short tag", () => {
        htmlTokenizer.tokenizeLine("<div>content</div>", INITIAL_STATE);
    });

    bench("tokenize tag with attributes", () => {
        htmlTokenizer.tokenizeLine('<div class="container" id="main" data-value="123">', INITIAL_STATE);
    });

    bench("tokenize self-closing tag", () => {
        htmlTokenizer.tokenizeLine('<img src="image.jpg" alt="Image" />', INITIAL_STATE);
    });

    bench("tokenize with entities", () => {
        htmlTokenizer.tokenizeLine("&lt;div&gt; &nbsp; &#x20;", INITIAL_STATE);
    });

    bench("tokenize 100 lines", () => {
        for (let i = 0; i < 100; i++) {
            htmlTokenizer.tokenizeLine("<div>content</div>", INITIAL_STATE);
        }
    });
});

describe("Markdown Tokenizer Performance", () => {
    bench("tokenize heading", () => {
        markdownTokenizer.tokenizeLine("## Section Heading", INITIAL_STATE);
    });

    bench("tokenize with inline code", () => {
        markdownTokenizer.tokenizeLine("Use the `map()` function to transform arrays.", INITIAL_STATE);
    });

    bench("tokenize with link", () => {
        markdownTokenizer.tokenizeLine("[Documentation](https://example.com/docs)", INITIAL_STATE);
    });

    bench("tokenize with bold and italic", () => {
        markdownTokenizer.tokenizeLine("This is **bold** and this is *italic* text.", INITIAL_STATE);
    });

    bench("tokenize 100 lines", () => {
        for (let i = 0; i < 100; i++) {
            markdownTokenizer.tokenizeLine("## Section Heading", INITIAL_STATE);
        }
    });
});

describe("JSON Tokenizer Performance", () => {
    bench("tokenize short line", () => {
        jsonTokenizer.tokenizeLine('  "name": "value",', INITIAL_STATE);
    });

    bench("tokenize with number", () => {
        jsonTokenizer.tokenizeLine('  "count": 12345,', INITIAL_STATE);
    });

    bench("tokenize with boolean", () => {
        jsonTokenizer.tokenizeLine('  "active": true,', INITIAL_STATE);
    });

    bench("tokenize complex value", () => {
        jsonTokenizer.tokenizeLine('  "data": { "nested": [1, 2, 3], "flag": false },', INITIAL_STATE);
    });

    bench("tokenize 100 lines", () => {
        for (let i = 0; i < 100; i++) {
            jsonTokenizer.tokenizeLine('  "name": "value",', INITIAL_STATE);
        }
    });
});

describe("DocumentState Performance", () => {
    bench("create 100 line document", () => {
        const lines = Array(100)
            .fill(null)
            .map((_, i) => `const line${i} = ${i};`);
        const getLine = (lineNumber: number) => lines[lineNumber - 1];

        createDocumentHighlightState("javascript", getLine, lines.length, 1);
    });

    bench("create 1000 line document", () => {
        const lines = Array(1000)
            .fill(null)
            .map((_, i) => `const line${i} = ${i};`);
        const getLine = (lineNumber: number) => lines[lineNumber - 1];

        createDocumentHighlightState("javascript", getLine, lines.length, 1);
    });

    bench("update single line in 1000 line document", () => {
        const lines = Array(1000)
            .fill(null)
            .map((_, i) => `const line${i} = ${i};`);
        let getLine = (lineNumber: number) => lines[lineNumber - 1];

        const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

        lines[500] = "const modified = 999;";
        getLine = (lineNumber: number) => lines[lineNumber - 1];

        updateDocumentHighlightState(state, getLine, lines.length, 501, 2);
    });

    bench("update with multiline state change", () => {
        const lines = ["const x = 1;", "const y = 2;", "/*", " * comment", " */", "const z = 3;"];
        let getLine = (lineNumber: number) => lines[lineNumber - 1];

        const state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

        // Remove closing comment
        lines[4] = " * still comment";
        getLine = (lineNumber: number) => lines[lineNumber - 1];

        updateDocumentHighlightState(state, getLine, lines.length, 5, 2);
    });

    bench("sequential edits (10 updates)", () => {
        const lines = Array(100)
            .fill(null)
            .map((_, i) => `const line${i} = ${i};`);
        let getLine = (lineNumber: number) => lines[lineNumber - 1];

        let state = createDocumentHighlightState("javascript", getLine, lines.length, 1);

        for (let i = 0; i < 10; i++) {
            lines[i * 10] = `const modified${i} = ${i * 100};`;
            getLine = (lineNumber: number) => lines[lineNumber - 1];
            state = updateDocumentHighlightState(state, getLine, lines.length, i * 10 + 1, i + 2);
        }
    });
});

describe("Real-World Code Samples", () => {
    const reactComponent = `import React, { useState, useEffect } from 'react';

export const Counter = ({ initialValue = 0 }) => {
  const [count, setCount] = useState(initialValue);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(prev => [...prev, count]);
  }, [count]);

  return (
    <div className="counter">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
};`;

    const cssStyles = `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.button {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  background-color: #4f46e5;
  color: white;
  transition: all 0.3s ease;
}

.button:hover {
  background-color: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}`;

    const pythonCode = `class DataProcessor:
    def __init__(self, data):
        self.data = data
        self.results = []

    def process(self):
        """Process data and return results"""
        for item in self.data:
            result = self._transform(item)
            self.results.append(result)
        return self.results

    def _transform(self, item):
        return {"id": item["id"], "value": item["value"] * 2}

    @staticmethod
    def validate(data):
        return all(isinstance(x, dict) for x in data)`;

    bench("tokenize React component", () => {
        const lines = reactComponent.split("\n");
        const getLine = (lineNumber: number) => lines[lineNumber - 1];
        createDocumentHighlightState("javascript", getLine, lines.length, 1);
    });

    bench("tokenize CSS styles", () => {
        const lines = cssStyles.split("\n");
        const getLine = (lineNumber: number) => lines[lineNumber - 1];
        createDocumentHighlightState("css", getLine, lines.length, 1);
    });

    bench("tokenize Python class", () => {
        const lines = pythonCode.split("\n");
        const getLine = (lineNumber: number) => lines[lineNumber - 1];
        createDocumentHighlightState("python", getLine, lines.length, 1);
    });
});

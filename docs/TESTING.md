# Testing Documentation

Comprehensive testing guide for the Maple code editor project.

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Organization](#test-organization)
5. [Mocking](#mocking)
6. [Coverage Goals](#coverage-goals)
7. [CI/CD](#cicd)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Maple uses a comprehensive testing strategy with four types of tests:

### Testing Philosophy

#### 1. Unit Tests
Test individual functions, classes, and modules in isolation. Focus on edge cases, error handling, and core logic.

**Examples:**
- PieceTable operations (insert, delete, line operations)
- Tokenizer language rules (JavaScript, CSS, Python, etc.)
- Coordinate conversions
- Search algorithms

#### 2. Integration Tests
Test interactions between multiple modules and complex workflows that span several features.

**Examples:**
- Complete editing workflows (type → edit → save → reopen)
- FileSystem operations with nested directory structures
- Tab state persistence across file operations
- Undo/redo across complex edits

#### 3. Component Tests
Test React components with user interactions, rendering, and state management.

**Examples:**
- CodeEditor keyboard and mouse interactions
- CommandPalette fuzzy search and navigation
- FindReplaceSidebar UI interactions
- LineRenderer syntax highlighting

#### 4. Benchmark Tests
Measure performance of critical operations to prevent regressions.

**Examples:**
- PieceTable insert/delete operations at scale
- Tokenizer performance with large files
- Search performance on 10,000+ line documents

---

## Running Tests

Maple uses **Vitest** as the testing framework with **Bun** as the runtime.

### Available Commands

#### Run All Tests Once
```bash
bun test:run
```
Runs the entire test suite once and exits. Use this for CI/CD or final verification.

**Example output:**
```
✓ lib/editor/pieceTable.test.ts (98 tests) 245ms
✓ lib/tokenizer/languages/javascript.test.ts (45 tests) 123ms
✓ hooks/useEditorState.test.ts (87 tests) 456ms
...
Test Files  24 passed (24)
     Tests  850 passed (850)
```

#### Watch Mode (Development)
```bash
bun test:watch
```
Runs tests in watch mode. Tests automatically re-run when you change files. **Recommended for active development.**

**Usage:**
- Press `a` to re-run all tests
- Press `f` to re-run only failed tests
- Press `p` to filter by filename pattern
- Press `t` to filter by test name pattern
- Press `q` to quit

#### UI Mode
```bash
bun test:ui
```
Opens an interactive web UI for exploring tests, viewing results, and debugging.

**Features:**
- Visual test explorer
- Console output for each test
- Test duration and performance metrics
- Filter and search tests
- Re-run individual tests

Access at: `http://localhost:51204/__vitest__/`

#### Coverage Report
```bash
bun test:coverage
```
Generates a comprehensive coverage report showing which code is tested.

**Output formats:**
- **Terminal**: Summary statistics
- **HTML**: Interactive report at `coverage/index.html`
- **JSON**: Machine-readable at `coverage/coverage-final.json`
- **LCOV**: For CI tools at `coverage/lcov.info`

**Example:**
```bash
bun test:coverage

# Then open the HTML report
open coverage/index.html
```

#### Performance Benchmarks
```bash
bun test:bench
```
Runs performance benchmarks for critical operations.

**Example output:**
```
✓ lib/editor/pieceTable.bench.ts (12 benchmarks)
  ✓ Insert Operations
    name                                  hz     min     max    mean
    · insert 10,000 characters at end    45.2   20.1    25.3   22.1
    · insert 1,000 lines                 89.3   10.2    12.8   11.2
```

#### Code Quality Checks

**Linting:**
```bash
bun lint           # Check code style and issues
bun lint:fix       # Auto-fix issues
```

**Formatting:**
```bash
bun format         # Format code with Biome
```

**Type Checking:**
```bash
bun type-check     # Run TypeScript compiler
```

### Complete Pre-commit Check

Run all quality checks before committing:

```bash
bun lint && bun format && bun type-check && bun test:run
```

---

## Writing Tests

### Unit Tests

Unit tests verify individual functions and classes in isolation.

#### Example: Testing a Pure Function

```typescript
import { describe, it, expect } from "vitest";
import { findInDocument } from "./findInDocument";

describe("findInDocument", () => {
    it("should find all matches", () => {
        const text = "hello world hello";
        const matches = findInDocument(text, "hello", { caseSensitive: false });

        expect(matches).toHaveLength(2);
        expect(matches[0]).toEqual({ start: 0, end: 5 });
        expect(matches[1]).toEqual({ start: 12, end: 17 });
    });

    it("should handle case sensitivity", () => {
        const text = "Hello HELLO hello";
        const matches = findInDocument(text, "hello", { caseSensitive: true });

        expect(matches).toHaveLength(1);
        expect(matches[0]).toEqual({ start: 12, end: 17 });
    });

    it("should return empty array for no matches", () => {
        const text = "foo bar baz";
        const matches = findInDocument(text, "qux", { caseSensitive: false });

        expect(matches).toEqual([]);
    });
});
```

#### Example: Testing a Class

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { PieceTable } from "./pieceTable";

describe("PieceTable", () => {
    let pt: PieceTable;

    beforeEach(() => {
        pt = new PieceTable("Hello World");
    });

    describe("Insert Operations", () => {
        it("should insert at beginning", () => {
            pt.insert(0, ">>> ");
            expect(pt.getText()).toBe(">>> Hello World");
        });

        it("should insert at end", () => {
            pt.insert(11, "!");
            expect(pt.getText()).toBe("Hello World!");
        });

        it("should insert in middle", () => {
            pt.insert(5, ",");
            expect(pt.getText()).toBe("Hello, World");
        });

        it("should handle empty string insert (no-op)", () => {
            pt.insert(5, "");
            expect(pt.getText()).toBe("Hello World");
        });

        it("should clamp negative offset to 0", () => {
            pt.insert(-10, "!");
            expect(pt.getText()).toBe("!Hello World");
        });
    });

    describe("Delete Operations", () => {
        it("should delete from beginning", () => {
            pt.delete(0, 6);
            expect(pt.getText()).toBe("World");
        });

        it("should delete from end", () => {
            pt.delete(6, 5);
            expect(pt.getText()).toBe("Hello ");
        });

        it("should handle delete with length 0 (no-op)", () => {
            pt.delete(5, 0);
            expect(pt.getText()).toBe("Hello World");
        });
    });
});
```

#### Example: Testing Tokenizer

```typescript
import { describe, it, expect } from "vitest";
import { tokenizeLine } from "./tokenizeLine";
import { createDocumentState } from "./documentState";
import { javascriptRules } from "./languages/javascript";

describe("JavaScript Tokenizer", () => {
    it("should tokenize function declaration", () => {
        const state = createDocumentState();
        const { tokens } = tokenizeLine("function greet(name) {", javascriptRules, state);

        expect(tokens).toEqual([
            { type: "keyword", value: "function", start: 0, end: 8 },
            { type: "whitespace", value: " ", start: 8, end: 9 },
            { type: "function", value: "greet", start: 9, end: 14 },
            { type: "punctuation", value: "(", start: 14, end: 15 },
            { type: "identifier", value: "name", start: 15, end: 19 },
            { type: "punctuation", value: ")", start: 19, end: 20 },
            { type: "whitespace", value: " ", start: 20, end: 21 },
            { type: "punctuation", value: "{", start: 21, end: 22 },
        ]);
    });

    it("should tokenize string with escapes", () => {
        const state = createDocumentState();
        const { tokens } = tokenizeLine('"Hello \\"World\\""', javascriptRules, state);

        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toEqual({
            type: "string",
            value: '"Hello \\"World\\""',
            start: 0,
            end: 17,
        });
    });

    it("should handle multi-line comments", () => {
        const state = createDocumentState();

        // Start comment
        const line1 = tokenizeLine("/* Start comment", javascriptRules, state);
        expect(line1.state.inBlockComment).toBe(true);
        expect(line1.tokens[0].type).toBe("comment");

        // Continue comment
        const line2 = tokenizeLine("Still in comment", javascriptRules, line1.state);
        expect(line2.state.inBlockComment).toBe(true);
        expect(line2.tokens[0].type).toBe("comment");

        // End comment
        const line3 = tokenizeLine("End comment */", javascriptRules, line2.state);
        expect(line3.state.inBlockComment).toBe(false);
        expect(line3.tokens[0].type).toBe("comment");
    });
});
```

### Integration Tests

Integration tests verify complete workflows across multiple modules.

#### Example: Editor Workflow

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorState } from "./useEditorState";

describe("useEditorState - Integration Tests", () => {
    it("should handle type -> edit -> undo -> redo workflow", () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useEditorState({ onChange }));

        // Type initial content
        act(() => {
            result.current.executeCommand({ type: "insert", text: "Hello" });
        });
        expect(result.current.getContent()).toBe("Hello");

        // Edit content
        act(() => {
            result.current.executeCommand({ type: "insert", text: " World" });
        });
        expect(result.current.getContent()).toBe("Hello World");

        // Undo second edit
        act(() => {
            result.current.executeCommand({ type: "undo" });
        });
        expect(result.current.getContent()).toBe("Hello");

        // Undo first edit
        act(() => {
            result.current.executeCommand({ type: "undo" });
        });
        expect(result.current.getContent()).toBe("");

        // Redo first edit
        act(() => {
            result.current.executeCommand({ type: "redo" });
        });
        expect(result.current.getContent()).toBe("Hello");

        // Redo second edit
        act(() => {
            result.current.executeCommand({ type: "redo" });
        });
        expect(result.current.getContent()).toBe("Hello World");
    });

    it("should handle select -> cut -> navigate -> paste workflow", () => {
        const { result } = renderHook(() =>
            useEditorState({ initialContent: "First Second Third" })
        );

        // Select "Second "
        act(() => {
            result.current.setSelection({
                anchor: { line: 1, column: 7 },
                active: { line: 1, column: 14 },
            });
        });

        expect(result.current.getSelectedText()).toBe("Second ");

        // Cut selection
        act(() => {
            result.current.executeCommand({ type: "cut" });
        });
        expect(result.current.getContent()).toBe("First Third");

        // Navigate to end
        act(() => {
            result.current.setCursor({ line: 1, column: 12 });
        });

        // Paste
        act(() => {
            result.current.executeCommand({ type: "paste", text: "Second " });
        });
        expect(result.current.getContent()).toBe("First Third Second ");
    });

    it("should handle find and replace all workflow", () => {
        const { result } = renderHook(() =>
            useEditorState({ initialContent: "foo bar foo baz foo" })
        );

        // Find all "foo"
        const matches = result.current.getContent().match(/foo/g);
        expect(matches).toHaveLength(3);

        // Replace all "foo" with "qux"
        act(() => {
            const newContent = result.current.getContent().replace(/foo/g, "qux");
            result.current.executeCommand({ type: "insert", text: newContent });
            result.current.executeCommand({ type: "selectAll" });
            result.current.executeCommand({ type: "deleteSelection" });
            result.current.setCursor({ line: 1, column: 1 });
            result.current.executeCommand({ type: "insert", text: newContent });
        });

        expect(result.current.getContent()).toBe("qux bar qux baz qux");
    });
});
```

#### Example: FileSystem Integration

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystem } from "./fileSystem";
import type { FileNode, FolderNode } from "./types";

describe("FileSystem - Integration Tests", () => {
    let fs: FileSystem;

    beforeEach(async () => {
        fs = new FileSystem();
        await fs.init();
    });

    afterEach(async () => {
        await fs.clearAll();
    });

    it("should handle create -> move -> rename -> delete workflow", async () => {
        const root = await fs.getRootNode();

        // Create nested structure: /src/components/Button.tsx
        const srcFolder = await fs.createFolder(root.id, "src");
        const componentsFolder = await fs.createFolder(srcFolder.id, "components");
        const buttonFile = await fs.createFile(
            componentsFolder.id,
            "Button.tsx",
            "export const Button = () => <button />"
        );

        expect(buttonFile.path).toBe("/src/components/Button.tsx");

        // Move to /ui/Button.tsx
        const uiFolder = await fs.createFolder(root.id, "ui");
        await fs.moveNode(buttonFile.id, uiFolder.id);

        const movedFile = await fs.getNode(buttonFile.id);
        expect(movedFile?.path).toBe("/ui/Button.tsx");

        // Rename to PrimaryButton.tsx
        await fs.renameNode(buttonFile.id, "PrimaryButton.tsx");

        const renamedFile = await fs.getNode(buttonFile.id);
        expect(renamedFile?.path).toBe("/ui/PrimaryButton.tsx");
        expect(renamedFile?.name).toBe("PrimaryButton.tsx");

        // Delete file
        await fs.deleteNode(buttonFile.id);

        const deletedFile = await fs.getNode(buttonFile.id);
        expect(deletedFile).toBeUndefined();
    });

    it("should handle deep nesting and recursive operations", async () => {
        const root = await fs.getRootNode();

        // Create: /a/b/c/d/e/file.txt
        const a = await fs.createFolder(root.id, "a");
        const b = await fs.createFolder(a.id, "b");
        const c = await fs.createFolder(b.id, "c");
        const d = await fs.createFolder(c.id, "d");
        const e = await fs.createFolder(d.id, "e");
        const file = await fs.createFile(e.id, "file.txt", "deep");

        expect(file.path).toBe("/a/b/c/d/e/file.txt");

        // Recursive delete of /a
        await fs.deleteNode(a.id);

        const deletedA = await fs.getNode(a.id);
        const deletedFile = await fs.getNode(file.id);

        expect(deletedA).toBeUndefined();
        expect(deletedFile).toBeUndefined();
    });
});
```

### Component Tests

Component tests verify React components with user interactions.

#### Example: CodeEditor Component

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeEditor } from "./CodeEditor";
import type { EditorStateAPI } from "@/hooks/useEditorState";

describe("CodeEditor", () => {
    const mockEditorState: EditorStateAPI = {
        getContent: vi.fn(() => "Hello World"),
        getLine: vi.fn((line) => `Line ${line}`),
        getLineCount: vi.fn(() => 10),
        cursor: { line: 1, column: 1 },
        selection: null,
        executeCommand: vi.fn(),
        setCursor: vi.fn(),
        setSelection: vi.fn(),
        // ... other required properties
    };

    it("should render editor with content", () => {
        render(<CodeEditor editorState={mockEditorState} />);

        expect(screen.getByTestId("gutter")).toBeInTheDocument();
        expect(screen.getByTestId("line-renderer")).toBeInTheDocument();
        expect(screen.getByTestId("cursor-renderer")).toBeInTheDocument();
    });

    it("should handle keyboard shortcuts", async () => {
        const user = userEvent.setup();
        render(<CodeEditor editorState={mockEditorState} />);

        const textarea = screen.getByTestId("hidden-textarea");

        // Ctrl+A (Select All)
        await user.type(textarea, "{Control>}a{/Control}");
        expect(mockEditorState.executeCommand).toHaveBeenCalledWith({ type: "selectAll" });

        // Ctrl+Z (Undo)
        await user.type(textarea, "{Control>}z{/Control}");
        expect(mockEditorState.executeCommand).toHaveBeenCalledWith({ type: "undo" });

        // Ctrl+Shift+Z (Redo)
        await user.type(textarea, "{Control>}{Shift>}z{/Shift}{/Control}");
        expect(mockEditorState.executeCommand).toHaveBeenCalledWith({ type: "redo" });
    });

    it("should handle clipboard operations", async () => {
        const user = userEvent.setup();
        render(<CodeEditor editorState={mockEditorState} />);

        const textarea = screen.getByTestId("hidden-textarea");

        // Copy
        await user.type(textarea, "{Control>}c{/Control}");
        expect(mockEditorState.executeCommand).toHaveBeenCalledWith({ type: "copy" });

        // Paste (with clipboard data)
        await user.paste("Pasted text");
        expect(mockEditorState.executeCommand).toHaveBeenCalledWith({
            type: "paste",
            text: "Pasted text",
        });
    });

    it("should handle Tab key insertion", async () => {
        const user = userEvent.setup();
        render(<CodeEditor editorState={mockEditorState} tabSize={4} />);

        const textarea = screen.getByTestId("hidden-textarea");
        await user.type(textarea, "{Tab}");

        expect(mockEditorState.executeCommand).toHaveBeenCalledWith({
            type: "insert",
            text: "    ", // 4 spaces
        });
    });
});
```

#### Example: CommandPalette Component

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import type { Command } from "@/types/commands";

describe("CommandPalette", () => {
    const mockCommands: Command[] = [
        { id: "save", label: "Save File", category: "File", action: vi.fn() },
        { id: "open", label: "Open File", category: "File", action: vi.fn() },
        { id: "find", label: "Find in Files", category: "Search", action: vi.fn() },
        { id: "format", label: "Format Document", category: "Editor", action: vi.fn() },
    ];

    it("should filter commands by query", async () => {
        const user = userEvent.setup();
        render(<CommandPalette commands={mockCommands} isOpen={true} />);

        const input = screen.getByPlaceholderText(/search commands/i);
        await user.type(input, "file");

        // Should show "Save File" and "Open File", not "Find in Files"
        expect(screen.getByText("Save File")).toBeInTheDocument();
        expect(screen.getByText("Open File")).toBeInTheDocument();
        expect(screen.queryByText("Find in Files")).not.toBeInTheDocument();
    });

    it("should navigate with arrow keys", async () => {
        const user = userEvent.setup();
        render(<CommandPalette commands={mockCommands} isOpen={true} />);

        const input = screen.getByPlaceholderText(/search commands/i);

        // Arrow down
        await user.type(input, "{ArrowDown}");
        expect(screen.getByText("Open File").closest("div")).toHaveClass("selected");

        // Arrow down again
        await user.type(input, "{ArrowDown}");
        expect(screen.getByText("Find in Files").closest("div")).toHaveClass("selected");

        // Arrow up
        await user.type(input, "{ArrowUp}");
        expect(screen.getByText("Open File").closest("div")).toHaveClass("selected");
    });

    it("should execute command on Enter", async () => {
        const user = userEvent.setup();
        render(<CommandPalette commands={mockCommands} isOpen={true} />);

        const input = screen.getByPlaceholderText(/search commands/i);

        await user.type(input, "{ArrowDown}"); // Select "Open File"
        await user.type(input, "{Enter}");

        expect(mockCommands[1].action).toHaveBeenCalled();
    });

    it("should close on Escape", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(<CommandPalette commands={mockCommands} isOpen={true} onClose={onClose} />);

        const input = screen.getByPlaceholderText(/search commands/i);
        await user.type(input, "{Escape}");

        expect(onClose).toHaveBeenCalled();
    });
});
```

### Benchmark Tests

Benchmark tests measure performance of critical operations.

#### Example: PieceTable Benchmarks

```typescript
import { bench, describe } from "vitest";
import { PieceTable } from "./pieceTable";

describe("PieceTable Performance", () => {
    describe("Insert Operations", () => {
        bench("insert 10,000 characters at end", () => {
            const pt = new PieceTable();
            for (let i = 0; i < 10000; i++) {
                pt.insert(i, "x");
            }
        });

        bench("insert 1,000 lines", () => {
            const pt = new PieceTable();
            for (let i = 0; i < 1000; i++) {
                pt.insert(pt.getTotalLength(), "line\n");
            }
        });

        bench("insert at beginning (worst case)", () => {
            const pt = new PieceTable("initial");
            for (let i = 0; i < 100; i++) {
                pt.insert(0, "x");
            }
        });
    });

    describe("Delete Operations", () => {
        bench("delete from end", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);
            for (let i = 0; i < 1000; i++) {
                pt.delete(pt.getTotalLength() - 1, 1);
            }
        });

        bench("delete large chunks", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);
            for (let i = 0; i < 10; i++) {
                pt.delete(0, 100);
            }
        });
    });

    describe("Random Edits", () => {
        bench("random edits on 10,000 char document", () => {
            const content = "x".repeat(10000);
            const pt = new PieceTable(content);

            for (let i = 0; i < 100; i++) {
                const pos = Math.floor(Math.random() * pt.getTotalLength());
                if (Math.random() > 0.5) {
                    pt.insert(pos, "!");
                } else {
                    pt.delete(pos, 1);
                }
            }
        });
    });

    describe("Line Operations", () => {
        bench("getLine on 1,000 line document", () => {
            const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`).join("\n");
            const pt = new PieceTable(lines);

            for (let i = 1; i <= 1000; i++) {
                pt.getLine(i);
            }
        });

        bench("getLineCount updates", () => {
            const pt = new PieceTable();
            for (let i = 0; i < 1000; i++) {
                pt.insert(pt.getTotalLength(), "line\n");
                pt.getLineCount();
            }
        });
    });
});
```

#### Example: Tokenizer Benchmarks

```typescript
import { bench, describe } from "vitest";
import { tokenizeLine } from "./tokenizeLine";
import { createDocumentState } from "./documentState";
import { javascriptRules } from "./languages/javascript";

describe("Tokenizer Performance", () => {
    const simpleCode = "const x = 42;";
    const complexCode = 'function greet(name: string): void { console.log(`Hello, ${name}!`); }';
    const longCode = "const data = " + JSON.stringify({ a: 1, b: 2, c: 3 }) + ";";

    bench("tokenize simple line", () => {
        const state = createDocumentState();
        tokenizeLine(simpleCode, javascriptRules, state);
    });

    bench("tokenize complex line", () => {
        const state = createDocumentState();
        tokenizeLine(complexCode, javascriptRules, state);
    });

    bench("tokenize long line (200+ chars)", () => {
        const state = createDocumentState();
        const veryLongCode = complexCode.repeat(5);
        tokenizeLine(veryLongCode, javascriptRules, state);
    });

    bench("tokenize 1,000 lines", () => {
        const state = createDocumentState();
        for (let i = 0; i < 1000; i++) {
            tokenizeLine(simpleCode, javascriptRules, state);
        }
    });
});
```

---

## Test Organization

### File Structure

Tests are co-located with source files using the `.test.ts` or `.test.tsx` extension:

```
maple/
├── lib/
│   ├── editor/
│   │   ├── pieceTable.ts
│   │   ├── pieceTable.test.ts          # Unit tests
│   │   ├── pieceTable.bench.ts         # Benchmarks
│   │   ├── coordinates.ts
│   │   └── coordinates.test.ts
│   ├── tokenizer/
│   │   ├── tokenizeLine.ts
│   │   ├── tokenizeLine.test.ts
│   │   ├── documentState.ts
│   │   ├── documentState.test.ts
│   │   └── languages/
│   │       ├── javascript.ts
│   │       ├── javascript.test.ts
│   │       ├── css.test.ts
│   │       └── python.test.ts
│   └── storage/
│       ├── fileSystem.ts
│       ├── fileSystem.test.ts          # Unit tests
│       ├── fileSystem.integration.test.ts  # Integration tests
│       ├── indexedDB.ts
│       └── indexedDB.test.ts
├── hooks/
│   ├── useEditorState.ts
│   ├── useEditorState.test.ts          # Unit tests
│   ├── useEditorState.integration.test.ts  # Integration tests
│   ├── useViewport.ts
│   └── useViewport.test.ts
├── components/
│   └── Editor/
│       ├── CodeEditor.tsx
│       ├── CodeEditor.test.tsx         # Component tests
│       ├── CommandPalette.tsx
│       └── CommandPalette.test.tsx
└── test/
    ├── setup.ts                        # Global test setup
    ├── fixtures/                       # Test data
    │   └── code-samples.ts
    └── utils/                          # Test utilities
        └── test-helpers.ts
```

### Naming Conventions

#### Test Files
- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **Integration tests**: `*.integration.test.ts`
- **Component tests**: `*.test.tsx`
- **Benchmark tests**: `*.bench.ts`

#### Test Suites
Use `describe()` blocks to organize related tests:

```typescript
describe("ComponentName", () => {
    describe("Feature Group", () => {
        it("should do something specific", () => {
            // Test code
        });
    });
});
```

#### Test Names
Use descriptive names that explain what is being tested:

**Good:**
```typescript
it("should insert text at cursor position")
it("should handle empty string insert as no-op")
it("should clamp negative offset to 0")
it("should preserve selection after undo")
```

**Bad:**
```typescript
it("test 1")
it("insert")
it("works")
```

### Test Organization Best Practices

1. **Group related tests**: Use nested `describe()` blocks
2. **One assertion concept per test**: Tests should verify one thing
3. **Arrange-Act-Assert pattern**: Structure tests clearly
4. **Use beforeEach/afterEach**: Set up and tear down test state
5. **Keep tests independent**: No test should depend on another

```typescript
describe("FileSystem", () => {
    let fs: FileSystem;

    // Setup before each test
    beforeEach(async () => {
        fs = new FileSystem();
        await fs.init();
    });

    // Teardown after each test
    afterEach(async () => {
        await fs.clearAll();
    });

    describe("File Operations", () => {
        it("should create file with content", async () => {
            // Arrange
            const root = await fs.getRootNode();

            // Act
            const file = await fs.createFile(root.id, "test.txt", "Hello");

            // Assert
            expect(file.name).toBe("test.txt");
            expect(file.content).toBe("Hello");
        });
    });
});
```

---

## Mocking

### IndexedDB Mocking

Maple uses `fake-indexeddb` for testing IndexedDB operations.

#### Setup (Automatic)

The test setup file (`test/setup.ts`) automatically imports `fake-indexeddb/auto`:

```typescript
import "fake-indexeddb/auto";
```

This provides a complete in-memory IndexedDB implementation for tests.

#### Example: Testing FileSystem

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystem } from "./fileSystem";

describe("FileSystem with IndexedDB", () => {
    let fs: FileSystem;

    beforeEach(async () => {
        // fake-indexeddb automatically provides clean database
        fs = new FileSystem();
        await fs.init();
    });

    afterEach(async () => {
        // Clean up after each test
        await fs.clearAll();
    });

    it("should persist files to IndexedDB", async () => {
        const root = await fs.getRootNode();
        const file = await fs.createFile(root.id, "test.txt", "content");

        // File persisted to fake IndexedDB
        expect(file.id).toBeDefined();

        // Retrieve from IndexedDB
        const retrieved = await fs.getNode(file.id);
        expect(retrieved?.name).toBe("test.txt");
    });
});
```

### Function Mocking

Use Vitest's `vi.fn()` to create mock functions.

#### Example: Mocking Callbacks

```typescript
import { describe, it, expect, vi } from "vitest";
import { useEditorState } from "./useEditorState";
import { renderHook, act } from "@testing-library/react";

describe("useEditorState callbacks", () => {
    it("should call onChange when content changes", () => {
        const onChange = vi.fn();
        const { result } = renderHook(() => useEditorState({ onChange }));

        act(() => {
            result.current.executeCommand({ type: "insert", text: "Hello" });
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("Hello");
    });

    it("should call onCursorChange when cursor moves", () => {
        const onCursorChange = vi.fn();
        const { result } = renderHook(() => useEditorState({ onCursorChange }));

        act(() => {
            result.current.setCursor({ line: 2, column: 5 });
        });

        expect(onCursorChange).toHaveBeenCalledWith({ line: 2, column: 5 });
    });
});
```

#### Example: Spying on Methods

```typescript
import { describe, it, expect, vi } from "vitest";
import { PieceTable } from "./pieceTable";

describe("PieceTable method calls", () => {
    it("should call internal method on insert", () => {
        const pt = new PieceTable("Hello");
        const spy = vi.spyOn(pt as any, "splitPiece");

        pt.insert(5, " World");

        expect(spy).toHaveBeenCalled();
    });
});
```

### React Hook Mocking

Mock custom hooks using Vitest's module mocking.

#### Example: Mocking useEditorState

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeEditor } from "./CodeEditor";

// Mock the hook
vi.mock("@/hooks/useEditorState", () => ({
    useEditorState: vi.fn(() => ({
        getContent: () => "Mocked content",
        getLine: (line: number) => `Line ${line}`,
        getLineCount: () => 10,
        cursor: { line: 1, column: 1 },
        selection: null,
        executeCommand: vi.fn(),
        setCursor: vi.fn(),
        setSelection: vi.fn(),
        isDirty: false,
        version: 0,
    })),
}));

describe("CodeEditor with mocked state", () => {
    it("should render with mocked content", () => {
        render(<CodeEditor />);
        // Test using mocked data
    });
});
```

### Component Mocking

Mock child components to isolate tests.

#### Example: Mocking LineRenderer

```typescript
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CodeEditor } from "./CodeEditor";

// Mock child component
vi.mock("./LineRenderer", () => ({
    LineRenderer: vi.fn(({ lineNumber, tokens }) => (
        <div data-testid={`line-${lineNumber}`}>
            Mocked Line {lineNumber}
        </div>
    )),
}));

describe("CodeEditor rendering", () => {
    it("should render with mocked LineRenderer", () => {
        const { container } = render(<CodeEditor />);
        // LineRenderer is mocked, test CodeEditor logic only
    });
});
```

### Timer Mocking

Mock timers for testing debounced operations.

#### Example: Testing Debounced Save

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorPersistence } from "./useEditorPersistence";

describe("useEditorPersistence debounce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllTimers();
    });

    it("should debounce auto-save", async () => {
        const { result } = renderHook(() => useEditorPersistence({ fileId: "test" }));

        // Trigger multiple saves
        act(() => {
            result.current.saveContent("Version 1");
            result.current.saveContent("Version 2");
            result.current.saveContent("Version 3");
        });

        // Save not called yet
        expect(result.current.isSaving).toBe(false);

        // Fast-forward time
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Now save should have happened (with last version only)
        await vi.waitFor(() => {
            expect(result.current.lastSavedContent).toBe("Version 3");
        });
    });
});
```

---

## Coverage Goals

Maple enforces coverage thresholds to ensure code quality.

### Coverage Targets

| Module | Statements | Branches | Functions | Lines | Priority |
|--------|-----------|----------|-----------|-------|----------|
| **Global** | 70% | 70% | 70% | 70% | Baseline |
| **lib/tokenizer/\*\*** | 90% | 90% | 90% | 90% | Critical |
| **lib/editor/pieceTable.ts** | 90% | 90% | 90% | 90% | Critical |
| **hooks/useEditorState.ts** | 90% | 90% | 90% | 90% | Critical |
| **lib/storage/\*\*** | 80% | 80% | 80% | 80% | Important |

### Why These Targets?

#### Critical Modules (90%)
These modules are the foundation of the editor. Bugs here affect every user interaction.

- **Tokenizer**: Syntax highlighting must be accurate for all languages
- **PieceTable**: Document model must handle all edit operations correctly
- **useEditorState**: Core state management affects all editor features

#### Important Modules (80%)
These modules handle data persistence and complex operations.

- **Storage**: File system must reliably save/load without data loss

#### Other Modules (70%)
UI components and utilities have lower thresholds but still require substantial coverage.

### Viewing Coverage

#### Generate Coverage Report
```bash
bun test:coverage
```

#### Open HTML Report
```bash
open coverage/index.html
```

The HTML report shows:
- Overall coverage percentages
- File-by-file breakdown
- Line-by-line coverage visualization
- Uncovered code highlighted in red

#### Coverage in CI

GitHub Actions automatically runs coverage checks on every pull request. Builds fail if coverage thresholds are not met.

### Improving Coverage

1. **Find uncovered code**: Check the HTML coverage report
2. **Identify gaps**: Look for red (uncovered) lines
3. **Write tests**: Add tests for edge cases and error paths
4. **Verify**: Run `bun test:coverage` to confirm improvement

#### Example: Uncovered Branch

```typescript
// Source code
function divide(a: number, b: number): number {
    if (b === 0) {  // Uncovered branch
        throw new Error("Division by zero");
    }
    return a / b;
}

// Add test to cover the branch
it("should throw error on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
});
```

---

## CI/CD

### GitHub Actions Workflow

Maple uses GitHub Actions for continuous integration. Tests run automatically on:
- Every push to the main branch
- Every pull request

#### Workflow File Location
`.github/workflows/test.yml`

#### Workflow Steps

**1. Test Job**
```yaml
- Setup Bun runtime
- Install dependencies with bun install
- Run TypeScript type checking (bun type-check)
- Run Biome linter (bun lint)
- Run all tests (bun test:run)
- Generate coverage report (bun test:coverage)
- Upload coverage to Codecov
- Comment PR with coverage summary
```

**2. Benchmark Job**
```yaml
- Setup Bun runtime
- Install dependencies
- Run benchmarks (bun test:bench)
- Store results for comparison
- Comment PR with performance changes
```

### Workflow Example

```yaml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun type-check

      - name: Lint
        run: bun lint

      - name: Run tests
        run: bun test:run

      - name: Coverage
        run: bun test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run benchmarks
        run: bun test:bench
```

### PR Requirements

Pull requests must pass all checks:
- ✅ TypeScript type checking
- ✅ Biome linting
- ✅ All tests passing
- ✅ Coverage thresholds met
- ✅ Benchmarks complete (informational)

### Local Pre-commit Verification

Run the same checks locally before pushing:

```bash
# Full verification
bun type-check && bun lint && bun test:run && bun test:coverage

# Or individual checks
bun type-check       # TypeScript errors
bun lint             # Code style issues
bun test:run         # Test failures
bun test:coverage    # Coverage gaps
```

---

## Troubleshooting

### Common Issues

#### Issue: Tests Pass Locally but Fail in CI

**Symptoms:**
- Tests pass when running `bun test:run` locally
- CI shows test failures

**Causes & Solutions:**

1. **Environment differences**
   - CI uses a clean environment
   - Solution: Run `bun install` to ensure dependencies are up to date

2. **Timing issues**
   - Tests may be timing-dependent
   - Solution: Use `vi.useFakeTimers()` for timer-dependent tests
   - Solution: Increase test timeout: `testTimeout: 10000` in vitest.config.ts

3. **File system paths**
   - Paths may differ between Windows/Linux/macOS
   - Solution: Use `path.join()` or `path.resolve()` for cross-platform paths

#### Issue: Coverage Threshold Not Met

**Symptoms:**
```
ERROR: Coverage for statements (85%) does not meet global threshold (90%)
```

**Solutions:**

1. **Find uncovered code**
   ```bash
   bun test:coverage
   open coverage/index.html
   ```

2. **Add missing tests**
   - Look for red (uncovered) lines in the HTML report
   - Add tests for uncovered branches and error paths

3. **Check for dead code**
   - Remove unused code that cannot be covered

#### Issue: Slow Test Execution

**Symptoms:**
- Tests take a long time to run
- Individual tests timeout

**Solutions:**

1. **Reduce test data size**
   ```typescript
   // Bad: Large data
   const pt = new PieceTable("x".repeat(1000000));

   // Good: Smaller data
   const pt = new PieceTable("x".repeat(1000));
   ```

2. **Mock expensive operations**
   ```typescript
   // Mock file system instead of using real IndexedDB
   vi.mock("@/lib/storage/fileSystem");
   ```

3. **Use beforeEach instead of beforeAll**
   ```typescript
   // Bad: Shared state can slow down tests
   beforeAll(() => {
       // Heavy setup
   });

   // Good: Independent tests
   beforeEach(() => {
       // Lightweight setup
   });
   ```

4. **Increase timeout for specific tests**
   ```typescript
   it("should handle large file", { timeout: 30000 }, async () => {
       // Test with large file
   });
   ```

#### Issue: IndexedDB Tests Fail

**Symptoms:**
- Errors like "IDBDatabase is not defined"
- Tests fail with IndexedDB-related errors

**Solutions:**

1. **Ensure fake-indexeddb is imported**
   - Check that `test/setup.ts` has `import "fake-indexeddb/auto"`
   - Verify `setupFiles: ["./test/setup.ts"]` in vitest.config.ts

2. **Clean up between tests**
   ```typescript
   afterEach(async () => {
       await fs.clearAll(); // Clear IndexedDB
   });
   ```

3. **Wait for async operations**
   ```typescript
   // Bad: Not awaiting
   fs.createFile(parentId, "test.txt", "content");
   expect(...); // May run before file is created

   // Good: Await async operations
   await fs.createFile(parentId, "test.txt", "content");
   expect(...);
   ```

#### Issue: React Hook Errors

**Symptoms:**
```
Error: Invalid hook call. Hooks can only be called inside the body of a function component.
```

**Solutions:**

1. **Use renderHook from @testing-library/react**
   ```typescript
   import { renderHook, act } from "@testing-library/react";

   const { result } = renderHook(() => useEditorState());
   ```

2. **Wrap state changes in act()**
   ```typescript
   act(() => {
       result.current.executeCommand({ type: "insert", text: "Hello" });
   });
   ```

3. **Don't call hooks directly**
   ```typescript
   // Bad: Calling hook directly
   const state = useEditorState();

   // Good: Using renderHook
   const { result } = renderHook(() => useEditorState());
   ```

#### Issue: Mocks Not Working

**Symptoms:**
- Mock functions not being called
- Real implementation runs instead of mock

**Solutions:**

1. **Check mock path matches import path**
   ```typescript
   // Import: "@/lib/storage/fileSystem"
   // Mock must use same path
   vi.mock("@/lib/storage/fileSystem", () => ({
       FileSystem: vi.fn(),
   }));
   ```

2. **Use vi.fn() for callbacks**
   ```typescript
   const onChange = vi.fn();
   // Not: const onChange = () => {};
   ```

3. **Mock before importing**
   ```typescript
   // Good: Mock first
   vi.mock("./module");
   import { Component } from "./component";

   // Bad: Import first
   import { Component } from "./component";
   vi.mock("./module");
   ```

#### Issue: Snapshot Tests Failing

**Symptoms:**
- Snapshot tests fail after UI changes
- Snapshots look correct but test fails

**Solutions:**

1. **Update snapshots**
   ```bash
   bun test:run -- -u
   ```

2. **Review snapshot changes**
   - Check the diff to ensure changes are intentional
   - Don't blindly update all snapshots

3. **Keep snapshots small**
   ```typescript
   // Bad: Large component snapshot
   expect(container).toMatchSnapshot();

   // Good: Specific element snapshot
   expect(screen.getByRole("button")).toMatchSnapshot();
   ```

### Getting Help

1. **Check Vitest documentation**: [vitest.dev](https://vitest.dev)
2. **Check Testing Library docs**: [testing-library.com](https://testing-library.com)
3. **Review existing tests**: Look at similar tests in the codebase
4. **Check test output**: Read error messages carefully
5. **Use --reporter=verbose**: `bun test:run --reporter=verbose` for detailed output

---

## Summary

Maple's testing infrastructure provides:

- **Comprehensive coverage**: Unit, integration, component, and benchmark tests
- **Fast execution**: Vitest with Bun runtime
- **Modern tooling**: Fake-indexeddb, Testing Library, Vitest UI
- **CI/CD integration**: Automated testing on every PR
- **Quality gates**: Coverage thresholds enforce code quality

### Quick Reference

```bash
# Development
bun test:watch          # Watch mode (recommended)
bun test:ui             # Interactive UI

# Verification
bun test:run            # Run all tests
bun test:coverage       # Check coverage
bun test:bench          # Run benchmarks

# Code Quality
bun lint                # Check with Biome
bun format              # Format with Biome
bun type-check          # TypeScript check

# Pre-commit
bun type-check && bun lint && bun test:run
```

### Test Writing Checklist

- [ ] Tests are independent (no shared state)
- [ ] Tests use descriptive names
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] Async operations are awaited
- [ ] React state changes wrapped in `act()`
- [ ] Mocks are cleaned up in `afterEach()`
- [ ] Edge cases are covered
- [ ] Error paths are tested
- [ ] Coverage meets threshold for the module

---

**Last Updated**: 2026-01-03
**Maintainer**: Maple Development Team
**License**: MIT

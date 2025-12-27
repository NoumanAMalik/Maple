# Syntax Highlighting: How the Industry Does It

A comprehensive guide to how GitHub, VS Code/Monaco, CodeMirror, and other major players implement syntax highlighting. Use this to build your own from scratch.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [VS Code / Monaco Editor](#vs-code--monaco-editor)
3. [CodeMirror 6](#codemirror-6)
4. [GitHub](#github)
5. [Tree-sitter](#tree-sitter)
6. [Key Architecture Decisions](#key-architecture-decisions)
7. [Recommended Approach for Maple](#recommended-approach-for-maple)

---

## Core Concepts

### What is Syntax Highlighting?

Two distinct phases:
1. **Tokenization**: Breaking source code into meaningful chunks (tokens)
2. **Theming**: Applying colors to those tokens

### Token vs Decoration

- **Token**: A classified piece of text (e.g., `keyword`, `string`, `comment`)
- **Decoration**: Visual styling applied to a text range (color, bold, underline)

### Key Insight: Separation of Concerns

**Text rendering and syntax coloring should be COMPLETELY SEPARATE.**

```
┌─────────────────────────────────────────────────────┐
│                    Text Layer                        │
│   Always renders the actual content string           │
│   Never depends on tokenization state                │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                 Decoration Layer                     │
│   Applies colors to ranges [start, end]             │
│   Can be async, can be stale, can be empty          │
└─────────────────────────────────────────────────────┘
```

---

## VS Code / Monaco Editor

### Architecture Overview

Monaco uses a **TextMate grammar** system with these components:

```
Source Code → Tokenizer → Token[] → Theme Matching → Styled Spans
```

### Key Implementation Details

#### 1. Token Storage (Compact Binary Format)

VS Code evolved from objects to a compact `Uint32Array`:

```typescript
// Tokens stored as Uint32Array
// Even indices: token start position
// Odd indices: packed metadata (languageId, tokenType, fontStyle, colorId)

// Example: 8 tokens = 16 numbers in array
const tokens = new Uint32Array([
  0, metadata0,   // token 1: starts at 0
  8, metadata1,   // token 2: starts at 8
  // ...
]);
```

#### 2. Line-by-Line Tokenization

```typescript
interface IState {
  clone(): IState;
  equals(other: IState): boolean;
}

interface TokenizeResult {
  tokens: Token[];
  endState: IState;  // State at end of line, passed to next line
}

function tokenizeLine(line: string, state: IState): TokenizeResult {
  // Tokenize single line
  // Return tokens AND the ending state
}
```

**Why line-by-line?**
- Only re-tokenize changed lines
- State propagation handles multi-line constructs
- If line N changes, check if endState changed → if yes, re-tokenize N+1

#### 3. Theme Matching with Trie

VS Code builds a **Trie** from theme rules for O(1) color lookup:

```typescript
// Theme rule: "keyword.control" → blue
// Theme rule: "keyword" → cyan

// Trie structure:
// keyword
//   └── control → blue
//   └── (default) → cyan

function matchTheme(scopes: string[]): Color {
  // Walk the trie with scope stack
  // Most specific match wins
}
```

#### 4. Rendering: Spans with Inline Styles

Monaco renders tokens as `<span>` elements with **inline styles**, not CSS classes:

```html
<span style="color: #569cd6;">const</span>
<span style="color: #d4d4d4;"> </span>
<span style="color: #9cdcfe;">foo</span>
```

**Why inline styles?**
- No CSS class generation step
- Theme changes apply instantly
- No specificity conflicts

### Monaco's Monarch Tokenizer

For custom languages, Monaco uses **Monarch** - a declarative tokenizer:

```typescript
monaco.languages.setMonarchTokensProvider('myLanguage', {
  tokenizer: {
    root: [
      [/\b(if|else|while|for)\b/, 'keyword'],
      [/"[^"]*"/, 'string'],
      [/\/\/.*$/, 'comment'],
      [/[a-zA-Z_]\w*/, 'identifier'],
    ],
  },
});
```

---

## CodeMirror 6

### Architecture Overview

CodeMirror 6 uses **Lezer**, a custom incremental parser:

```
Source Code → Lezer Parser → Syntax Tree → Highlighting → Decorations
```

### Key Implementation Details

#### 1. Incremental Parsing

Lezer maintains a **syntax tree** that updates incrementally:

```typescript
// On document change:
// 1. Identify which tree nodes are affected
// 2. Reparse only the changed region
// 3. Reuse unchanged nodes from old tree

function parse(doc: string, fragments: TreeFragment[]): Tree {
  // fragments = reusable parts from previous parse
  // Returns new tree, reusing what it can
}
```

#### 2. Syntax Tree Structure

```typescript
interface SyntaxNode {
  type: NodeType;      // "FunctionDeclaration", "String", etc.
  from: number;        // Start offset in document
  to: number;          // End offset in document
  firstChild: SyntaxNode | null;
  nextSibling: SyntaxNode | null;
}
```

#### 3. Highlighting via Tags

CodeMirror uses **highlight tags** instead of direct colors:

```typescript
import { tags } from "@lezer/highlight";

// Define how syntax nodes map to tags
const highlighting = styleTags({
  FunctionDeclaration: tags.function,
  String: tags.string,
  Comment: tags.comment,
  Keyword: tags.keyword,
});

// Theme maps tags to colors
const myTheme = HighlightStyle.define([
  { tag: tags.keyword, color: "#708" },
  { tag: tags.string, color: "#a11" },
  { tag: tags.comment, color: "#940", fontStyle: "italic" },
]);
```

#### 4. Decoration System

CodeMirror separates content from styling via **Decorations**:

```typescript
// Decorations are ranges with styling
interface Decoration {
  from: number;        // Start offset
  to: number;          // End offset
  class?: string;      // CSS class
  attributes?: object; // HTML attributes
}

// Apply decorations to editor view
const decorations = Decoration.set([
  Decoration.mark({ class: "cm-keyword" }).range(0, 5),
  Decoration.mark({ class: "cm-string" }).range(10, 20),
]);
```

#### 5. Viewport-Based Rendering

Only computes highlighting for visible content + buffer:

```typescript
function computeDecorations(view: EditorView): DecorationSet {
  const { from, to } = view.viewport;  // Visible range
  const tree = syntaxTree(view.state);

  // Only iterate nodes within viewport
  tree.iterate({
    from,
    to,
    enter(node) {
      // Create decorations for visible nodes only
    }
  });
}
```

---

## GitHub

### Architecture Overview

GitHub uses **Tree-sitter** for syntax highlighting in repositories:

```
Source Code → Tree-sitter Parser → Concrete Syntax Tree → Theme → HTML
```

### Key Implementation Details

#### 1. Server-Side Rendering

GitHub highlights code **on the server**, not in the browser:

```ruby
# Ruby/Go backend
def highlight(code, language)
  tree = TreeSitter.parse(code, language)
  html = render_with_colors(tree)
  cache(html)  # Cache the result
end
```

#### 2. Language Grammars

Tree-sitter uses **grammar files** that define language syntax:

```javascript
// grammar.js for a simple language
module.exports = grammar({
  name: 'mylang',
  rules: {
    source_file: $ => repeat($._statement),
    _statement: $ => choice($.function_def, $.if_statement),
    function_def: $ => seq('fn', $.identifier, $.block),
    // ...
  }
});
```

#### 3. Query-Based Highlighting

Tree-sitter uses **queries** to map tree nodes to highlight groups:

```scheme
; highlights.scm
(function_definition
  name: (identifier) @function)

(string) @string
(comment) @comment
(keyword) @keyword
```

#### 4. Output Format

GitHub outputs pre-rendered HTML:

```html
<pre class="highlight">
  <span class="pl-k">const</span>
  <span class="pl-en">foo</span>
  <span class="pl-k">=</span>
  <span class="pl-s">"bar"</span>
</pre>
```

---

## Tree-sitter

### What is Tree-sitter?

A parser generator that creates:
- **Fast** parsers (written in C)
- **Incremental** parsing (only re-parse changes)
- **Error-tolerant** (produces tree even with syntax errors)

### How It Works

```
Grammar Definition (.js)
        ↓
    tree-sitter generate
        ↓
    Parser (C code)
        ↓
    Compile to WASM (for browser)
        ↓
    Use in editor
```

### Key Features

1. **Concrete Syntax Tree**: Every character is accounted for
2. **Incremental**: O(log n) updates on edits
3. **Error Recovery**: Continues parsing after errors

### Example Usage

```typescript
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

const parser = new Parser();
parser.setLanguage(JavaScript);

const tree = parser.parse('const x = 1;');

// On edit:
tree.edit({
  startIndex: 6,
  oldEndIndex: 7,
  newEndIndex: 8,
  startPosition: { row: 0, column: 6 },
  oldEndPosition: { row: 0, column: 7 },
  newEndPosition: { row: 0, column: 8 },
});

const newTree = parser.parse('const xy = 1;', tree);  // Incremental!
```

---

## Key Architecture Decisions

### 1. Synchronous vs Asynchronous Tokenization

| Approach | Pros | Cons |
|----------|------|------|
| **Synchronous** | Instant colors, no flicker | Blocks UI on large files |
| **Web Worker** | Non-blocking | Delay, complexity, sync issues |
| **Hybrid** | Best of both | Most complex |

**Recommendation**: Start synchronous, add Web Worker only if needed.

### 2. When to Tokenize

| Strategy | Description |
|----------|-------------|
| **On every keystroke** | Immediate, but expensive |
| **Debounced** | Wait N ms after last keystroke |
| **On idle** | Use `requestIdleCallback` |
| **Viewport only** | Only tokenize visible lines |

**Recommendation**: Debounce (16-50ms) + viewport prioritization.

### 3. Token Storage Format

| Format | Memory | Speed |
|--------|--------|-------|
| **Objects** | High | Slow |
| **Arrays** | Medium | Medium |
| **Typed Arrays** | Low | Fast |

**Recommendation**: Start with objects, optimize later if needed.

### 4. How to Apply Colors

| Method | Reliability | Performance |
|--------|-------------|-------------|
| **CSS Classes** | Depends on build | Fast (cached) |
| **Inline Styles** | Always works | Fast |
| **CSS-in-JS** | Varies | Medium |

**Recommendation**: Inline styles for reliability.

---

## Recommended Approach for Maple

### Phase 1: Simple Regex Tokenizer

Start with the simplest possible approach:

```typescript
interface Token {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'identifier' | 'operator' | 'punctuation';
  start: number;  // Column in line (0-indexed)
  length: number;
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < line.length) {
    // Try each pattern in order
    const match =
      matchKeyword(line, pos) ||
      matchString(line, pos) ||
      matchComment(line, pos) ||
      matchNumber(line, pos) ||
      matchIdentifier(line, pos) ||
      matchOperator(line, pos) ||
      matchPunctuation(line, pos);

    if (match) {
      tokens.push(match);
      pos += match.length;
    } else {
      pos++;  // Skip unknown character
    }
  }

  return tokens;
}
```

### Phase 2: Line Component with Highlighting

```typescript
function Line({ content, lineNumber }: LineProps) {
  // Tokenize synchronously (fast for single line)
  const tokens = tokenizeLine(content);

  // Render content with colors
  return (
    <div className="line">
      {renderWithTokens(content, tokens)}
    </div>
  );
}

function renderWithTokens(content: string, tokens: Token[]): ReactNode {
  if (tokens.length === 0) return content;

  const segments: ReactNode[] = [];
  let lastEnd = 0;

  for (const token of tokens) {
    // Gap before token
    if (token.start > lastEnd) {
      segments.push(content.slice(lastEnd, token.start));
    }

    // Token with color
    segments.push(
      <span key={token.start} style={{ color: getColor(token.type) }}>
        {content.slice(token.start, token.start + token.length)}
      </span>
    );

    lastEnd = token.start + token.length;
  }

  // Remainder
  if (lastEnd < content.length) {
    segments.push(content.slice(lastEnd));
  }

  return segments;
}
```

### Phase 3: State Machine for Multi-line Constructs

```typescript
type State = 'normal' | 'block-comment' | 'template-string';

interface LineState {
  state: State;
  depth: number;  // For nested templates
}

function tokenizeLine(line: string, startState: LineState): {
  tokens: Token[];
  endState: LineState;
} {
  // Handle multi-line constructs
  if (startState.state === 'block-comment') {
    // Look for */
  }
  // ...
}
```

### Phase 4: Optimization (Only If Needed)

1. **Memoize tokens per line** (cache invalidation on content change)
2. **Web Worker** for files > 1000 lines
3. **Viewport-only tokenization** for huge files

---

## Color Scheme Reference

```typescript
const colors = {
  keyword: 'var(--syntax-keyword)',      // #569cd6 - blue
  string: 'var(--syntax-string)',        // #ce9178 - orange
  comment: 'var(--syntax-comment)',      // #6a9955 - green
  number: 'var(--syntax-number)',        // #b5cea8 - light green
  function: 'var(--syntax-function)',    // #dcdcaa - yellow
  variable: 'var(--syntax-variable)',    // #9cdcfe - light blue
  type: 'var(--syntax-type)',            // #4ec9b0 - teal
  operator: 'var(--syntax-operator)',    // #d4d4d4 - gray
  punctuation: 'var(--syntax-punctuation)', // #d4d4d4 - gray
};
```

---

## Resources

- [VS Code Syntax Highlighting Optimizations](https://code.visualstudio.com/blogs/2017/02/08/syntax-highlighting-optimizations)
- [Lezer Parser System](https://lezer.codemirror.net/)
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [Monaco Editor Monarch](https://microsoft.github.io/monaco-editor/monarch.html)
- [TextMate Language Grammars](https://macromates.com/manual/en/language_grammars)

---

## Summary

| Editor | Tokenizer | Key Innovation |
|--------|-----------|----------------|
| **VS Code** | TextMate grammars | Compact binary token storage |
| **CodeMirror** | Lezer parser | Incremental syntax trees |
| **GitHub** | Tree-sitter | Server-side + caching |

**For Maple, start simple:**
1. Synchronous regex tokenizer
2. Inline styles (not CSS classes)
3. Tokenize in Line component
4. Add complexity only when needed

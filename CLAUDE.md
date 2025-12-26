# CLAUDE.md

This file provides context for AI assistants working on the Maple codebase.

## Project Overview

**Maple** is a web-based code editor built from scratch with custom syntax highlighting. The project intentionally avoids using established editor libraries (Monaco, CodeMirror, Prism, Highlight.js, Shiki, etc.) to demonstrate custom implementation of core editor features.

## Tech Stack

- **Runtime**: Bun (not Node.js) - use `bun` commands instead of `npm`
- **Framework**: Next.js 16 with App Router (not Pages Router)
- **TypeScript**: Strict mode enabled - all code must be fully typed
- **Styling**: Tailwind CSS v4 - CSS-based configuration with `@theme inline`
- **Linting**: Biome (not ESLint) - `bun lint` and `bun format`
- **Storage**: IndexedDB (no backend, browser-only)

## Critical Rules

### DO NOT USE External Syntax Highlighting Libraries

The core feature of this project is a **custom tokenizer**. Never suggest or use:

- Monaco Editor
- CodeMirror
- Prism.js
- Highlight.js
- Shiki
- Any other syntax highlighting library

### Implementation Requirements

1. **Tokenizer**: Implement in `lib/tokenizer/` using state machines
2. **Rendering**: Convert tokens to styled spans in `lib/highlighting/`
3. **Storage**: Use IndexedDB wrapper in `lib/storage/`

## Project Structure

```
maple/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   └── editor/page.tsx    # Main editor
├── components/
│   ├── Editor/            # Core editor (Client Components)
│   └── ui/                # UI components
├── lib/
│   ├── tokenizer/         # Custom tokenization engine
│   │   ├── types.ts       # Token types and interfaces
│   │   ├── tokenizer.ts   # Main tokenizer logic
│   │   └── languages/     # Language-specific rules
│   ├── highlighting/      # Syntax highlighting renderer
│   └── storage/           # IndexedDB file system
│       ├── indexedDB.ts   # Low-level DB wrapper
│       └── fileSystem.ts  # High-level file operations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
└── utils/                 # Utility functions
```

## Code Conventions

### TypeScript

```typescript
// Always use explicit types
interface EditorState {
    content: string;
    cursorPosition: CursorPosition;
}

// Never use `any` without good reason (noExplicitAny is off but discouraged)
```

### File Naming

- Components: PascalCase - `CodeEditor.tsx`
- Utilities: camelCase - `fileSystem.ts`
- Types: camelCase - `editor.ts`
- Hooks: camelCase with 'use' prefix - `useEditor.ts`

### Imports

Use absolute imports with `@/` alias:

```typescript
import { tokenize } from "@/lib/tokenizer";
import { FileTree } from "@/components/ui/FileTree";
```

### Formatting (Biome)

- 4-space indentation
- 120 character line width
- Double quotes for strings
- Trailing commas

## Component Guidelines

### Server vs Client Components

- **Default**: Server Components (no directive needed)
- **Client Components**: Add `"use client"` when needed for:
  - State management (useState, useReducer)
  - Effects (useEffect)
  - Browser APIs (IndexedDB, localStorage)
  - Event handlers

### Editor Components

All editor components in `components/Editor/` should be Client Components.

## Common Tasks

### Adding a New Language

1. Create `lib/tokenizer/languages/newlang.ts`
2. Define keywords, operators, and state transitions
3. Export from `lib/tokenizer/languages/index.ts`
4. Add file extensions to `utils/constants.ts`

### Adding UI Colors

Update `app/globals.css`:

```css
:root {
  --new-color: #hexcode;
}

@theme inline {
  --color-new-color: var(--new-color);
}
```

### Working with IndexedDB

```typescript
import { FileSystem } from "@/lib/storage";

const fs = new FileSystem();
await fs.init();
const file = await fs.createFile("parentId", "filename.ts", "content");
```

## Performance Guidelines

### Tokenization

- Debounce tokenization (300ms default)
- Only re-tokenize changed lines when possible
- Consider Web Workers for files > 1000 lines

### Rendering

- Use `React.memo` for line components
- Virtualize rendering for large files
- Minimize re-renders with proper key usage

### Storage

- Batch IndexedDB operations
- Use transactions for multiple writes
- Cache file tree structure in memory

## Common Pitfalls

### Don't

- Use `'use client'` unnecessarily
- Import large libraries for simple tasks
- Store entire file content in React state for large files
- Re-tokenize on every keystroke without debouncing
- Use `any` type

### Do

- Prefer Server Components when possible
- Keep client bundles small
- Debounce expensive operations
- Type everything explicitly
- Handle edge cases (empty files, binary files, very large files)

## Bun Commands

```bash
bun dev          # Development server
bun build        # Production build
bun start        # Production server
bun lint         # Biome check
bun lint:fix     # Biome fix
bun format       # Biome format
bun type-check   # TypeScript check
```

## Testing Strategy

- Unit tests for tokenizer (critical path)
- Test edge cases: empty strings, escape sequences, nested comments
- Integration tests for file system operations
- Component tests with React Testing Library

## Questions to Consider

Before implementing a feature:

1. Is this a Client or Server Component?
2. Does this need state or can it be derived?
3. How will this perform with 10k+ line files?
4. Is this accessible via keyboard?
5. Does this need to persist to IndexedDB?
6. Can this be memoized or debounced?

## Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Bun Documentation](https://bun.sh/docs)
- [Biome Documentation](https://biomejs.dev/docs/)

---

**Last Updated**: 2025-12-25
**Status**: Initial Setup Complete
**Next Phase**: Implement State Machine Tokenizer

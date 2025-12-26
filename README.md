# Maple

A modern, web-based code editor built from scratch with custom syntax highlighting.

## Overview

Maple is a lightweight code editor that demonstrates deep technical understanding of lexical analysis, state machines, and browser APIs. Unlike traditional web editors that rely on Monaco or CodeMirror, Maple implements its own syntax highlighting engine using a custom state machine tokenizer.

## Features

### Core Capabilities

- **Custom Syntax Highlighting**: State machine-based tokenizer with support for multiple languages
- **IndexedDB File System**: Persistent, browser-based file storage with auto-save
- **Multi-Tab Interface**: Work with multiple files simultaneously
- **File Tree Navigation**: Intuitive file and folder organization
- **Command Palette**: Keyboard-driven workflow (Cmd/Ctrl+P)

### Technical Highlights

- Built with Next.js 16 App Router for optimal performance
- TypeScript strict mode for type safety
- Custom tokenizer implementation (no external syntax highlighting libraries)
- Client-side file system using IndexedDB
- VS Code Dark+ inspired theme
- Tailwind CSS v4 for styling

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh) | JavaScript runtime & package manager |
| [Next.js 16](https://nextjs.org) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org) | Type-safe JavaScript |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first CSS framework |
| [Biome](https://biomejs.dev) | Fast linter and formatter |
| IndexedDB | Browser-native file storage |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd maple

# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the editor.

### Available Scripts

```bash
bun dev          # Start development server with Turbopack
bun build        # Build for production
bun start        # Start production server
bun lint         # Check code with Biome
bun lint:fix     # Fix linting issues
bun format       # Format code with Biome
bun type-check   # Run TypeScript type checking
```

## Project Structure

```
maple/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   └── editor/            # Editor interface
├── components/            # React components
│   ├── Editor/           # Core editor components
│   └── ui/               # Reusable UI components
├── lib/                   # Core logic
│   ├── tokenizer/        # Syntax tokenization engine
│   ├── highlighting/     # Syntax highlighting renderer
│   └── storage/          # IndexedDB file system
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Architecture

### Tokenizer

The custom tokenizer uses a state machine approach to parse source code into tokens. Each language has its own state machine definition that handles language-specific syntax rules, including:

- String literals (single, double, template)
- Comments (single-line, multi-line)
- Keywords and identifiers
- Numbers and operators
- Escape sequences

### File System

The virtual file system is built on IndexedDB, providing:

- Persistent storage across browser sessions
- Hierarchical file/folder structure
- CRUD operations for files and directories
- Auto-save with configurable debounce

### Editor

The editor uses an overlay technique:

1. A transparent `<textarea>` captures user input
2. A `<pre>/<code>` layer displays syntax-highlighted content
3. Both layers stay synchronized for a seamless experience

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save file |
| `Cmd/Ctrl + P` | Open file picker |
| `Cmd/Ctrl + Shift + P` | Command palette |
| `Cmd/Ctrl + N` | New file |
| `Cmd/Ctrl + W` | Close tab |
| `Cmd/Ctrl + F` | Find in file |

## Browser Support

Maple requires a modern browser with support for:

- ES2017+
- IndexedDB API
- CSS Custom Properties
- CSS Grid and Flexbox

Tested on:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Development

### Code Quality

This project uses:

- TypeScript strict mode
- Biome for linting and formatting
- 4-space indentation, 120 character line width

### Performance Targets

- Syntax highlighting: <10ms for 1000 lines
- File save: <50ms
- File load: <100ms
- UI updates: 60fps

## Roadmap

- [ ] Complete state machine tokenizer
- [ ] Add more language support (Python, HTML, CSS, JSON)
- [ ] Implement find and replace
- [ ] Add bracket matching
- [ ] Support code folding
- [ ] Web Worker for large file handling
- [ ] Virtual scrolling for 10k+ line files

## Why Build From Scratch?

This project demonstrates:

- **Compiler fundamentals**: Lexical analysis, tokenization, state machines
- **Browser APIs**: IndexedDB, Web Workers
- **Performance optimization**: Incremental parsing, virtual scrolling
- **System design**: Virtual file system, state management
- **Zero dependencies** for core syntax highlighting

## License

MIT

---

Built with Bun, Next.js, and TypeScript.

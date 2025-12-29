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
- Bearded Theme Black & Gold color scheme
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

## Implementation Status

### Completed

- [x] **Project Setup**
  - Next.js 16 with App Router
  - TypeScript strict mode
  - Tailwind CSS v4 with Bearded Theme Black & Gold
  - Biome linting/formatting
  - Bun runtime

- [x] **State Machine Tokenizer** (`lib/tokenizer/`)
  - Character stream with position tracking and lookahead
  - State machine for handling multi-line constructs
  - Token types: keyword, string, number, comment, operator, punctuation, identifier, function, class, constant, property, etc.
  - Escape sequence handling in strings
  - Template literal support with `${}` expressions
  - Number formats: decimal, hex (`0x`), binary (`0b`), octal (`0o`), BigInt (`n`), scientific notation
  - Multi-line comment continuation

- [x] **TypeScript/JavaScript Language Support**
  - Keywords, operators, punctuation
  - Constants (`true`, `false`, `null`, `undefined`, `NaN`, `Infinity`)
  - Built-in types and utilities
  - Function and class detection

- [x] **Syntax Highlighting** (`lib/highlighting/`)
  - Token-to-CSS class mapping
  - React element generation
  - Memoized line renderer
  - Bearded Theme Black & Gold colors

- [x] **PieceTable Text Buffer** (`lib/editor/pieceTable.ts`)
  - Efficient data structure for text editing (used by VS Code)
  - Two buffers: original (immutable) and add (append-only)
  - O(1) append for typing
  - Snapshot-based undo/redo
  - Line cache with binary search for O(log n) line access

- [x] **Cursor & Selection System**
  - Full cursor positioning and navigation
  - Multi-line selection with visual highlighting
  - Shift+Click to extend selection
  - Forward and backward selection support
  - Cursor blinking animation (530ms)
  - Auto-scroll to keep cursor visible

- [x] **Text Editing Operations**
  - Insert, delete, backspace
  - Tab insertion (configurable spaces)
  - Word-by-word deletion (Alt+Backspace/Delete)
  - Delete to line start/end (Cmd+Backspace/Delete)
  - Select all (Cmd+A)

- [x] **Undo/Redo System** (`hooks/useEditorState.ts`)
  - Command-based history with stacks
  - Batch editing within 300ms window
  - Max 1000 history entries
  - Full state snapshots using PieceTable

- [x] **Clipboard Integration**
  - Copy (Cmd+C), Cut (Cmd+X), Paste (Cmd+V)
  - Native clipboard API support
  - IME (Input Method Editor) support for international text

- [x] **Virtual Scrolling** (`hooks/useViewport.ts`)
  - Only renders visible lines + buffer
  - Efficient for large files (10k+ lines)
  - ResizeObserver for viewport changes
  - Horizontal and vertical scrolling

- [x] **IndexedDB File System** (`lib/storage/`)
  - Create, read, update, delete files
  - Create and delete directories
  - Rename and move nodes
  - Hierarchical file tree structure
  - Auto language detection from extension

- [x] **Tab Bar** (`components/Editor/TabBar.tsx`)
  - Drag-and-drop tab reordering
  - Close button with unsaved changes indicator (•)
  - Visual indicator for active tab
  - Horizontal scrolling for many tabs

- [x] **Explorer/File Tree** (`components/Editor/Explorer.tsx`)
  - Collapsible/expandable directories
  - File and folder icons (lucide-react)
  - Drag-and-drop file organization
  - Context menu (rename, delete)
  - Inline rename with Enter/Escape
  - Sorted alphabetically (directories first)

- [x] **Activity Bar** (`components/Editor/ActivityBar.tsx`)
  - Explorer toggle button
  - Keyboard shortcuts modal
  - Tooltip support

- [x] **Welcome Screen** (`components/Editor/WelcomeScreen.tsx`)
  - Animated welcome interface
  - "Create New File" call-to-action
  - Feature cards highlighting capabilities
  - Keyboard shortcuts quick reference

- [x] **Status Bar**
  - Current line and column position
  - File name display
  - Language mode indicator
  - UTF-8 encoding

- [x] **Line Numbers/Gutter** (`components/Editor/Gutter.tsx`)
  - Fixed 60px width
  - Current line highlighting
  - Virtual scrolling optimization

- [x] **Keyboard Shortcuts** (comprehensive)
  - Navigation: Arrow keys, Cmd+Arrow, Alt+Arrow, Home/End
  - Editing: Cmd+Z/Y, Cmd+S, Cmd+A, Tab
  - Deletion: Backspace, Delete, word/line deletion
  - Application: Cmd+B (explorer), Cmd+N (new file)

- [x] **UI Components**
  - Tooltip component
  - Modal component
  - Toast component
  - CSS variable theming system

- [x] **Additional Language Support**
  - CSS tokenizer (selectors, at-rules, colors, units)
  - HTML tokenizer (tags, attributes, entities, comments)
  - JSON tokenizer (property keys, values, structural)
  - Markdown tokenizer (headings, bold/italic, code blocks, links)
  - Python tokenizer (keywords, decorators, triple-quoted strings)

- [x] **Find & Replace** (`components/Editor/FindReplace.tsx`)
  - Find input with match count display
  - Replace input with Replace/Replace All buttons
  - Previous/Next navigation (Enter/Shift+Enter)
  - Case sensitivity toggle
  - Regex toggle
  - Keyboard shortcuts: Cmd+F (find), Cmd+H (replace), Escape (close)

- [x] **Command Palette** (`components/Editor/CommandPalette.tsx`)
  - Fuzzy search input
  - Categorized command list (File, Edit, View)
  - Keyboard navigation (Arrow Up/Down, Enter to execute)
  - Show keyboard shortcuts next to commands
  - Keyboard shortcuts: Cmd+Shift+P, Cmd+K

### Remaining

- [ ] **Editor Features**
  - Auto-indent on Enter
  - Smart bracket insertion
  - Line highlighting (active line background)
  - Line numbers click to select entire line

- [ ] **Search & Navigation**
  - Go to line (Cmd+G)
  - File picker/quick open (Cmd+P)

- [ ] **Advanced Features**
  - Bracket matching and highlighting
  - Code folding
  - Minimap
  - Multi-cursor editing
  - Auto-complete/IntelliSense
  - Word wrap (toggle exists but not functional)

- [ ] **Performance Optimizations**
  - Web Worker tokenization for files >1000 lines
  - Incremental tokenization (only re-tokenize changed lines)

## Future Feature Ideas

### Collaboration & Integration
- Collaborative editing (WebRTC/CRDTs)
- Git integration (diff viewer, blame, commit history)
- AI assistant panel
- Terminal emulator

### Editor Enhancements
- Split editor panes (horizontal/vertical)
- Snippets system with templating
- Zen/distraction-free mode
- Custom themes with live preview editor
- Multiple color schemes

### Export & Import
- Export to HTML/PDF
- Export as image (code screenshot)
- Import from URL/GitHub gist

### Additional Languages
- Rust tokenizer
- Go tokenizer
- SQL tokenizer
- YAML/TOML tokenizer
- Shell script tokenizer

## Theme Colors (Bearded Theme Black & Gold)

| Token Type | Color | Hex |
|------------|-------|-----|
| Keywords | Blue | `#11b7d4` |
| Strings | Salmon | `#c62f52` |
| Numbers | Turquoise | `#38c7bd` |
| Comments | Green | `#00a884` |
| Functions | Gold | `#c7910c` |
| Variables | Pink | `#d46ec0` |
| Classes | Purple | `#a85ff1` |
| Constants | Orange | `#d4770c` |
| Background | Black | `#111418` |

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

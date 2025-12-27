# Maple Editor - Implementation Progress

## Overview

Building a production-quality text editor with VS Code-like responsiveness. No syntax highlighting in this phase - focus purely on text editing mechanics.

**Data Structure:** Piece Table
**Target Performance:** <16ms typing latency, 60fps scroll

---

## ✅ Completed Components

### Core Data Structure

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| PieceTable | `lib/editor/pieceTable.ts` | ✅ Complete | Insert, delete, getText, getLine, snapshot/restore |
| Coordinate Utils | `lib/editor/coordinates.ts` | ✅ Complete | pixelToPosition, positionToPixel, getVisibleLineRange |

### Editor Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| CodeEditor | `components/Editor/CodeEditor.tsx` | ✅ Complete | Main container, orchestrates all components |
| LineRenderer | `components/Editor/LineRenderer.tsx` | ✅ Complete | Virtual scrolling, renders visible lines only |
| Line | `components/Editor/Line.tsx` | ✅ Complete | Memoized single line component |
| Gutter | `components/Editor/Gutter.tsx` | ✅ Complete | Line numbers with current line highlight |
| CursorRenderer | `components/Editor/CursorRenderer.tsx` | ✅ Complete | Blinking cursor at correct position |
| SelectionRenderer | `components/Editor/SelectionRenderer.tsx` | ✅ Complete | Multi-line selection highlighting |
| HiddenTextarea | `components/Editor/HiddenTextarea.tsx` | ✅ Complete | Input capture, IME, clipboard support |

### Hooks

| Hook | File | Status | Notes |
|------|------|--------|-------|
| useEditorState | `hooks/useEditorState.ts` | ✅ Complete | Core state: cursor, selection, content, undo/redo |
| useViewport | `hooks/useViewport.ts` | ✅ Complete | Scroll position, visible line range |
| useEditorPersistence | `hooks/useEditorPersistence.ts` | ✅ Complete | IndexedDB auto-save with debouncing |

### Type Definitions

| File | Status | Notes |
|------|--------|-------|
| `types/editor.ts` | ✅ Complete | CursorPosition, Selection, EditorConfig, EditorCommand, etc. |

---

## ✅ Features Tested & Working

### Text Input
- [x] Character insertion (real-time, no lag)
- [x] Enter key creates new line
- [x] Tab inserts 4 spaces
- [x] Backspace deletes character/selection
- [x] Delete key (forward delete)
- [x] IME composition support (for CJK input)

### Cursor Navigation
- [x] Arrow keys (left, right, up, down)
- [x] Home/End (line start/end)
- [x] Cmd+Arrow (word/document navigation)
- [x] Alt+Arrow (word navigation)
- [x] Cmd+Home/End (document start/end)

### Selection
- [x] Shift+Arrow extends selection
- [x] Cmd+A selects all
- [x] Mouse click positions cursor
- [x] Selection rendering (highlight)

### Undo/Redo
- [x] Cmd+Z undo
- [x] Cmd+Shift+Z redo
- [x] History batching (300ms window)
- [x] Max history size (1000 entries)

### Virtual Scrolling
- [x] Only renders visible lines + buffer
- [x] Smooth scrolling
- [x] Correct line positioning with padding

### Persistence
- [x] Auto-save to IndexedDB (500ms debounce)
- [x] Load content on mount
- [x] Dirty state tracking

---

## 🐛 Bugs Fixed

### 1. Text Not Appearing Until Enter Pressed
**Symptom:** Characters typed but not visible until pressing Enter
**Root Cause:** `useMemo` in LineRenderer depended on `getLine` function reference which never changed
**Fix:** Added `version` prop that increments on each content change, added to useMemo deps
**Files:** `LineRenderer.tsx`, `useEditorState.ts`, `CodeEditor.tsx`

### 2. Cursor/Selection Offset by Gutter Width
**Symptom:** Cursor appeared 60px to the right of where it should be
**Root Cause:** CursorRenderer and SelectionRenderer were adding `gutterWidth` to left position, but they're already inside `editor-text-area` which is positioned after the gutter
**Fix:** Removed `gutterWidth` from left calculation in both components
**Files:** `CursorRenderer.tsx`, `SelectionRenderer.tsx`

### 3. Character Width Measurement Mismatch
**Symptom:** Cursor drifts away from text position as more characters are typed
**Root Cause:** Canvas measurement of "M" character didn't match actual CSS font rendering
**Fix:** Switched to DOM-based measurement that matches actual rendering
**Files:** `lib/editor/coordinates.ts`

---

## 🔧 Current Issues / In Progress

### 1. Cursor Position Drift
**Status:** Investigating
**Symptom:** Cursor position slowly drifts from actual text position when typing many characters
**Likely Cause:** CSS variable `--font-jetbrains-mono` not resolving in measurement element, falling back to different font
**Debug Info:** Console shows `resolvedFontFamily` to verify what font is actually being used

### 2. Selection Highlight Misalignment
**Status:** Investigating
**Symptom:** Selection highlight rectangle doesn't align with actual text position
**Related To:** Same root cause as cursor position drift - charWidth measurement mismatch
**Note:** Selection highlight IS rendering, but position is off

### 3. Cannot Select Beginning of Row
**Status:** Needs investigation
**Symptom:** Clicking at the very start of a line doesn't position cursor at column 1
**Debug Logs Added:** `coordinates.ts` logs click coordinates and calculated position

### 4. Syntax Highlighting Not Implemented
**Status:** Intentionally deferred
**Note:** This phase focuses on text editing mechanics only. Syntax highlighting will be Phase 2 using the custom tokenizer in `lib/tokenizer/`

---

## 📋 Remaining Work

### Phase 1: Fix Current Issues
- [ ] Verify JetBrains Mono font loads correctly
- [ ] Ensure charWidth measurement matches actual rendering
- [ ] Fix beginning-of-row selection
- [ ] Remove debug console.log statements after fixes confirmed

### Phase 2: Selection Polish
- [ ] Mouse drag to select
- [ ] Double-click to select word
- [ ] Triple-click to select line
- [ ] Shift+click to extend selection

### Phase 3: Clipboard Operations
- [ ] Cmd+C copy (partially implemented)
- [ ] Cmd+X cut (partially implemented)
- [ ] Cmd+V paste (partially implemented)
- [ ] Test with actual clipboard API

### Phase 4: Edge Cases
- [ ] Empty file handling
- [ ] Very long lines (horizontal scroll)
- [ ] Large paste operations
- [ ] Binary file detection

### Phase 5: Performance Testing
- [ ] Test with 10,000+ line files
- [ ] Measure typing latency (<16ms target)
- [ ] Profile scroll performance (60fps target)
- [ ] Memory usage analysis

### Phase 6: Visual Polish
- [ ] Cursor blink timing refinement
- [ ] Smooth cursor movement animation
- [ ] Selection color consistency
- [ ] Current line highlight opacity

---

## 📁 File Structure

```
lib/editor/
├── pieceTable.ts          # ✅ Piece table data structure
├── coordinates.ts         # ✅ Pixel <-> position conversion
└── index.ts               # ✅ Public exports

components/Editor/
├── CodeEditor.tsx         # ✅ Root container
├── HiddenTextarea.tsx     # ✅ Input capture
├── Gutter.tsx             # ✅ Line numbers
├── LineRenderer.tsx       # ✅ Virtual scrolling
├── Line.tsx               # ✅ Single line (memoized)
├── CursorRenderer.tsx     # ✅ Blinking cursor
├── SelectionRenderer.tsx  # ✅ Selection highlighting
└── index.ts               # ✅ Public exports

hooks/
├── useEditorState.ts      # ✅ Core editor logic
├── useViewport.ts         # ✅ Scroll position, visible range
└── useEditorPersistence.ts # ✅ Auto-save to IndexedDB

types/
└── editor.ts              # ✅ TypeScript definitions

utils/
├── debounce.ts            # ✅ Debounce/throttle utilities
└── constants.ts           # ✅ Editor constants
```

---

## 🔍 Debug Logs Currently Active

These logs are temporarily added for debugging and should be removed once issues are fixed:

| File | Function | Log Purpose |
|------|----------|-------------|
| `HiddenTextarea.tsx` | handleInput | Track input events |
| `useEditorState.ts` | insertText | Track text insertion |
| `useEditorState.ts` | executeCommand | Track all commands |
| `LineRenderer.tsx` | render | Track re-renders and version |
| `LineRenderer.tsx` | useMemo | Track visible lines rebuild |
| `coordinates.ts` | measureCharWidth | Track font resolution and charWidth |
| `coordinates.ts` | pixelToPosition | Track click coordinate conversion |
| `CodeEditor.tsx` | getPositionFromMouse | Track mouse position conversion |

---

## 🛠 Configuration

### Editor Defaults (`types/editor.ts`)
```typescript
{
    tabSize: 4,
    lineHeight: 20,
    fontSize: 14,
    fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
    wordWrap: false,
    showLineNumbers: true,
    showMinimap: false,
}
```

### Constants (`utils/constants.ts`)
```typescript
{
    TAB_SIZE: 4,
    LINE_HEIGHT: 20,
    GUTTER_WIDTH: 60,
    MAX_FILE_SIZE: 10MB,
    TOKENIZE_DEBOUNCE: 16ms,
    AUTO_SAVE_DELAY: 500ms,
}
```

---

## 📝 Notes

### Why Piece Table?
- O(1) append for typing (common operation)
- Memory efficient (original content never duplicated)
- Efficient undo/redo via snapshots
- Better than array-of-lines for large files

### Why Hidden Textarea?
- Native IME support (Chinese, Japanese, Korean input)
- Native clipboard integration
- Accessibility (screen readers)
- Mobile keyboard support

### Font Choice: JetBrains Mono
- True monospace (all characters same width)
- Designed specifically for code
- Excellent readability at small sizes
- Loaded locally via `next/font/local` for performance

---

*Last Updated: December 26, 2024*

# Testing Implementation Plan - Remaining Work

## Status as of Week 3 Complete

### Completed (Weeks 1-3)
- ✅ Test infrastructure (vitest, setup, fixtures, utilities)
- ✅ 401 tests passing across 11 files (4,342 lines)
- ✅ PieceTable tests + benchmarks (98.8% statements)
- ✅ Coordinates tests (97.43% statements)
- ✅ Tokenizer infrastructure + all languages
- ✅ useEditorState tests (95.25% statements)
- ✅ FileSystem unit tests (89.17% statements)
- ✅ Search tests (100% statements)

### Current Coverage Issues
| Module | Current | Target | Status |
|--------|---------|--------|--------|
| lib/tokenizer/** | 83.13% | 90% | Needs work |
| hooks/useEditorState.ts | 85.18% branches | 90% | Needs work |
| lib/storage/** | 75% branches | 80% | Needs work |

---

## Week 4: Coverage Gaps & Remaining Hook Tests

### Day 1-2: Fix Tokenizer Coverage Gaps

#### CSS Tests (`lib/tokenizer/languages/css.test.ts`)
**Uncovered:** At-rules edge cases, CSS functions with multiple params, calc(), gradients
- Test: `@media` with complex queries
- Test: `@keyframes` with percentage values
- Test: `@font-face` with multiple descriptors
- Test: `@supports` with logical operators
- Test: `@container` queries
- Test: `rgb()`, `rgba()`, `hsl()`, `hsla()` functions
- Test: `calc()` with nested operations
- Test: `linear-gradient()`, `radial-gradient()` with multiple stops
- Test: `var()` with fallback
- Test: `clamp()`, `min()`, `max()` functions
- Test: Attribute selectors: `[attr]`, `[attr=value]`, `[attr~=value]`
- Test: Pseudo-elements: `::before`, `::after`, `::first-line`, `::selection`
- Test: Complex nesting: `.parent { .child { ... } }`

#### HTML Tests (`lib/tokenizer/languages/html.test.ts`)
**Uncovered:** Self-closing tags, void elements, attribute edge cases
- Test: Void elements: `<area>`, `<base>`, `<col>`, `<link>`, `<meta>`, `<br>`, `<hr>`, `<img>`, `<input>`
- Test: Self-closing with space: `<br />`, `<img />`
- Test: Attributes without values: `<input disabled>`
- Test: Attributes with no quotes: `<div class=foo>`
- Test: Attributes with single quotes: `<div class='foo'>`
- Test: Data attributes: `<div data-value="test">`
- Test: Event attributes: `onclick`, `onload`, `onerror`
- Test: SVG elements in HTML context
- Test: DOCTYPE variations: `<!DOCTYPE html>`, `<!DOCTYPE HTML>`
- Test: Unclosed tags
- Test: Malformed HTML: missing `>`, unclosed quotes

#### Python Tests (`lib/tokenizer/languages/python.test.ts`)
**Uncovered:** Decorators, triple-quoted strings edge cases
- Test: `@staticmethod`, `@classmethod`, `@property`
- Test: `@dataclass`, `@abstractmethod`
- Test: `@functools.lru_cache` (dotted decorator)
- Test: Decorators with arguments: `@decorator(arg)`
- Test: Triple-quoted strings: `"""` and `'''` with escapes
- Test: Triple-quoted with content on first line: `"""content"""`
- Test: f-strings with expressions: `f"{x + y}"`
- Test: f-strings with nested braces: `f"{{{x}}}"`
- Test: f-strings with conversions: `f"{x!r}"`
- Test: f-strings with format specs: `f"{x:.2f}"`
- Test: Context managers: `with open() as f:`
- Test: Async functions: `async def foo():`
- Test: `match/case` statements (Python 3.10+)
- Test: Type hints: `def foo(x: int) -> str:`
- Test: Walrus operator: `if (n := len(x)) > 0:`

#### Markdown Tests (`lib/tokenizer/languages/markdown.test.ts`)
**Uncovered:** List nesting, code blocks edge cases
- Test: Ordered lists: `1.`, `2.`, `100.`
- Test: Unordered lists: `-`, `*`, `+`
- Test: Nested lists with proper indentation
- Test: Task lists: `- [ ]`, `- [x]`, `- [X]`
- Test: Mixed task and regular lists
- Test: Code blocks with language: \```typescript
- Test: Code blocks without language: \```
- Test: Inline code: `code`
- Test: Code with backticks: `` `code` ``
- Test: Links: `[text](url)`, `[text](url "title")`
- Test: Reference links: `[text][ref]`, `[ref]: url`
- Test: Images: `![alt](url)`, `![alt][ref]`
- Test: Blockquotes: `> text`, `>> nested`
- Test: Horizontal rules: `---`, `***`, `___`
- Test: Strikethrough: `~~text~~`
- Test: Escaped characters: `\*not italic\*`
- Test: Tables with alignment
- Test: HTML in markdown

### Day 3: Fix useEditorState Branch Coverage

#### Add to `hooks/useEditorState.test.ts`
- Test: Tab switching detection with `initialContent` change
- Test: History batching exactly at 300ms boundary
- Test: Word navigation at line boundaries
- Test: Cursor clamping at document edges
- Test: `select all` with empty document
- Test: `moveCursorTo` with extend selection
- Test: History stack max size (1000 entries)
- Test: History overflow behavior
- Test: `select all` with large document
- Test: Cursor movement with very long lines
- Test: Selection across multiple lines with extend
- Test: Delete at document start
- Test: Delete at line boundaries

### Day 4: Fix IndexedDB Branch Coverage

#### New File: `lib/storage/indexedDB.test.ts`
- ✅ Test database initialization with version upgrade
- ✅ Test `onupgradeneeded` event handling
- ✅ Test error scenarios: DB not initialized
- ✅ Test `getAll()` with empty store
- ✅ Test concurrent operations
- ✅ Test `close()` method
- ✅ Test index creation and uniqueness constraints

#### Update: `lib/storage/fileSystem.test.ts`
- Test: `updateChildrenPaths` recursive updates
- Test: Move operations with deeply nested structures
- Test: Error handling in `moveNode` with invalid paths
- Test: Path conflict detection edge cases
- Test: Move file to root directory
- Test: Move directory with mixed content

### Day 5: Hook Tests (New Files)

#### New File: `hooks/useViewport.test.ts`
- ✅ Test initial state and dimensions
- ✅ Test ResizeObserver integration
- ✅ Test `scrollToLine` with line already visible
- ✅ Test `scrollToLine` centering calculation
- ✅ Test `scrollToPosition` horizontal scrolling
- ✅ Test buffer parameter effect
- ✅ Test viewport boundaries clamping
- Test: Scroll to very first line
- Test: Scroll to very last line
- Test: Horizontal scroll clamping
- Test: Multiple rapid scroll operations
- Test: Viewport resize during scroll

#### New File: `hooks/useEditorPersistence.test.ts`
- ✅ Test initialization and FileSystem setup
- ✅ Test file loading on mount
- ✅ Test auto-save debouncing
- ✅ Test force save Test duplicate content detection (no save)
 immediately
- ✅- ✅ Test error handling for failed saves
- ✅ Test `createFile` function
- ✅ Test cleanup on unmount
- Test: Multiple rapid content changes
- Test: Save during debounce period
- Test: Cancel debounced save
- Test: Create nested file structure

#### New File: `hooks/useFindReplace.test.ts`
- ✅ Test state management (query, matches, current index)
- ✅ Test search with case sensitivity
- ✅ Test regex mode
- ✅ Test `findNext` / `findPrevious` wraparound
- ✅ Test `replaceCurrent` returns new content
- ✅ Test `replaceAll` functionality
- ✅ Test show/hide replace UI
- ✅ Test reset state when closed
- Test: Replace with regex capture groups
- Test: Replace all with no matches
- Test: Find with very long document
- Test: Find unicode characters
- Test: Find special regex characters literally

#### New File: `hooks/useTabStatePersistence.test.ts`
- ✅ Test one-time restore on mount
- ✅ Test debounced save on tab changes
- ✅ Test invalid tab IDs handling
- ✅ Test empty tab state restoration
- ✅ Test mounted ref cleanup
- Test: Restore with 100+ tabs
- Test: Save/load with dirty tabs
- Test: Tab reordering persistence
- Test: Active tab switching

---

## Week 5: Integration & Component Tests

### Day 1-2: Integration Tests

#### New File: `hooks/useEditorState.integration.test.ts`
**Complete editing workflow tests:**
- Type code → create file → edit → save → close → reopen
- Multi-line editing with state synchronization
- Undo/redo across complex edits
- Find and replace workflow
- Selection operations + delete
- Word-by-word navigation
- Tab switching preserves state
- Large document operations (>1000 lines)
- Rapid typing with debounce
- Cut/copy/paste with clipboard
- Multiple selections
- Scroll position persistence

#### New File: `lib/storage/fileSystem.integration.test.ts`
**Complex directory workflows:**
- Create nested directory structure (5+ levels deep)
- Move files between nested directories
- Recursive delete with mixed files/folders
- Tab state persistence across multiple files
- Path conflict resolution
- Bulk operations (move multiple files)
- File rename propagation
- Directory rename with children
- Cross-directory move with name conflict
- Large file (10MB+) operations

### Day 3-5: Component Tests

#### New File: `components/Editor/LineRenderer.test.tsx`
- Test: Rendering with different token types
- Test: Syntax highlighting colors
- Test: Line wrapping scenarios
- Test: Selection highlight overlay
- Test: Cursor position rendering
- Test: Memoization with same line content
- Test: Empty line rendering
- Test: Long line rendering (>200 chars)
- Test: Tab character rendering
- Test: Unicode line content

#### New File: `components/Editor/CodeEditor.test.tsx`
- Test: Editor mounting with props
- Test: Keyboard event handling
- Test: Click-to-position cursor movement
- Test: Selection with mouse drag
- Test: Clipboard operations (copy/paste)
- Test: IME composition events
- Test: Auto-scroll on typing
- Test: Focus handling
- Test: Keyboard shortcuts
- Test: Tab key insertion
- Test: Enter key handling
- Test: Backspace/delete handling

#### New File: `components/Editor/CommandPalette.test.tsx`
- Test: Fuzzy search filtering
- Test: Keyboard navigation (arrows, enter)
- Test: Category grouping
- Test: Command execution callback
- Test: Opening/closing keyboard shortcuts
- Test: No results state
- Test: Recent commands sorting
- Test: Mouse click selection
- Test: Escape key to close

#### New File: `components/Editor/FindReplaceSidebar.test.tsx`
- Test: Query input changes
- Test: Replace input
- Test: Case/regex toggles
- Test: Navigation buttons
- Test: Match count display
- Test: Replace all button
- Test: Replace current button
- Test: Close button
- Test: Keyboard shortcuts

---

## Week 6: CI/CD & Documentation

### Day 1: GitHub Actions Workflow

#### New File: `.github/workflows/test.yml`
```yaml
- Test job on push/PR to main
  - Setup Bun
  - Install dependencies
  - Run type check
  - Run linter
  - Run tests with coverage
  - Upload to Codecov
  - Comment PR with coverage

- Benchmark job
  - Run benchmarks
  - Store results via benchmark-action
```

**Coverage Thresholds:**
- Global: 70% (statements, branches, functions, lines)
- `lib/tokenizer/**`: 90%
- `lib/editor/pieceTable.ts`: 90%
- `hooks/useEditorState.ts`: 90%
- `lib/storage/**`: 80%

### Day 2-3: Testing Documentation

#### New File: `docs/TESTING.md`
Sections:
1. **Overview** - Testing philosophy (unit/integration/component/benchmark)
2. **Running Tests** - All commands with examples
3. **Writing Tests** - Examples for each test type
4. **Test Organization** - File structure, naming conventions
5. **Mocking** - IndexedDB, functions, React hooks (with examples)
6. **Coverage Goals** - Module-specific targets table
7. **CI/CD** - GitHub Actions workflow explanation
8. **Troubleshooting** - Common issues and solutions

### Day 4: Final Coverage Fixes

- Run `bun test:coverage` and address any gaps
- Add edge case tests for uncovered branches
- Ensure all thresholds are met
- Run `bun lint` and `bun type-check`
- Verify all benchmarks pass

### Day 5: Verification & Handoff

- Run full test suite: `bun test:run` (should be ~800+ tests)
- Run coverage: `bun test:coverage` (should meet all thresholds)
- Run benchmarks: `bun test:bench`
- Run linter: `bun lint`
- Run type check: `bun type-check`
- Document any workarounds or notes
- Create summary of final stats

---

## Expected Final Stats

| Metric | Current | Target | Expected Final |
|--------|---------|--------|----------------|
| Test Files | 11 | 22-25 | ~24 |
| Total Lines | 4,342 | 8,000-10,000 | ~9,500 |
| Test Count | 401 | 800-900 | ~850 |
| Coverage (Global) | 88.1% | 70% | ~90% |
| Coverage (Tokenizer) | 83.13% | 90% | ~92% |
| Coverage (useEditorState) | 95.25% / 85.18% | 90% | ~96% / ~92% |
| Coverage (Storage) | 89.17% / 75% | 80% | ~91% / ~85% |

---

## Critical Files to Focus On

1. **`lib/tokenizer/languages/*.ts`** - Add edge case tests for uncovered branches
2. **`hooks/useEditorState.test.ts`** - Add tab switching and history batching tests
3. **`lib/storage/indexedDB.test.ts`** - New file, critical for storage coverage
4. **`hooks/useViewport.test.ts`** - New file, important for scrolling functionality
5. **`hooks/useEditorPersistence.test.ts`** - New file, critical for auto-save
6. **`hooks/useFindReplace.test.ts`** - New file, search/replace is user-facing
7. **`hooks/useEditorState.integration.test.ts`** - Complete workflow validation
8. **`.github/workflows/test.yml`** - CI/CD automation
9. **`docs/TESTING.md`** - Comprehensive testing guide

---

## Success Criteria

✅ All tests pass (`bun test:run`)
✅ Coverage thresholds met (no CI failures)
✅ CI/CD workflow runs successfully on PR
✅ Complete testing guide with examples
✅ Performance benchmarks established
✅ Zero regressions - editor functionality unchanged
✅ README updated with testing section

---

## Command Reference

```bash
# Run tests
bun test:run           # Run all tests once
bun test:watch         # Watch mode for development
bun test:ui            # UI mode with vitest

# Coverage
bun test:coverage      # Generate coverage report

# Benchmarks
bun test:bench         # Run performance benchmarks

# Linting & Type Checking
bun lint               # Check code with Biome
bun lint:fix           # Fix linting issues
bun format             # Format code with Biome
bun type-check         # Run TypeScript type checking
```

---

## Notes

- Tests use **Vitest** with **happy-dom** for DOM simulation
- IndexedDB operations use **fake-indexeddb** for testing
- All tests must be fully typed (TypeScript strict mode)
- Follow existing code style and conventions
- Use Biome for linting and formatting
- Test files co-located with source files (e.g., `*.test.ts` next to `*.ts`)

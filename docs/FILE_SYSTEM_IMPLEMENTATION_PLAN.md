# File System Implementation Plan

This document outlines the implementation of file persistence, file explorer, and tab system for Maple editor.

---

## Current State Summary

### What Exists
- **Editor Core**: Full-featured with PieceTable, virtual scrolling, custom tokenizer, undo/redo
- **Storage Layer**: `lib/storage/` with IndexedDB wrapper and FileSystem class (CRUD operations)
- **Types**: `FileNode`, `DirectoryNode`, `Tab` defined in `types/file.ts`
- **Hook**: `useEditorPersistence.ts` exists but is NOT integrated
- **UI**: Explorer is a placeholder, TabBar shows one hardcoded tab

### What's Missing
- Centralized state management for workspace
- Recursive directory deletion in FileSystem
- Root directory initialization
- Full Explorer UI with file tree
- Multi-tab functionality
- Integration of persistence with editor

---

## Architecture Overview

### State Management: React Context + useReducer

```
WorkspaceProvider (Context)
    |
    +-- WorkspaceState (useReducer)
    |       - tabs: EditorTab[]
    |       - activeTabId: string | null
    |       - fileTree: TreeNode[]
    |       - isInitialized: boolean
    |
    +-- FileSystem instance (ref)
    |
    +-- Actions: openFile, closeTab, saveFile, createFile, deleteNode, etc.
```

**Why Context?**
- Multiple components need shared state (Explorer, TabBar, Editor, StatusBar)
- Changes propagate across areas (save affects tab dirty state, tree)
- Avoids external dependencies

---

## File Structure Changes

### New Files

```
maple/
├── contexts/
│   └── WorkspaceContext.tsx          # Central state management
├── types/
│   └── workspace.ts                   # Workspace types
├── components/Editor/
│   ├── TabBar.tsx                    # Tab bar component
│   ├── EditorPane.tsx                # Editor wrapper per tab
│   ├── FileTreeItem.tsx              # Tree node component
│   ├── ExplorerHeader.tsx            # Explorer toolbar
│   ├── StatusBar.tsx                 # Enhanced status bar
│   └── WelcomeScreen.tsx             # Empty state
├── components/ui/
│   ├── FileIcon.tsx                  # Language-aware icons
│   └── ContextMenu.tsx               # Right-click menu
├── utils/
│   └── fileUtils.ts                  # File utilities
└── hooks/
    └── useUnsavedChanges.ts          # Browser unload protection
```

### Files to Modify

| File | Changes |
|------|---------|
| `app/editor/page.tsx` | Wrap in WorkspaceProvider, integrate new components |
| `components/Editor/Explorer.tsx` | Full implementation with file tree |
| `lib/storage/fileSystem.ts` | Add recursive delete, root init, move operations |
| `types/file.ts` | Ensure DirectoryNode.children typed correctly |

---

## Implementation Phases

### Phase 1: Core Infrastructure

**1.1 Create Workspace Types** (`types/workspace.ts`)

```typescript
export interface EditorTab {
    id: string;
    fileId: string | null;      // null for untitled files
    fileName: string;
    filePath: string;
    isDirty: boolean;
    isActive: boolean;
    isPinned: boolean;
    language: SupportedLanguage | null;
    scrollPosition?: { scrollTop: number; scrollLeft: number };
    cursorPosition?: CursorPosition;
}

export interface TreeNode {
    node: FileNode;
    children: TreeNode[];
    isExpanded: boolean;
}

export interface WorkspaceState {
    tabs: EditorTab[];
    activeTabId: string | null;
    fileTree: TreeNode[];
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
}

export type WorkspaceAction =
    | { type: "INITIALIZE"; fileTree: TreeNode[] }
    | { type: "OPEN_FILE"; tab: EditorTab }
    | { type: "CLOSE_TAB"; tabId: string }
    | { type: "SET_ACTIVE_TAB"; tabId: string }
    | { type: "MARK_DIRTY"; tabId: string; isDirty: boolean }
    | { type: "REFRESH_FILE_TREE"; fileTree: TreeNode[] }
    | { type: "TOGGLE_DIRECTORY"; nodeId: string }
    | { type: "ADD_NODE"; node: FileNode; parentId: string }
    | { type: "REMOVE_NODE"; nodeId: string };
```

**1.2 Create WorkspaceContext** (`contexts/WorkspaceContext.tsx`)

Key responsibilities:
- Initialize FileSystem and root directory on mount
- Load file tree from IndexedDB
- Provide actions: `openFile`, `closeTab`, `saveFile`, `createFile`, `deleteNode`, `toggleDirectory`
- Handle tab switching logic (activate next tab on close)

**1.3 Enhance FileSystem** (`lib/storage/fileSystem.ts`)

Add methods:
```typescript
async ensureRootDirectory(): Promise<void>
async deleteDirectoryRecursive(id: string): Promise<void>
async moveNode(id: string, newParentId: string): Promise<void>
```

---

### Phase 2: Tab Bar Component

**File**: `components/Editor/TabBar.tsx`

```typescript
// Structure
<div role="tablist" className="flex h-9 overflow-x-auto border-b">
    {tabs.map(tab => (
        <Tab
            key={tab.id}
            tab={tab}
            onClose={handleClose}
            onSelect={handleSelect}
        />
    ))}
</div>

// Each tab shows:
// - File icon (language-aware)
// - File name
// - Dirty indicator (*)
// - Close button (X)
```

**Behaviors:**
- Click tab to activate
- Click X to close (with unsaved check)
- Active tab has distinct background
- Horizontal scroll for many tabs

---

### Phase 3: File Explorer

**File**: `components/Editor/Explorer.tsx`

```typescript
// Structure
<div className={cn("w-60 border-l", isOpen ? "w-60" : "w-0")}>
    <ExplorerHeader />  // New File, New Folder, Refresh buttons
    <div className="overflow-y-auto">
        {fileTree.map(node => (
            <FileTreeItem
                key={node.node.id}
                node={node}
                depth={0}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            />
        ))}
    </div>
</div>
```

**FileTreeItem Component** (`components/Editor/FileTreeItem.tsx`)

```typescript
// Recursive component for tree nodes
<div style={{ paddingLeft: 8 + depth * 16 }}>
    {isDirectory && <ChevronRight className={node.isExpanded && "rotate-90"} />}
    {isDirectory ? <FolderIcon /> : <FileIcon language={...} />}
    <span>{node.node.name}</span>
</div>
{isExpanded && children.map(child => <FileTreeItem ... />)}
```

**Features:**
- Click file to open in editor
- Click folder to expand/collapse
- Right-click for context menu (rename, delete)
- Inline rename input
- Directories sorted before files

---

### Phase 4: Editor Integration

**EditorPane Component** (`components/Editor/EditorPane.tsx`)

Wraps CodeEditor for each tab:
- Loads content from IndexedDB when tab activates
- Passes content to CodeEditor
- Listens for Cmd+S to save
- Tracks dirty state via onChange

```typescript
function EditorPane({ tabId }: { tabId: string }) {
    const { saveFile, markDirty, getFileSystem } = useWorkspace();
    const [content, setContent] = useState("");

    // Load content on mount
    useEffect(() => {
        const fs = getFileSystem();
        fs.readFile(tab.fileId).then(file => setContent(file.content));
    }, [tab.fileId]);

    // Save handler
    useEffect(() => {
        const handleSave = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                saveFile(tabId, content);
            }
        };
        window.addEventListener("keydown", handleSave);
        return () => window.removeEventListener("keydown", handleSave);
    }, []);

    return <CodeEditor key={tabId} initialContent={content} onChange={...} />;
}
```

**Update Editor Page** (`app/editor/page.tsx`)

```typescript
export default function EditorPage() {
    return (
        <WorkspaceProvider>
            <div className="flex h-screen flex-col">
                <TabBar />
                <div className="flex flex-1">
                    {activeTabId ? <EditorPane tabId={activeTabId} /> : <WelcomeScreen />}
                    <Explorer isOpen={isExplorerOpen} />
                    <ActivityBar />
                </div>
                <StatusBar />
            </div>
        </WorkspaceProvider>
    );
}
```

---

### Phase 5: Utilities & Polish

**File Utilities** (`utils/fileUtils.ts`)

```typescript
// Get language from filename extension
function getLanguageFromFilename(filename: string): SupportedLanguage | null

// Validate filename (no invalid chars, not reserved names)
function isValidFilename(name: string): boolean

// Sort nodes: directories first, then alphabetically
function sortFileTree(nodes: TreeNode[]): TreeNode[]

// Build tree structure from flat file list
function buildFileTree(files: FileNode[], parentId: string): TreeNode[]
```

**Unsaved Changes Hook** (`hooks/useUnsavedChanges.ts`)

```typescript
// Warns user before leaving page with unsaved tabs
function useUnsavedChanges(tabs: EditorTab[]) {
    useEffect(() => {
        if (!tabs.some(t => t.isDirty)) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [tabs]);
}
```

---

## Data Flow

### Opening a File

```
User clicks file in Explorer
    → Explorer.handleFileClick(node)
    → WorkspaceContext.openFile(fileId)
        → FileSystem.readFile(fileId)
        → dispatch(OPEN_FILE, { tab })
    → EditorPane re-renders
    → CodeEditor receives content
```

### Saving a File

```
User presses Cmd+S
    → EditorPane.handleKeyDown
    → WorkspaceContext.saveFile(tabId, content)
        → FileSystem.updateFile(fileId, content)
        → dispatch(MARK_DIRTY, { isDirty: false })
    → TabBar updates (removes *)
```

### Creating a New File

```
User clicks "New File" in Explorer
    → Shows inline input
    → User types name, presses Enter
    → WorkspaceContext.createFile(parentId, name)
        → FileSystem.createFile(...)
        → dispatch(ADD_NODE, { node })
        → openFile(newFileId)
    → New file opens in editor
```

---

## Critical Implementation Details

### Tab Close Logic

```typescript
case "CLOSE_TAB": {
    const newTabs = state.tabs.filter(t => t.id !== action.tabId);

    // If closing active tab, activate adjacent
    if (state.activeTabId === action.tabId) {
        const closedIndex = state.tabs.findIndex(t => t.id === action.tabId);
        const nextTab = newTabs[closedIndex] || newTabs[closedIndex - 1];
        return { ...state, tabs: newTabs, activeTabId: nextTab?.id ?? null };
    }

    return { ...state, tabs: newTabs };
}
```

### Root Directory Initialization

```typescript
const ROOT_NODE_ID = "root";

async ensureRootDirectory(): Promise<void> {
    const existing = await this.storage.get("files", ROOT_NODE_ID);
    if (!existing) {
        const root: DirectoryNode = {
            id: ROOT_NODE_ID,
            name: "workspace",
            type: "directory",
            parentId: null,
            path: "/",
            children: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await this.storage.put("files", root);
    }
}
```

### Recursive Directory Delete

```typescript
async deleteDirectoryRecursive(id: string): Promise<void> {
    const children = await this.listDirectory(id);
    for (const child of children) {
        if (child.type === "directory") {
            await this.deleteDirectoryRecursive(child.id);
        } else {
            await this.deleteFile(child.id);
        }
    }
    await this.storage.delete("files", id);
}
```

---

## CSS Variables to Add

```css
/* In globals.css */
:root {
    --ui-tab-bg: #1e1e1e;
    --ui-tab-active-bg: #252526;
    --ui-sidebar-bg: #252526;
    --ui-statusbar-bg: #007acc;
}

@theme inline {
    --color-ui-tab-bg: var(--ui-tab-bg);
    --color-ui-tab-active-bg: var(--ui-tab-active-bg);
    --color-ui-sidebar-bg: var(--ui-sidebar-bg);
    --color-ui-statusbar-bg: var(--ui-statusbar-bg);
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+S | Save current file |
| Cmd+W | Close current tab |
| Cmd+N | New file |
| Ctrl+Tab | Next tab |
| Ctrl+Shift+Tab | Previous tab |

---

## Implementation Order

1. **Phase 1**: Types + WorkspaceContext + FileSystem enhancements
2. **Phase 2**: TabBar component
3. **Phase 3**: Explorer with FileTreeItem
4. **Phase 4**: EditorPane + page integration
5. **Phase 5**: Utilities, shortcuts, polish

---

## Performance Considerations

- **FileTreeItem**: Use `React.memo` to prevent re-renders
- **Tab switching**: `key` prop on CodeEditor forces clean remount
- **Auto-save**: 500ms debounce (existing pattern)
- **Virtual scrolling**: Already implemented in editor, can extend to file tree if needed

---

## Future Extensibility

- **Multi-root workspaces**: TreeNode structure supports it
- **Collaborative editing**: Context actions can be broadcast
- **Plugin system**: Context provides all operations via single interface

---

**Last Updated**: 2025-12-27

# Maple Editor - Todo & Bug Fixes

## Critical Issues

- [ ] **Cmd+Shift+P keybind doesn't work** - Remove from command palette shortcut options
  - Currently only `Cmd+K` works
  - Status: Issue in `app/editor/page.tsx` keyboard event handling

- [ ] **Find & Replace - Up/Down arrow keys not working**
  - Arrow keys should navigate through matches
  - Location: `components/Editor/FindReplace.tsx`

- [ ] **Find doesn't highlight matched text**
  - Matches should be visually highlighted in the editor
  - Match should be shown with distinctive color/background
  - Location: `components/Editor/FindReplace.tsx`, `CodeEditor` component

## UI/UX Improvements

- [ ] **Find & Replace UI needs refresh**
  - Current design is minimal, needs more polish
  - Better visual hierarchy and spacing
  - More intuitive button layout
  - Location: `components/Editor/FindReplace.tsx`

- [ ] **Add Find & Replace to sidebar as separate panel**
  - Should appear as toggleable sidebar item (like Explorer)
  - Not just top-right floating panel
  - Add icon to activity bar
  - Location: `components/Editor/ActivityBar.tsx`, new sidebar component

- [ ] **Command Palette should show all items when empty**
  - Currently shows nothing if search query is empty
  - Should display full command list on open
  - Helps discoverability
  - Location: `components/Editor/CommandPalette.tsx`

## Animation & Aesthetics

- [ ] **Find & Replace needs entrance/exit animations**
  - Smooth slide-in from side when opening
  - Smooth fade/slide-out when closing
  - Should match Maple's calm, ethereal aesthetic
  - Subtle animations, not jarring
  - Location: `components/Editor/FindReplace.tsx`

- [ ] **Command Palette needs entrance/exit animations**
  - Smooth fade-in when opening
  - Smooth fade-out when closing
  - Subtle scale effect on entrance (optional)
  - Should feel polished and intentional
  - Location: `components/Editor/CommandPalette.tsx`

## Keyboard Shortcuts

- [ ] **Update keyboard shortcuts modal with new keybinds**
  - Add Find & Replace shortcuts: `Cmd+F`, `Cmd+H`
  - Add Command Palette shortcuts: `Cmd+K`, ~~`Cmd+Shift+P`~~
  - Add Find navigation: `Enter` (next), `Shift+Enter` (previous)
  - Location: `components/Editor/ActivityBar.tsx` or `components/ui/KeyboardShortcutsModal.tsx`

## Testing

- [ ] Test Find & Replace with various regex patterns
- [ ] Test Command Palette fuzzy search accuracy
- [ ] Verify all keyboard shortcuts work on Mac and Windows
- [ ] Test animations performance on older devices

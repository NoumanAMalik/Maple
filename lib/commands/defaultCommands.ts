import { commandRegistry, type Command } from "./registry";

export interface CommandHandlers {
    createFile: () => void;
    saveFile: () => void;
    closeTab: () => void;
    toggleExplorer: () => void;
    openFindReplace: () => void;
    selectAll: () => void;
    undo: () => void;
    redo: () => void;
}

export function registerDefaultCommands(handlers: CommandHandlers): void {
    const commands: Command[] = [
        // File commands
        {
            id: "file.new",
            label: "New File",
            category: "File",
            shortcut: "⌘N",
            action: handlers.createFile,
        },
        {
            id: "file.save",
            label: "Save File",
            category: "File",
            shortcut: "⌘S",
            action: handlers.saveFile,
        },
        {
            id: "file.close",
            label: "Close Tab",
            category: "File",
            shortcut: "⌘W",
            action: handlers.closeTab,
        },

        // Edit commands
        {
            id: "edit.undo",
            label: "Undo",
            category: "Edit",
            shortcut: "⌘Z",
            action: handlers.undo,
        },
        {
            id: "edit.redo",
            label: "Redo",
            category: "Edit",
            shortcut: "⌘⇧Z",
            action: handlers.redo,
        },
        {
            id: "edit.find",
            label: "Find and Replace",
            category: "Edit",
            shortcut: "⌘F",
            action: handlers.openFindReplace,
        },

        // Selection commands
        {
            id: "selection.selectAll",
            label: "Select All",
            category: "Selection",
            shortcut: "⌘A",
            action: handlers.selectAll,
        },

        // View commands
        {
            id: "view.toggleExplorer",
            label: "Toggle Explorer",
            category: "View",
            shortcut: "⌘B",
            action: handlers.toggleExplorer,
        },
    ];

    for (const cmd of commands) {
        commandRegistry.register(cmd);
    }
}

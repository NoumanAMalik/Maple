import { useState, useEffect } from "react";

export interface Command {
    id: string;
    label: string;
    category: "File" | "Edit" | "View" | "Navigation" | "Selection";
    shortcut?: string;
    action: () => void;
}

class CommandRegistry {
    private commands: Map<string, Command> = new Map();
    private listeners: Set<() => void> = new Set();

    register(command: Command): void {
        this.commands.set(command.id, command);
        this.notifyListeners();
    }

    unregister(id: string): void {
        this.commands.delete(id);
        this.notifyListeners();
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => {
            listener();
        });
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    getById(id: string): Command | undefined {
        return this.commands.get(id);
    }

    search(query: string): Command[] {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(
            (cmd) =>
                cmd.label.toLowerCase().includes(lowerQuery) ||
                cmd.category.toLowerCase().includes(lowerQuery) ||
                this.fuzzyMatch(cmd.label, lowerQuery),
        );
    }

    private fuzzyMatch(text: string, query: string): boolean {
        let queryIndex = 0;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();

        for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
            if (lowerText[i] === lowerQuery[queryIndex]) {
                queryIndex++;
            }
        }

        return queryIndex === lowerQuery.length;
    }
}

export const commandRegistry = new CommandRegistry();

/**
 * React hook to subscribe to command registry changes.
 * Re-renders the component whenever commands are added or removed.
 */
export function useCommands(): Command[] {
    const [commands, setCommands] = useState<Command[]>(() => commandRegistry.getAll());

    useEffect(() => {
        // Sync initial state (in case commands were registered before mount)
        setCommands(commandRegistry.getAll());

        // Subscribe to future changes
        const unsubscribe = commandRegistry.subscribe(() => {
            setCommands(commandRegistry.getAll());
        });

        return unsubscribe;
    }, []);

    return commands;
}

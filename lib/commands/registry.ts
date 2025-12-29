export interface Command {
    id: string;
    label: string;
    category: "File" | "Edit" | "View" | "Navigation" | "Selection";
    shortcut?: string;
    action: () => void;
}

class CommandRegistry {
    private commands: Map<string, Command> = new Map();

    register(command: Command): void {
        this.commands.set(command.id, command);
    }

    unregister(id: string): void {
        this.commands.delete(id);
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

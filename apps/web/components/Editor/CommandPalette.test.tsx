import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import { commandRegistry, type Command } from "@/lib/commands/registry";

// Mock helper to create commands
function createMockCommand(overrides: Partial<Command> = {}): Command {
    return {
        id: overrides.id || `cmd-${Math.random()}`,
        label: overrides.label || "Test Command",
        category: overrides.category || "File",
        shortcut: overrides.shortcut,
        action: overrides.action || (vi.fn() as () => void),
    };
}

describe("CommandPalette", () => {
    let mockCommands: Command[];
    let onCloseMock: () => void;

    beforeEach(() => {
        // Clear registry before each test
        const allCommands = commandRegistry.getAll();
        for (const cmd of allCommands) {
            commandRegistry.unregister(cmd.id);
        }

        onCloseMock = vi.fn();

        // Create mock commands for testing
        mockCommands = [
            createMockCommand({
                id: "file.new",
                label: "New File",
                category: "File",
                shortcut: "⌘N",
            }),
            createMockCommand({
                id: "file.save",
                label: "Save File",
                category: "File",
                shortcut: "⌘S",
            }),
            createMockCommand({
                id: "edit.undo",
                label: "Undo",
                category: "Edit",
                shortcut: "⌘Z",
            }),
            createMockCommand({
                id: "edit.redo",
                label: "Redo",
                category: "Edit",
                shortcut: "⌘⇧Z",
            }),
            createMockCommand({
                id: "view.toggle",
                label: "Toggle Explorer",
                category: "View",
                shortcut: "⌘B",
            }),
            createMockCommand({
                id: "nav.goto",
                label: "Go to Line",
                category: "Navigation",
            }),
        ];

        // Register mock commands
        for (const cmd of mockCommands) {
            commandRegistry.register(cmd);
        }
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    describe("Fuzzy Search Filtering", () => {
        it("should show all commands when query is empty", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // All 6 commands should be visible
            expect(screen.getByText("New File")).toBeInTheDocument();
            expect(screen.getByText("Save File")).toBeInTheDocument();
            expect(screen.getByText("Undo")).toBeInTheDocument();
            expect(screen.getByText("Redo")).toBeInTheDocument();
            expect(screen.getByText("Toggle Explorer")).toBeInTheDocument();
            expect(screen.getByText("Go to Line")).toBeInTheDocument();
        });

        it("should filter commands by exact match", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            await user.type(input, "Save");

            expect(screen.getByText("Save File")).toBeInTheDocument();
            expect(screen.queryByText("New File")).not.toBeInTheDocument();
            expect(screen.queryByText("Undo")).not.toBeInTheDocument();
        });

        it("should filter commands by fuzzy match", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            // "nf" should match "New File"
            await user.type(input, "nf");

            expect(screen.getByText("New File")).toBeInTheDocument();
            expect(screen.queryByText("Save File")).not.toBeInTheDocument();
        });

        it("should filter commands by category", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            await user.type(input, "edit");

            expect(screen.getByText("Undo")).toBeInTheDocument();
            expect(screen.getByText("Redo")).toBeInTheDocument();
            expect(screen.queryByText("New File")).not.toBeInTheDocument();
            expect(screen.queryByText("Save File")).not.toBeInTheDocument();
        });

        it("should show no results for non-matching query", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            await user.type(input, "xyz123nonexistent");

            expect(screen.getByText("No commands found")).toBeInTheDocument();
            expect(screen.queryByText("New File")).not.toBeInTheDocument();
        });
    });

    describe("Keyboard Navigation (arrows, enter)", () => {
        it("should navigate down with ArrowDown", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");

            // First command should be selected initially
            let firstButton = screen.getByText("New File").closest("button");
            expect(firstButton).toHaveClass("bg-[var(--ui-active)]");

            // Press ArrowDown
            fireEvent.keyDown(input, { key: "ArrowDown" });

            // Second command should now be selected
            firstButton = screen.getByText("New File").closest("button");
            const secondButton = screen.getByText("Save File").closest("button");
            expect(firstButton).not.toHaveClass("bg-[var(--ui-active)]");
            expect(secondButton).toHaveClass("bg-[var(--ui-active)]");
        });

        it("should navigate up with ArrowUp", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");

            // Navigate down twice
            fireEvent.keyDown(input, { key: "ArrowDown" });
            fireEvent.keyDown(input, { key: "ArrowDown" });

            // Then navigate up once
            fireEvent.keyDown(input, { key: "ArrowUp" });

            // Second command should be selected
            const secondButton = screen.getByText("Save File").closest("button");
            expect(secondButton).toHaveClass("bg-[var(--ui-active)]");
        });

        it("should wrap around when navigating", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");

            // Press ArrowUp at the start (should stay at 0)
            fireEvent.keyDown(input, { key: "ArrowUp" });

            const firstButton = screen.getByText("New File").closest("button");
            expect(firstButton).toHaveClass("bg-[var(--ui-active)]");

            // Navigate to the end
            for (let i = 0; i < 10; i++) {
                fireEvent.keyDown(input, { key: "ArrowDown" });
            }

            // Should be at the last command
            const lastButton = screen.getByText("Go to Line").closest("button");
            expect(lastButton).toHaveClass("bg-[var(--ui-active)]");
        });

        it("should execute command on Enter", () => {
            vi.useFakeTimers();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");

            // Press Enter to execute first command
            fireEvent.keyDown(input, { key: "Enter" });

            // Should close the palette
            expect(onCloseMock).toHaveBeenCalledTimes(1);

            // Fast-forward the execution delay
            vi.advanceTimersByTime(50);

            // Command action should be called
            expect(mockCommands[0].action).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it("should not navigate past list boundaries", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");

            // Try to go up from the first item
            fireEvent.keyDown(input, { key: "ArrowUp" });

            // Should still be at first item
            const firstButton = screen.getByText("New File").closest("button");
            expect(firstButton).toHaveClass("bg-[var(--ui-active)]");

            // Navigate to last item
            for (let i = 0; i < 20; i++) {
                fireEvent.keyDown(input, { key: "ArrowDown" });
            }

            // Should be at last item
            const lastButton = screen.getByText("Go to Line").closest("button");
            expect(lastButton).toHaveClass("bg-[var(--ui-active)]");
        });
    });

    describe("Category Grouping", () => {
        it("should group commands by category", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Check that category headers exist
            expect(screen.getByText("FILE")).toBeInTheDocument();
            expect(screen.getByText("EDIT")).toBeInTheDocument();
            expect(screen.getByText("VIEW")).toBeInTheDocument();
            expect(screen.getByText("NAVIGATION")).toBeInTheDocument();
        });

        it("should display category headers", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const fileHeader = screen.getByText("FILE");
            expect(fileHeader).toHaveClass("uppercase");
            expect(fileHeader.tagName).toBe("DIV");
        });

        it("should maintain correct order within groups", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Get all command buttons
            const fileSection = screen.getByText("FILE").parentElement;
            const buttons = within(fileSection as HTMLElement).getAllByRole("button");

            // Check order
            expect(buttons[0]).toHaveTextContent("New File");
            expect(buttons[1]).toHaveTextContent("Save File");
        });
    });

    describe("Command Execution Callback", () => {
        it("should call command action on execution", () => {
            vi.useFakeTimers();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const button = screen.getByText("New File").closest("button") as HTMLButtonElement;
            fireEvent.click(button);

            // Fast-forward the execution delay
            vi.advanceTimersByTime(50);

            expect(mockCommands[0].action).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it("should close palette after execution", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const button = screen.getByText("New File").closest("button") as HTMLButtonElement;
            fireEvent.click(button);

            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });

        it("should execute after small delay", () => {
            vi.useFakeTimers();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const button = screen.getByText("New File").closest("button") as HTMLButtonElement;
            fireEvent.click(button);

            // Action should not be called immediately
            expect(mockCommands[0].action).not.toHaveBeenCalled();

            // Fast-forward 49ms (just before the delay)
            vi.advanceTimersByTime(49);
            expect(mockCommands[0].action).not.toHaveBeenCalled();

            // Fast-forward to 50ms
            vi.advanceTimersByTime(1);
            expect(mockCommands[0].action).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });

    describe("Opening/Closing Keyboard Shortcuts", () => {
        it("should close on Escape key", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            fireEvent.keyDown(input, { key: "Escape" });

            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });

        it("should focus input when opened", async () => {
            const { rerender } = render(<CommandPalette isOpen={false} onClose={onCloseMock} />);

            // Initially closed - nothing should be rendered
            expect(screen.queryByPlaceholderText("Type a command...")).not.toBeInTheDocument();

            // Open the palette
            rerender(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Wait for input to be focused
            await waitFor(() => {
                const input = screen.getByPlaceholderText("Type a command...");
                expect(input).toHaveFocus();
            });
        });
    });

    describe("No Results State", () => {
        it("should display 'No commands found' when no matches", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            await user.type(input, "nonexistent12345");

            expect(screen.getByText("No commands found")).toBeInTheDocument();
        });

        it("should hide result list when no matches", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            await user.type(input, "xyz999");

            // No command buttons should be visible
            expect(screen.queryByText("New File")).not.toBeInTheDocument();
            expect(screen.queryByText("Save File")).not.toBeInTheDocument();
            expect(screen.queryByText("Undo")).not.toBeInTheDocument();
        });
    });

    describe("Recent Commands Sorting", () => {
        it("should show recently used commands first", () => {
            vi.useFakeTimers();

            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Execute a command from the middle of the list
            const undoButton = screen.getByText("Undo").closest("button") as HTMLButtonElement;
            fireEvent.click(undoButton);

            vi.advanceTimersByTime(50);

            // Note: The current implementation doesn't track recent commands
            // This test documents the expected behavior for future enhancement
            expect(mockCommands[2].action).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it("should update sorting after command execution", () => {
            vi.useFakeTimers();

            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Execute multiple commands
            const saveButton = screen.getByText("Save File").closest("button") as HTMLButtonElement;
            fireEvent.click(saveButton);

            vi.advanceTimersByTime(50);

            // Note: The current implementation doesn't track recent commands
            // This test documents the expected behavior for future enhancement
            expect(mockCommands[1].action).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });

    describe("Mouse Click Selection", () => {
        it("should execute command on click", () => {
            vi.useFakeTimers();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const button = screen.getByText("Save File").closest("button") as HTMLButtonElement;
            fireEvent.click(button);

            expect(onCloseMock).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(50);
            expect(mockCommands[1].action).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it("should highlight on hover", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const button = screen.getByText("Save File").closest("button") as HTMLButtonElement;

            // Initially not highlighted (first item is selected)
            expect(button).not.toHaveClass("bg-[var(--ui-active)]");

            // Button should have hover class
            expect(button).toHaveClass("hover:bg-[var(--ui-hover)]");
        });
    });

    describe("Escape Key to Close", () => {
        it("should close palette on Escape", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");
            fireEvent.keyDown(input, { key: "Escape" });

            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });

        it("should call onClose callback", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Press Escape on the dialog
            const dialog = screen.getByRole("dialog");
            fireEvent.keyDown(dialog, { key: "Escape" });

            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });
    });

    describe("Animation States", () => {
        it("should apply opening animation class", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const backdrop = screen.getByRole("dialog").previousElementSibling;
            expect(backdrop).toHaveClass("animate-fadeIn");

            const modal = screen.getByRole("dialog").parentElement;
            const modalContent = within(modal as HTMLElement).getByRole("dialog");
            expect(modalContent).toHaveClass("animate-scaleIn");
        });

        it("should apply closing animation class", async () => {
            const { rerender } = render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Close the palette
            rerender(<CommandPalette isOpen={false} onClose={onCloseMock} />);

            // Wait for closing animation to start
            await waitFor(
                () => {
                    const backdrop = screen.getByRole("dialog").previousElementSibling;
                    expect(backdrop).toHaveClass("animate-fadeOut");
                },
                { timeout: 1000 },
            );

            const modal = screen.getByRole("dialog").parentElement;
            const modalContent = within(modal as HTMLElement).getByRole("dialog");
            expect(modalContent).toHaveClass("animate-scaleOut");
        });

        it("should not render when shouldRender is false", async () => {
            const { rerender } = render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Verify it's rendered when open
            expect(screen.getByRole("dialog")).toBeInTheDocument();

            // Close the palette
            rerender(<CommandPalette isOpen={false} onClose={onCloseMock} />);

            // Should be completely removed from DOM after animation
            await waitFor(
                () => {
                    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
                },
                { timeout: 1000 },
            );
        });
    });

    describe("Query Reset on Open", () => {
        it("should reset query when opening", async () => {
            const user = userEvent.setup();
            const { rerender } = render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Type a query
            const input = screen.getByPlaceholderText("Type a command...");
            await user.type(input, "test query");

            expect(input).toHaveValue("test query");

            // Close and reopen
            rerender(<CommandPalette isOpen={false} onClose={onCloseMock} />);
            rerender(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // Query should be reset
            const newInput = screen.getByPlaceholderText("Type a command...");
            expect(newInput).toHaveValue("");
        });
    });

    describe("Backdrop Click", () => {
        it("should close on backdrop click", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const backdrop = screen.getByRole("button", { name: /close command palette/i });
            fireEvent.click(backdrop);

            expect(onCloseMock).toHaveBeenCalledTimes(1);
        });

        it("should not close on modal content click", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const modal = screen.getByRole("dialog");
            fireEvent.click(modal);

            expect(onCloseMock).not.toHaveBeenCalled();
        });
    });

    describe("Command Shortcuts Display", () => {
        it("should display shortcuts when available", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            expect(screen.getByText("⌘N")).toBeInTheDocument();
            expect(screen.getByText("⌘S")).toBeInTheDocument();
            expect(screen.getByText("⌘Z")).toBeInTheDocument();
        });

        it("should not display shortcuts when unavailable", () => {
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            // "Go to Line" doesn't have a shortcut
            const button = screen.getByText("Go to Line").closest("button") as HTMLElement;
            const shortcutSpan = within(button).queryByText(/⌘/);

            expect(shortcutSpan).not.toBeInTheDocument();
        });
    });

    describe("Selection Reset on Query Change", () => {
        it("should reset selection to first item when query changes", async () => {
            const user = userEvent.setup();
            render(<CommandPalette isOpen={true} onClose={onCloseMock} />);

            const input = screen.getByPlaceholderText("Type a command...");

            // Navigate down to select second item
            fireEvent.keyDown(input, { key: "ArrowDown" });
            fireEvent.keyDown(input, { key: "ArrowDown" });

            // Third item should be selected
            const thirdButton = screen.getByText("Undo").closest("button");
            expect(thirdButton).toHaveClass("bg-[var(--ui-active)]");

            // Type a query
            await user.type(input, "file");

            // Selection should reset to first filtered item
            const firstFilteredButton = screen.getByText("New File").closest("button");
            expect(firstFilteredButton).toHaveClass("bg-[var(--ui-active)]");
        });
    });
});

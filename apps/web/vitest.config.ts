import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        // Environment
        environment: "happy-dom",

        // Setup files
        setupFiles: ["./test/setup.ts"],

        // Coverage configuration
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            exclude: [
                "node_modules/",
                "test/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/types/**",
                "app/**", // Next.js pages
                ".next/**",
            ],
            thresholds: {
                // Global thresholds
                global: {
                    branches: 70,
                    functions: 70,
                    lines: 70,
                    statements: 70,
                },
                // Module-specific thresholds
                "lib/tokenizer/**": {
                    branches: 90,
                    functions: 90,
                    lines: 90,
                    statements: 90,
                },
                "lib/editor/pieceTable.ts": {
                    branches: 90,
                    functions: 90,
                    lines: 90,
                    statements: 90,
                },
                "hooks/useEditorState.ts": {
                    branches: 90,
                    functions: 90,
                    lines: 90,
                    statements: 90,
                },
                "lib/storage/**": {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },

        // Test file patterns
        include: ["**/*.{test,spec}.{ts,tsx}"],

        // Globals for describe, it, expect
        globals: true,

        // Test timeout
        testTimeout: 10000,

        // Benchmarks
        benchmark: {
            include: ["**/*.bench.{ts,tsx}"],
        },
    },

    // Path aliases (match tsconfig.json)
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
});

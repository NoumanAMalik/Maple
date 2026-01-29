export const CODE_SAMPLES = {
    javascript: {
        simple: "const x = 1;",
        function: "function add(a, b) {\n  return a + b;\n}",
        template: `\`Hello ${"$"}{name}!\``,
        multilineComment: "/*\n * Block comment\n */",
        complex: `import React from 'react';

export const Component = ({ name }) => {
  const greeting = \`Hello \${name}!\`;
  return <div>{greeting}</div>;
};`.trim(),
    },

    edgeCases: {
        empty: "",
        singleChar: "x",
        longLine: "x".repeat(10000),
        manyLines: Array(1000).fill("line").join("\n"),
        unicode: "Hello 世界 🌍",
        tabs: "a\tb\tc",
    },
};

export const LARGE_FILE_SAMPLES = {
    small: Array(100).fill("const x = 1;").join("\n"),
    medium: Array(1000).fill("const x = 1;").join("\n"),
    large: Array(10000).fill("const x = 1;").join("\n"),
};

import fs from "node:fs";
import path from "node:path";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node convert-vitest-bench.mjs <input.json> <output.json>");
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");
const data = JSON.parse(raw);

if (!data || !Array.isArray(data.files)) {
  console.error("Unexpected Vitest benchmark JSON format: missing files array.");
  process.exit(1);
}

const results = [];

for (const file of data.files) {
  const groups = Array.isArray(file.groups) ? file.groups : [];
  for (const group of groups) {
    const fullName = typeof group.fullName === "string" ? group.fullName : "(unknown group)";
    const benchmarks = Array.isArray(group.benchmarks) ? group.benchmarks : [];
    for (const bench of benchmarks) {
      if (!bench || typeof bench.mean !== "number") {
        continue;
      }

      const benchName = typeof bench.name === "string" ? bench.name : "(unknown benchmark)";
      const name = `${fullName} / ${benchName}`;
      const entry = {
        name,
        unit: "ms",
        value: bench.mean,
      };

      if (typeof bench.rme === "number") {
        entry.range = `+/-${bench.rme.toFixed(2)}%`;
      }

      if (typeof bench.hz === "number") {
        entry.extra = `hz=${bench.hz.toFixed(2)}`;
      }

      results.push(entry);
    }
  }
}

if (results.length === 0) {
  console.error("No benchmarks found in Vitest output.");
  process.exit(1);
}

const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`);

console.log(`Wrote ${results.length} benchmark entries to ${outputPath}`);

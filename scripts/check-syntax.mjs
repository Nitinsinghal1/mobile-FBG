import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "tests", "scripts", "."];
const skip = new Set(["server.mjs"]);
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (!["vendor", ".git", ".publish", "node_modules"].includes(entry)) walk(full);
      continue;
    }
    if ((entry.endsWith(".js") || entry.endsWith(".mjs")) && !skip.has(entry)) files.push(full);
  }
}

for (const root of roots) {
  try {
    walk(root);
  } catch {
    // Optional root.
  }
}

let failed = false;
for (const file of [...new Set(files)]) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log(`Syntax OK (${new Set(files).size} files)`);

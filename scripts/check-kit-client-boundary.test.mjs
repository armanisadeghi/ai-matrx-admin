// Guard: kit entries that render handler-bearing elements must be client modules, or a Server
// Component rendering them 500s the route ("Event handlers cannot be passed to Client Component props").
// The published entry itself must start with "use client" (kit >= 0.44.3).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const entries = ["@ai-matrx/kit/outbound-react"];

for (const spec of entries) {
  test(`${spec} is a client boundary`, () => {
    const published = fs.readFileSync(require.resolve(spec), "utf8");
    assert.match(published, /^\s*["']use client["']/, `${spec} must ship with "use client"`);
  });
}

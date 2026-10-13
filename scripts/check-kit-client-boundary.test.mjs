// Guard: kit entries that render handler-bearing elements must be client modules, or a Server
// Component rendering them 500s the route ("Event handlers cannot be passed to Client Component props").
// Passes when the published entry has "use client" OR next.config.js aliases it to a "use client" wrapper.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "package.json"));
const entries = [["@ai-matrx/kit/outbound-react", "lib/compat/kit-outbound-react.ts"]];
const cfg = fs.readFileSync(path.join(root, "next.config.js"), "utf8");

for (const [spec, wrapper] of entries) {
  test(`${spec} is a client boundary`, () => {
    const published = fs.readFileSync(require.resolve(spec.replace("@ai-matrx/kit/", "@ai-matrx/kit/").replace(/$/, "")), "utf8");
    if (/^\s*["']use client["']/.test(published)) return;
    const w = fs.readFileSync(path.join(root, wrapper), "utf8");
    assert.match(w, /^\s*["']use client["']/, `${wrapper} must start with "use client"`);
    const occurrences = cfg.split(`"${spec}"`).length - 1;
    assert.ok(occurrences >= 2, `${spec} must be aliased in both turbopack and webpack blocks`);
  });
}

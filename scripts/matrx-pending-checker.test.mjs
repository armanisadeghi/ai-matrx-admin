// node --test scripts/matrx-pending-checker.test.mjs
// The ONE pending-import checker (scripts/matrx-pending-checker.mjs) in a temp repo with a fake
// installed @ai-matrx package: it must list exactly the file importing an unshipped name, hand
// next.config.js a rule for exactly that path, ask the running server to restart once when that
// server has no rescue for it, and drop the file once the import is fixed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

import { isCandidate, runDaemon, scanAll } from "./matrx-pending-checker.mjs";

const require = createRequire(import.meta.url);
const state = require("./lib/matrx-pending-rescue-state.cjs");

const PLANT = "app/(lab)/lab/x/page.lab.tsx";
const CLEAN = "features/ok/Ok.tsx";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "matrx-pending-checker-"));
  const write = (rel, body) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  };
  write("node_modules/@ai-matrx/chat/package.json", JSON.stringify({ name: "@ai-matrx/chat", version: "1.0.0", type: "module", exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } } }));
  write("node_modules/@ai-matrx/chat/dist/index.js", "export const Shipped = 1;\n");
  write("node_modules/@ai-matrx/chat/dist/index.d.ts", "export declare const Shipped: number;\n");
  write("node_modules/.modules.yaml", "x\n");
  write(".gitignore", "node_modules/\n.matrx/\n");
  write(PLANT, `import { Shipped, NotShippedYet } from "@ai-matrx/chat";\nexport default () => [Shipped, NotShippedYet];\n`);
  write(CLEAN, `import { Shipped } from "@ai-matrx/chat";\nexport const ok = Shipped;\n`);
  execFileSync("git", ["init", "-q"], { cwd: root });
  return { root, write };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("candidates: app source yes; node_modules, scripts, .d.ts, dot-dirs no", () => {
  assert.equal(isCandidate(PLANT), true);
  assert.equal(isCandidate("features/a/b.ts"), true);
  for (const rel of ["node_modules/x/a.js", "scripts/a.mjs", "types/a.d.ts", ".next/a.js", "features/a/.next-x/b.js", "a.ts", "features/a.md"]) assert.equal(isCandidate(rel), false, rel);
});

test("scan lists exactly the file with the unshipped import", () => {
  const { root } = fixture();
  try {
    const files = scanAll(root);
    assert.deepEqual(Object.keys(files), [PLANT]);
    assert.match(files[PLANT][0], /"NotShippedYet" from "@ai-matrx\/chat": installed @ai-matrx\/chat@1\.0\.0 does not ship it/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rescue rules match exactly the listed paths (parentheses escaped), none when empty", () => {
  assert.deepEqual(state.rescueRules([], "/l.cjs"), {});
  const rules = state.rescueRules([PLANT], "/l.cjs");
  assert.deepEqual(Object.keys(rules).sort(), [...state.SOURCE_GLOBS].sort());
  const re = rules["*.tsx"].condition.all[1].path;
  assert.equal(re.test(PLANT), true);
  assert.equal(re.test("app/lab/lab/x/page.lab.tsx"), false);
  assert.equal(re.test(`${PLANT}.bak`), false);
  assert.equal(re.test(CLEAN), false);
});

test("daemon: writes the list, restarts an uncovered running server once, clears on fix", async () => {
  const { root, write } = fixture();
  const restarts = [];
  const paths = state.statePaths(root);
  // A running server (this test process) that loaded no rescue.
  state.writeJsonAtomic(paths.loaded, { files: [], pid: process.pid, at: new Date().toISOString() });
  const d = runDaemon(root, { restart: () => restarts.push(Date.now()), log: () => {}, rev: "test", installPollMs: 60_000 });
  try {
    assert.deepEqual(state.readPendingFiles(root), [PLANT]);
    await wait(2_000); // restart debounce is 1.5 s
    assert.equal(restarts.length, 1, "one restart for the uncovered server");
    // The restarted server loads the rescue: config's own loader writes loaded.json.
    const loaded = state.loadRescueForDevServer(root);
    assert.deepEqual(loaded.files, [PLANT]);
    assert.ok(loaded.rules["*.tsx"]);
    // Fix the import: the file leaves the list, and no further restart (removal never needs one).
    write(PLANT, `import { Shipped } from "@ai-matrx/chat";\nexport default () => Shipped;\n`);
    await wait(1_500);
    d.flushNow();
    assert.deepEqual(state.readPendingFiles(root), []);
    await wait(1_700);
    assert.equal(restarts.length, 1);
  } finally {
    d.stop();
    rmSync(root, { recursive: true, force: true });
  }
});

test("daemon: no server running → no restart", async () => {
  const { root } = fixture();
  const restarts = [];
  const d = runDaemon(root, { restart: () => restarts.push(1), log: () => {}, rev: "test", installPollMs: 60_000 });
  try {
    await wait(1_800);
    assert.equal(restarts.length, 0);
    assert.deepEqual(JSON.parse(readFileSync(state.statePaths(root).pending, "utf8")).files[PLANT].length, 1);
  } finally {
    d.stop();
    rmSync(root, { recursive: true, force: true });
  }
});

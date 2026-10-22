#!/usr/bin/env node
// GUARD: NO UNRESOLVED GIT CONFLICT MARKERS IN TRACKED SOURCE (2026-10-22).
// A conflict-marked AssessmentCreate.tsx reached origin/main in 4d1b83b210 and broke the build.
// A file trips the guard on ANY marker line in source: `<<<<<<< `, `>>>>>>> ` or a bare `=======`
// (the files judged here are code, where none of the three is ever legitimate). Paired-only
// matching missed half blocks (`=======` ... `>>>>>>> origin/main` with no opening line).
// Markdown/prose is not scanned (a `=======` there is a heading underline).
// Release paths run this report-only and loud (run-release-gates.sh); locally it exits 1.
// Usage: node scripts/check-conflict-markers-source.mjs [--self-test] [--root <dir>]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SOURCE = /\.(tsx?|jsx?|mjs|cjs|py|sh|json|css|scss|sql|ya?ml|toml|html|vue|svelte)$/i;
const SELF = /(^|\/)scripts\/check[-_]conflict[-_]markers[-_]?source\.(mjs|py)$/;

/** Pure: file text -> 1-based line numbers of every conflict-marker line (edges and bare `=======`). */
export function conflictBlocks(text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^(<<<<<<<|=======|>>>>>>>)( |$)/.test(lines[i])) out.push(i + 1);
  }
  return out;
}

export function scan(root) {
  const r = spawnSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.error("check-conflict-markers-source: git ls-files failed in " + root); process.exit(2); }
  const hits = [];
  for (const rel of r.stdout.toString("utf8").split("\0")) {
    if (!rel || !SOURCE.test(rel) || SELF.test(rel)) continue;
    let text; try { text = readFileSync(join(root, rel), "utf8"); } catch { continue; }
    if (!text.includes("<<<<<<<") && !text.includes("=======") && !text.includes(">>>>>>>")) continue;
    for (const ln of conflictBlocks(text)) hits.push(`${rel}:${ln}`);
  }
  return hits;
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "conflict-markers-"));
  const sh = (...a) => spawnSync("git", a, { cwd: dir });
  const put = (rel, body) => writeFileSync(join(dir, rel), body);
  try {
    sh("init", "-q");
    put("bad.tsx", "const a = 1;\n<<<<<<< HEAD\nconst b = 1;\n=======\nconst b = 2;\n>>>>>>> origin/main\n");
    put("bad3.ts", "<<<<<<< ours\nx\n||||||| base\ny\n=======\nz\n>>>>>>> theirs\n");
    put("half.tsx", "const a = 1;\n=======\nconst b = 2;\n>>>>>>> origin/main\n");
    put("ok-prose.md", "<<<<<<< HEAD\n=======\n>>>>>>> x\n");
    put("ok-comment.ts", "// ======= not a marker\nconst s = \"=======\";\n");
    put("clean.ts", "export const a = 1;\n");
    sh("add", ".");
    const hits = scan(dir).sort();
    const want = ["bad.tsx:2", "bad.tsx:4", "bad.tsx:6", "bad3.ts:1", "bad3.ts:5", "bad3.ts:7", "half.tsx:2", "half.tsx:4"];
    if (JSON.stringify(hits) !== JSON.stringify(want)) { console.error("self-test FAILED:", hits); process.exit(1); }
    put("bad.tsx", "const a = 1;\n"); put("bad3.ts", "x\n"); put("half.tsx", "const b = 2;\n");
    if (scan(dir).length) { console.error("self-test FAILED: resolved files must be clean"); process.exit(1); }
    console.log("check-conflict-markers-source self-test: ok (red on full blocks, diff3 and half blocks; green once resolved; ignores markdown and inline text)");
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const a = process.argv.slice(2);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (a.includes("--self-test")) selfTest();
  else {
    const root = resolve(a.includes("--root") ? a[a.indexOf("--root") + 1] : join(dirname(fileURLToPath(import.meta.url)), ".."));
    const hits = scan(root);
    if (hits.length) {
      console.error("UNRESOLVED GIT CONFLICT MARKERS in tracked source (this breaks the build):\n" + hits.map((h) => "  " + h).join("\n"));
      process.exit(1);
    }
    console.log("check-conflict-markers-source: clean");
  }
}

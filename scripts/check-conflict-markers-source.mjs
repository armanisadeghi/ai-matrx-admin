#!/usr/bin/env node
// GUARD: NO UNRESOLVED GIT CONFLICT MARKERS IN TRACKED SOURCE (2026-10-22).
// A conflict-marked AssessmentCreate.tsx reached origin/main in 4d1b83b210 and broke the build.
// A file trips the guard when it holds a paired block: a `<<<<<<< ` line, then a bare `=======` line,
// then a `>>>>>>> ` line (a diff3 `||||||| ` line between is allowed). A lone `=======` (markdown
// underline, ASCII rule) or a lone edge line is NOT a conflict and is ignored.
// Release paths run this report-only and loud (run-release-gates.sh); locally it exits 1.
// Usage: node scripts/check-conflict-markers-source.mjs [--self-test] [--root <dir>]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SOURCE = /\.(tsx?|jsx?|mjs|cjs|py|sh|json|css|scss|sql|ya?ml|toml|html|vue|svelte)$/i;
const SELF = /(^|\/)scripts\/check[-_]conflict[-_]markers[-_]?source\.(mjs|py)$/;

/** Pure: file text -> 1-based line numbers where a paired conflict block starts. */
export function conflictBlocks(text) {
  const out = [];
  let start = 0, mid = false;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("<<<<<<< ") || l === "<<<<<<<") { start = i + 1; mid = false; }
    else if (start && l === "=======") mid = true;
    else if (start && mid && (l.startsWith(">>>>>>> ") || l === ">>>>>>>")) { out.push(start); start = 0; mid = false; }
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
    if (!text.includes("<<<<<<<")) continue;
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
    put("ok-underline.ts", "// Title\n=======\nconst a = 1;\n");
    put("ok-lone-edge.ts", "<<<<<<< not closed\nconst a = 1;\n");
    put("ok-prose.md", "<<<<<<< HEAD\n=======\n>>>>>>> x\n");
    put("clean.ts", "export const a = 1;\n");
    sh("add", ".");
    const hits = scan(dir).sort();
    if (JSON.stringify(hits) !== JSON.stringify(["bad.tsx:2", "bad3.ts:1"])) { console.error("self-test FAILED:", hits); process.exit(1); }
    put("bad.tsx", "const a = 1;\n"); put("bad3.ts", "x\n");
    if (scan(dir).length) { console.error("self-test FAILED: resolved files must be clean"); process.exit(1); }
    console.log("check-conflict-markers-source self-test: ok (red on paired blocks incl. diff3; green once resolved; ignores underlines, lone edges, markdown)");
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

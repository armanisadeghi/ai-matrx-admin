#!/usr/bin/env node
// scripts/check-tree-indent.mjs — EVERY TREE INDENTS BY THE ONE GEOMETRY.
//
// Arman, 2026-10-07: "things in a tree must have proper indentation … I cannot imagine why
// we keep getting wrong." The reason: every tree typed its own step (`depth * 12`, `* 14`,
// `* 18`, `1.5rem`…), so no two trees lined up. The step lives in ONE place —
// components/official/topic-tree/geometry.tsx (`treeIndentPx`, `treeIndentStyle`,
// `TREE_INDENT_PX`). This fails any indent built from `depth`/`level` times a number literal.
//
// The baseline (scripts/tree-indent-baseline.json) only shrinks: a file not in it fails on its
// first finding, a file in it fails when its count grows, and a stale entry (count fell) fails
// until the baseline is lowered — so a fixed tree cannot quietly regress.
//
//   pnpm check:tree-indent              scan tracked .tsx (exit 1 on a finding)
//   pnpm check:tree-indent --self-test  prove a literal step is RED and the shared helper GREEN
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASELINE = "scripts/tree-indent-baseline.json";
const STEP = /\b(?:[a-zA-Z_$][\w$]*\.)?(?:depth|level)\s*\*\s*\d+(?:\.\d+)?\b/;
// A step hidden in a named constant or a default prop (`const INDENT_PX = 14`, `indent = 12,`).
const NAMED_STEP = /\b(?:const|let)\s+\w*indent\w*\s*=\s*(?:[1-9]\d*(?:\.\d+)?|0\.\d+)\s*;|\bindent\w*\s*=\s*(?:[1-9]\d*(?:\.\d+)?|0\.\d+)\s*,/i;
const INDENT_CONTEXT = /paddingLeft|marginLeft|paddingInlineStart|marginInlineStart|indent|width:|\bpl-|\bml-|\.repeat\(/i;

export function findings(file, text) {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    // Not a tree (a meter, a chart offset): say why on the line or the one above.
    if (/tree-indent-ok:\s*\S/.test(line) || /tree-indent-ok:\s*\S/.test(lines[i - 1] ?? "")) return;
    if (NAMED_STEP.test(line)) {
      out.push(`${file}:${i + 1} tree indent step in a local constant — import TREE_INDENT_PX / treeIndentPx from components/official/topic-tree/geometry.tsx`);
      return;
    }
    if (!STEP.test(line)) return;
    // The step and its use are often one line; look one line either side for the context.
    const window = [lines[i - 1] ?? "", line, lines[i + 1] ?? ""].join("\n");
    if (!INDENT_CONTEXT.test(window)) return;
    out.push(`${file}:${i + 1} hand-coded tree indent — use treeIndentPx(depth) / treeIndentStyle(depth) from components/official/topic-tree/geometry.tsx`);
  });
  return out;
}

function selfTest() {
  const red = [
    ...findings("a.tsx", `<div style={{ paddingLeft: 8 + depth * 12 }} />`),
    ...findings("a.tsx", "style={{ paddingLeft: `${row.depth * 18 + 8}px` }}"),
    ...findings("a.tsx", `const indent = depth * 14;`),
    ...findings("a.tsx", `const INDENT_PX = 14;`),
    ...findings("a.tsx", `function Tree({ nodes, indent = 12, depth = 0 }) {`),
  ];
  const green = [
    ...findings("a.tsx", `<div style={treeIndentStyle(depth)} />`),
    ...findings("a.tsx", `const pct = Math.round(level * 100);`),
    ...findings("a.tsx", `function Row({ indentPx = 0, label }) {`),
    ...findings("a.tsx", `// tree-indent-ok: chart axis offset, not a tree\nconst w = { width: depth * 20 };`),
  ];
  if (red.length !== 5 || green.length !== 0) {
    console.error(`self-test FAILED: literal steps=${red.length} (want 5), shared helper / non-indent=${green.length} (want 0)`);
    process.exit(1);
  }
  console.log("check:tree-indent self-test: a literal depth step is RED, the shared geometry GREEN.");
}

function scan() {
  const files = execFileSync("git", ["ls-files", "*.tsx"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter((f) => f && !/\.test\.tsx$/.test(f) && !f.startsWith("components/official/topic-tree/geometry"));
  const byFile = {};
  const lines = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    if (!/depth|level|indent/i.test(text)) continue;
    const found = findings(f, text);
    if (found.length) { byFile[f] = found.length; lines.push(...found); }
  }
  return { byFile, lines };
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const { byFile, lines } = scan();
  if (process.argv.includes("--write-baseline")) {
    writeFileSync(BASELINE, JSON.stringify(byFile, null, 2) + "\n");
    console.log(`check:tree-indent: baseline written (${Object.keys(byFile).length} files).`);
    process.exit(0);
  }
  let baseline = {};
  try { baseline = JSON.parse(readFileSync(BASELINE, "utf8")); } catch {}
  const errors = [];
  for (const [file, count] of Object.entries(byFile)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed) errors.push(...lines.filter((l) => l.startsWith(`${file}:`)));
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    if ((byFile[file] ?? 0) < allowed) {
      errors.push(`${BASELINE}: ${file} is down to ${byFile[file] ?? 0} (baseline ${allowed}) — lower or delete its entry; the baseline only shrinks.`);
    }
  }
  if (errors.length) {
    console.error(`check:tree-indent: ${errors.length} finding(s):\n${errors.join("\n")}`);
    process.exit(1);
  }
  const left = Object.values(baseline).reduce((a, b) => a + b, 0);
  console.log(`check:tree-indent: no new hand-coded tree indents (${left} baseline finding(s) left to clear).`);
}

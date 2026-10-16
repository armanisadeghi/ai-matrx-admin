// THE FRAGMENTATION LAW, enforced (code-splitting skill, rule 3).
//
// Every distinct runtime `import()` target is its own lazily loaded chunk group, and the build pays
// for each one in memory and compile time on every release. Measured 2026-10-16: a generated map of
// 263 per-surface `import()`s cost +8.9 GB peak build memory (49.2 -> 40.3 GB) and ~540 server chunks;
// in 2026-10 an icon package's 2,118-entry per-icon map doubled the build. A set of things that load
// together gets ONE lazy module (or a few groups), never one import() per item.
//
// Fails when one source file has more than MAX_TARGETS distinct RUNTIME import() targets
// (`await import(…)`, `() => import(…)`, `import(…).then`). Type positions (`import("x").Type`,
// `typeof import("x")`) are not chunks and are not counted.
// Usage: node scripts/check-import-fanout.mjs [--self-test]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const MAX_TARGETS = 20;
// Sanctioned: windows/overlays open one at a time on user action (lazyOverlay), so per-item chunks
// are the point there. Adding a file here needs the same reason, written beside it.
export const SANCTIONED = new Map([
  ["features/overlays/OverlayController.tsx", "lazyOverlay: each window opens alone on user action"],
]);

const RUNTIME = /(?:\bawait\s+import|=>\s*import|\(\s*import)\(\s*(["'`])([^"'`]+)\1\s*\)|\bimport\(\s*(["'`])([^"'`]+)\3\s*\)\s*\.then\b/g;

export function runtimeTargets(text) {
  const out = new Set();
  for (const m of text.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, "$1").matchAll(RUNTIME)) out.add(m[2] ?? m[4]);
  return out;
}

export function findOffenders(files, read = (f) => readFileSync(f, "utf8")) {
  const offenders = [];
  for (const f of files) {
    if (SANCTIONED.has(f)) continue;
    const n = runtimeTargets(read(f)).size;
    if (n > MAX_TARGETS) offenders.push({ file: f, targets: n });
  }
  return offenders.sort((a, b) => b.targets - a.targets);
}

function selfTest() {
  const many = Array.from({ length: MAX_TARGETS + 1 }, (_, i) => `const L${i} = () => import("./m${i}");`).join("\n");
  const typesOnly = Array.from({ length: 50 }, (_, i) => `let x${i}: import("../types").T${i};`).join("\n");
  const shared = Array.from({ length: 50 }, (_, i) => `const L${i} = () => import("./one").then((m) => m.x${i});`).join("\n");
  const red = findOffenders(["a.ts"], () => many).length === 1;
  const greenTypes = findOffenders(["b.ts"], () => typesOnly).length === 0;
  const greenShared = findOffenders(["c.ts"], () => shared).length === 0;
  console.log(`self-test RED (${MAX_TARGETS + 1} per-item import() targets): ${red ? "caught" : "MISSED"}`);
  console.log(`self-test GREEN (50 type-position imports): ${greenTypes ? "ok" : "FALSE ALARM"}`);
  console.log(`self-test GREEN (50 calls into ONE module): ${greenShared ? "ok" : "FALSE ALARM"}`);
  process.exit(red && greenTypes && greenShared ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes("--self-test")) selfTest();
  const files = execFileSync("git", ["ls-files", "*.ts", "*.tsx", "*.mjs", "*.js"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter((f) => f && existsSync(f) && !/(^|\/)(__tests__|node_modules)\/|\.test\.|\.d\.ts$|^scripts\//.test(f));
  const offenders = findOffenders(files);
  if (offenders.length) {
    console.error(`[import-fanout] ${offenders.length} file(s) fan out more than ${MAX_TARGETS} lazy import() targets (one chunk group each):`);
    for (const o of offenders) console.error(`  ${o.targets}  ${o.file}`);
    console.error("  Fix: put the set in ONE lazily loaded module (or a few groups) — code-splitting skill, rule 3.");
    process.exitCode = 1;
  } else console.log(`[import-fanout] ${files.length} files; none fans out more than ${MAX_TARGETS} lazy import() targets.`);
}

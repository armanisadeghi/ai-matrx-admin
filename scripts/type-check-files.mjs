#!/usr/bin/env node
// scripts/type-check-files.mjs — the cloud-lane type check.
//
// WHY (2026-10-22): a cloud container has 15 GB of memory and the whole-repo
// `pnpm type-check` peaks above it — it was killed (exit 137) twice, with and
// without --singleThreaded. CI's type-check job (8 GB of extra swap) stays the
// whole-repo gate. In a container you check what you changed instead:
//
//   pnpm type-check:files <file|dir> [...]
//
// It type-checks the named files (tracked or new), every file that imports one
// of them — by "@/", any tsconfig path alias, or a relative path — so a changed
// export is checked at its callers, every module augmentation (leaving one out
// makes false errors), and everything those import, under the repo's real
// compiler options. It runs through scripts/tsc-capped.sh, the same queue and
// memory watchdog as `pnpm type-check`, and deletes its temp tsconfig after.
//
// Exit 1 only for errors in the named files or their importers ("yours").
// Errors elsewhere in the compiled graph are printed under "ELSEWHERE" and do
// not fail the run: main carries some, and a check that is always red teaches
// people to ignore it. Read them anyway — one can be yours if you changed a
// type that is re-exported.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: pnpm type-check:files <file|dir> [...]");
  process.exit(2);
}

const TS = /\.(ts|tsx|mts|cts)$/;
const git = (gitArgs) =>
  spawnSync("git", gitArgs, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stdout ?? "";

const named = new Set();
for (const a of args) {
  const abs = resolve(a);
  if (!existsSync(abs)) {
    console.error(`[type-check:files] not found: ${a}`);
    process.exit(2);
  }
  const rel = relative(root, abs);
  if (statSync(abs).isDirectory()) {
    // Tracked AND new files: a directory you just created is still yours.
    for (const f of git(["ls-files", "-co", "--exclude-standard", "--", rel]).split("\n")) if (TS.test(f)) named.add(f);
  } else if (TS.test(rel)) {
    named.add(rel);
  }
}
if (named.size === 0) {
  console.error("[type-check:files] no TypeScript files in what you named");
  process.exit(2);
}

// The module id a file is imported as: path without extension or /index.
const moduleId = (path) => path.replace(TS, "").replace(/\/index$/, "");
const namedIds = new Set([...named].map(moduleId));

// tsconfig path aliases ("@/*" → "./*", "@components/*" → "./components/*", …).
const aliases = Object.entries(
  JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8")).compilerOptions?.paths ?? {},
)
  .filter(([from]) => from.endsWith("/*"))
  .map(([from, to]) => [from.slice(0, -1), to.map((t) => t.replace(/^\.\//, "").replace(/\*$/, ""))])
  .sort((a, b) => b[0].length - a[0].length);

function resolveSpecifier(fromFile, spec) {
  if (spec.startsWith(".")) return [moduleId(relative(root, resolve(root, dirname(fromFile), spec)))];
  for (const [prefix, targets] of aliases) {
    if (spec.startsWith(prefix)) return targets.map((t) => moduleId(join(t, spec.slice(prefix.length))));
  }
  return [];
}

// Importers: files whose text names a changed module's last path segment,
// confirmed by resolving every import specifier in them.
const importers = new Set();
const segments = new Set([...namedIds].map((id) => id.split("/").pop()));
const SPEC = /(?:from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)["']([^"']+)["']/g;
for (const seg of segments) {
  const candidates = git([
    "grep", "-l", "--untracked", "-F", seg, "--", "*.ts", "*.tsx", "*.mts", "*.cts", ":(exclude)node_modules",
  ]).split("\n");
  for (const file of candidates) {
    if (!file || named.has(file) || importers.has(file)) continue;
    const text = readFileSync(join(root, file), "utf8");
    for (const m of text.matchAll(SPEC)) {
      if (resolveSpecifier(file, m[1]).some((id) => namedIds.has(id))) {
        importers.add(file);
        break;
      }
    }
  }
}

// Ambient files and every module augmentation (`declare module` / `declare
// global`, e.g. each overlay's OverlayRegistry entry): leaving one out makes
// false errors in the files that rely on it.
const ambient = ["global.d.ts", "cartesia.d.ts", "types/typecheck-env.d.ts"].filter((f) => existsSync(join(root, f)));
for (const f of git([
  "grep", "-l", "-E", "^[[:space:]]*declare (module [\"']|global[[:space:]{])",
  "--", "*.ts", "*.tsx", ":(exclude)_armani", ":(exclude)_dev",
]).split("\n")) {
  if (f && !ambient.includes(f)) ambient.push(f);
}

const files = [...new Set([...ambient, ...named, ...importers])];
const config = join(root, `tsconfig.focused.${process.pid}.tmp.json`);
writeFileSync(
  config,
  JSON.stringify({ extends: "./tsconfig.json", compilerOptions: { incremental: false }, files, include: [] }, null, 2),
);
console.log(`[type-check:files] ${named.size} named file(s) + ${importers.size} importer(s)`);
let run;
try {
  run = spawnSync("bash", ["scripts/tsc-capped.sh", "tsc", "--noEmit", "--pretty", "false", "-p", config], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
} finally {
  rmSync(config, { force: true });
}
const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
const yours = new Set([...named, ...importers]);
const mine = [];
const elsewhere = [];
const other = [];
for (const line of output.split("\n")) {
  const m = /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line);
  if (m) (yours.has(m[1]) ? mine : elsewhere).push(line);
  else if (line.trim()) other.push(line);
}
if (elsewhere.length) {
  console.log(`\nELSEWHERE (${elsewhere.length}; not in your files or their importers, so not failing the run):`);
  for (const line of elsewhere) console.log(`  ${line}`);
}
if (mine.length) {
  console.log(`\nYOURS (${mine.length}):`);
  for (const line of mine) console.log(line);
  process.exit(1);
}
if (run.status !== 0 && elsewhere.length === 0) {
  // The compiler failed without a per-file error (killed, bad config, …).
  console.error(other.join("\n") || `[type-check:files] compiler exited ${run.status}`);
  process.exit(run.status ?? 1);
}
console.log(`\n[type-check:files] clean in your ${yours.size} file(s)`);

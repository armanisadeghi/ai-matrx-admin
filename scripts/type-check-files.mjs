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
// It type-checks the named files, every file that imports one of them (so a
// changed export is checked at its callers), and everything they import, under
// the repo's real compiler options. It runs through scripts/tsc-capped.sh, the
// same queue and memory watchdog as `pnpm type-check`, and deletes its temp
// tsconfig afterwards. Exit code is the compiler's.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: pnpm type-check:files <file|dir> [...]");
  process.exit(2);
}

const TS = /\.(ts|tsx|mts|cts)$/;
const named = new Set();
for (const a of args) {
  const abs = resolve(a);
  if (!existsSync(abs)) {
    console.error(`[type-check:files] not found: ${a}`);
    process.exit(2);
  }
  const rel = relative(root, abs);
  if (statSync(abs).isDirectory()) {
    const out = execFileSync("git", ["ls-files", "--", rel], { cwd: root, encoding: "utf8" });
    for (const f of out.split("\n")) if (TS.test(f)) named.add(f);
  } else if (TS.test(rel)) {
    named.add(rel);
  }
}

// Importers: any tracked file that names one of the changed modules by its
// "@/..." alias (with or without a trailing /index).
const importers = new Set();
for (const f of named) {
  const mod = f.replace(TS, "").replace(/\/index$/, "");
  const r = spawnSync("git", ["grep", "-l", "-F", `@/${mod}"`, "--", "*.ts", "*.tsx"], { cwd: root, encoding: "utf8" });
  const r2 = spawnSync("git", ["grep", "-l", "-F", `@/${mod}'`, "--", "*.ts", "*.tsx"], { cwd: root, encoding: "utf8" });
  for (const line of `${r.stdout}\n${r2.stdout}`.split("\n")) if (line && !named.has(line)) importers.add(line);
}

// Ambient files and every module augmentation (`declare module` / `declare
// global`, e.g. each overlay's OverlayRegistry entry): leaving one out makes
// false errors in the files that rely on it.
const ambient = ["global.d.ts", "cartesia.d.ts", "types/typecheck-env.d.ts"].filter((f) => existsSync(join(root, f)));
const aug = spawnSync(
  "git",
  ["grep", "-l", "-E", "^[[:space:]]*declare (module [\"']|global[[:space:]{])", "--", "*.ts", "*.tsx", ":(exclude)_armani", ":(exclude)_dev"],
  { cwd: root, encoding: "utf8" },
);
for (const f of aug.stdout.split("\n")) if (f && !ambient.includes(f)) ambient.push(f);
const files = [...ambient, ...named, ...importers];
const config = join(root, `tsconfig.focused.${process.pid}.tmp.json`);
writeFileSync(
  config,
  JSON.stringify({ extends: "./tsconfig.json", compilerOptions: { incremental: false }, files, include: [] }, null, 2),
);
console.log(`[type-check:files] ${named.size} named file(s) + ${importers.size} importer(s)`);
try {
  const r = spawnSync("bash", ["scripts/tsc-capped.sh", "tsc", "--noEmit", "-p", config], { cwd: root, stdio: "inherit" });
  process.exitCode = r.status ?? 1;
} finally {
  rmSync(config, { force: true });
}
if (process.exitCode === 0) console.log("[type-check:files] clean");

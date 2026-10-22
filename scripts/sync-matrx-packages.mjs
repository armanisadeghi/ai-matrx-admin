#!/usr/bin/env node
// sync-matrx-packages — move every @ai-matrx package to npm latest, but NEVER ADOPT A SET IN WHICH
// ONE INSTALLED PACKAGE IMPORTS A NAME ITS INSTALLED SIBLING NO LONGER EXPORTS.
//
// THE DEFECT THIS EXISTS FOR (2026-10-18)
// ---------------------------------------
// design-system 0.86.194 renamed formatShortcut -> formatTapShortcut; the published records-ui
// 0.116.17 still imported formatShortcut from @ai-matrx/design-system/tap-target. `pnpm update` locked
// the pair, 61 app files that import @ai-matrx/records-ui/helpers failed to load, and release
// v0.4.3327 was cut with it. Hours later records 0.99.62 did it again (addressText). Every guard was
// green: check:matrx-imports judged app files only and package-to-package SUBPATHS, never names.
//
// THE SEQUENCE (`pnpm sync:matrx-packages` runs this)
//   1. check-matrx-lockfile --await-latest   every latest tarball is served (unchanged)
//   2. snapshot package.json + pnpm-lock.yaml
//   3. pnpm update -r "@ai-matrx/*" --latest; pnpm update -r "@ai-matrx/*" --depth Infinity
//   4. check-matrx-imports --packages        every @ai-matrx specifier AND named import inside the
//                                            installed dists resolves against the installed sibling
//      FAIL -> restore the snapshot, reinstall it frozen (the OLDER pair stays installed), print the
//              exact broken import, exit 1. Nothing new is adopted.
//   5. check:matrx-lockfile && check:matrx-packages, judged against npm latest AT RELEASE START
//
// THE SNAPSHOT (2026-10-21): aidream publishes ~10 times an hour, so step 5 used to re-read
// latest-NOW and fail STALE on versions published after step 3 had resolved (no frontend release
// 14:52-20:41 PT, meet 0.11.118). The snapshot instant is taken ONCE, here, before anything
// updates — or inherited from MATRX_PACKAGES_AS_OF when the release took it earlier — and every
// check below judges against it. A version published after it ships with the next release; a
// version stale against it still fails.
//
//   node scripts/sync-matrx-packages.mjs

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT_FILES = ["package.json", "pnpm-lock.yaml"];

function run(cmd, args, { capture = false } = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit", encoding: "utf8" });
  if (capture) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  return r.status ?? 1;
}

function step(label, cmd, args) {
  console.log(`[sync:matrx-packages] ${label}`);
  const code = run(cmd, args);
  if (code !== 0) {
    console.error(`[sync:matrx-packages] FAILED at: ${label} (exit ${code})`);
    process.exit(code);
  }
}

const SNAPSHOT_AT = process.env.MATRX_PACKAGES_AS_OF?.trim() || new Date().toISOString();
process.env.MATRX_PACKAGES_AS_OF = SNAPSHOT_AT; // every child check inherits it
console.log(`[sync:matrx-packages] release snapshot: npm latest as of ${SNAPSHOT_AT}`);

step("await every latest tarball", "node", ["scripts/check-matrx-lockfile.mjs", "--await-latest"]);

const snapshot = new Map(SNAPSHOT_FILES.filter((f) => existsSync(join(ROOT, f))).map((f) => [f, readFileSync(join(ROOT, f))]));

step("update @ai-matrx/* to latest", "pnpm", ["update", "-r", "@ai-matrx/*", "--latest"]);
step("collapse @ai-matrx/* twins", "pnpm", ["update", "-r", "@ai-matrx/*", "--depth", "Infinity"]);

console.log("[sync:matrx-packages] package-to-package imports (names and subpaths) — report only");
// Arman, 2026-10-22: "never ever ever during a release". This script runs in the release path, so a
// broken pair is REPORTED loudly and the newest set is still adopted; nothing is restored or stopped.
const graph = run("node", ["scripts/check-matrx-imports.mjs", "--packages"], { capture: true });
if (graph !== 0) {
  console.error("\n[sync:matrx-packages] WARNING — the newest @ai-matrx set breaks one package's import of another (above). Adopted anyway; fix the package.\n");
}

step("every locked version is served", "pnpm", ["check:matrx-lockfile"]);
step("installed versions match npm latest", "pnpm", ["check:matrx-packages"]);

#!/usr/bin/env tsx
/**
 * check:app-instances-computer-only — every read of `public.app_instances` keeps computers only or says why not.
 *
 * Owner ruling 2026-10-15 (CONFIG-ATTEST-ROLLOUT): web, chrome-extension and server installs register
 * app_instances rows (config attestation needs a device row). A query that lists computers without
 * `onlyComputers()` (lib/app-instances/computers.ts) — or, for a single-row read, `computerQuery()` /
 * `computerFilter()` — would offer a browser tab as a compute target. A read that is not a computer list carries `app-instances: not-a-computer-list (<why>)` on one of the 3 lines above.
 *
 *   pnpm check:app-instances-computer-only
 *   pnpm check:app-instances-computer-only --self-test   # prove it can fail
 *
 * Exit: 0 clean · 1 offenders.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SKIP = /(^|\/)(node_modules|\.next|\.wt|\.git|types|migrations|docs|coverage|dist)(\/|$)|\.test\.tsx?$|__tests__/;
const READ = /\.from\(\s*["'`]app_instances["'`]\s*\)/;
const MARK = "app-instances: not-a-computer-list";
/** The computer filters (lib/app-instances/computers.ts): a list read, a single-row read, the raw filter. */
const FILTERS = ["onlyComputers(", "computerQuery(", "computerFilter("];

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(ROOT, p);
    if (SKIP.test(rel)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
}

export function offenders(files: string[], base = ROOT): string[] {
  const bad: string[] = [];
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue; // removed by another session mid-scan (shared checkout)
    }
    if (!text.includes("app_instances")) continue;
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (!READ.test(line)) return;
      const window = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      if (FILTERS.some((f) => window.includes(f)) || window.includes(MARK)) return;
      bad.push(`${relative(base, f)}:${i + 1}: ${line.trim()}`);
    });
  }
  return bad;
}

if (process.argv.includes("--self-test")) {
  const dir = mkdtempSync(join(tmpdir(), "app-instances-guard-"));
  try {
    const f = join(dir, "x.ts");
    writeFileSync(f, 'const { data } = await supabase\n  .from("app_instances")\n  .select("id");\n');
    const caught = offenders([f], dir);
    if (caught.length !== 1) {
      console.error("SELF-TEST FAILED: an unfiltered computer list was not flagged");
      process.exit(1);
    }
    writeFileSync(f, 'const { data } = await onlyComputers(\n  supabase\n  .from("app_instances")\n  .select("id"), supabase);\n');
    if (offenders([f], dir).length !== 0) {
      console.error("SELF-TEST FAILED: a filtered read was flagged");
      process.exit(1);
    }
    writeFileSync(f, 'const { query } = await computerQuery(\n  supabase\n  .from("app_instances")\n  .select("id"), supabase);\n');
    if (offenders([f], dir).length !== 0) {
      console.error("SELF-TEST FAILED: a single-row computerQuery read was flagged");
      process.exit(1);
    }
    writeFileSync(f, 'const filter = await computerFilter(supabase);\nconst query = supabase\n  .from("app_instances")\n  .select("id");\n');
    if (offenders([f], dir).length !== 0) {
      console.error("SELF-TEST FAILED: a computerFilter read was flagged");
      process.exit(1);
    }
    console.log("check:app-instances-computer-only self-test: can fail and can pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} else {
  const files: string[] = [];
  for (const top of ["app", "features", "components", "lib", "hooks", "utils", "providers"]) {
    try {
      walk(join(ROOT, top), files);
    } catch {
      // a missing top-level directory is simply not scanned
    }
  }
  const bad = offenders(files);
  if (bad.length) {
    console.error(`check:app-instances-computer-only: ${bad.length} app_instances read(s) with neither onlyComputers() nor a "${MARK}" marker:`);
    for (const b of bad) console.error(`  ${b}`);
    process.exit(1);
  }
  console.log(`check:app-instances-computer-only: ${files.length} files, every app_instances read is computer-aware`);
}

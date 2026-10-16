#!/usr/bin/env node
/**
 * BLOCKING guard: an unknown source is never written down as a person's act.
 *
 * Arman's ruling (2026-10-15): the code must never claim one thing when the truth is another.
 * A writer that fills a missing `source` / `origin` with "manual" records "a person typed it"
 * for anything that forgot to say — an agent, an import, a rule. The fix made each of these a
 * REQUIRED input (the caller decides); this guard fails when a `?? "manual"` provenance default
 * returns to a writer under features/.
 *
 * `--self-test` proves the guard fails on the exact pre-fix lines and passes the fixed ones.
 * Contract: common-docs/systems/architecture/provenance/FEATURE.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOTS = ["features"];
const EXT = new Set([".ts", ".tsx"]);
const SKIP = new Set(["node_modules", ".next", "__tests__", "dist"]);

/** A provenance field filled with "manual" when the caller did not say. */
const FALSE_DEFAULT =
  /\b(source|origin|p_origin)\s*:\s*[\w.?]+\s*\?\?\s*["']manual["']/;

/** Read-side normalizers of server wire rows are out of scope: they never write. */
const ALLOW = new Set(["features/secrets/types.ts"]);

function scanText(rel, text) {
  if (ALLOW.has(rel)) return [];
  const out = [];
  text.split("\n").forEach((line, i) => {
    if (FALSE_DEFAULT.test(line)) out.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
  return out;
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (EXT.has(path.extname(e.name)) && !/\.test\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function selfTest() {
  const planted = [
    ["features/marketing/data/service.ts", '      source: input.source ?? "manual",'],
    ["features/crm/deals/service.ts", '    source: input.source ?? "manual",'],
    ["features/marketing/search-console/data-classification.ts", '    p_origin: options.origin ?? "manual",'],
  ];
  const fixed = [
    ["features/marketing/data/service.ts", "      source: input.source,"],
    ["features/marketing/search-console/data-classification.ts", "    p_origin: options.origin,"],
  ];
  let ok = true;
  for (const [rel, line] of planted) {
    if (scanText(rel, line).length === 0) {
      console.error(`SELF-TEST FAILED: planted false default not caught in ${rel}`);
      ok = false;
    }
  }
  for (const [rel, line] of fixed) {
    if (scanText(rel, line).length !== 0) {
      console.error(`SELF-TEST FAILED: fixed line flagged in ${rel}`);
      ok = false;
    }
  }
  console.log(ok ? "✅ self-test: every false default is caught" : "🚨 self-test failed");
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes("--self-test")) selfTest();

const findings = [];
for (const r of SCAN_ROOTS) {
  for (const f of walk(path.join(ROOT, r), [])) {
    const rel = path.relative(ROOT, f).split(path.sep).join("/");
    findings.push(...scanText(rel, fs.readFileSync(f, "utf8")));
  }
}
if (findings.length === 0) {
  console.log("✅ NO FALSE PROVENANCE DEFAULTS: a missing source is never recorded as 'manual'.");
  process.exit(0);
}
console.error("🚨 FALSE PROVENANCE DEFAULT — a missing source/origin is recorded as a person's act:");
for (const f of findings) console.error(`  ❌ ${f}`);
console.error("  Make the field required and let each caller say. Contract: common-docs/systems/architecture/provenance/FEATURE.md");
process.exit(1);

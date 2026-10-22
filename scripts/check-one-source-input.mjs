#!/usr/bin/env node
// GUARD: ONE SOURCE INPUT (unified-source-input G1, 2026-10-22).
// Every place a person feeds material to AI uses features/resource-manager/source-input/ (SourceInput)
// and the canonical tiles in features/resource-manager/resource-picker/. A screen that renders its own
// upload / paste / web page / YouTube tile row, keeps its own "add source" option list, or ships a file
// named *SourceInput* / *SourcePicker* / *SourceCapture* is a local copy.
// Shrink-only: scripts/one-source-input-baseline.json lists today's known copies. A copy NOT in the
// baseline fails; a baseline entry that no longer hits is reported (delete it) and never fails.
// Release paths run this report-only (run-release-gates.sh); locally it exits 1.
// Usage: node scripts/check-one-source-input.mjs [--self-test] [--root <dir>] [--baseline <file>] [--write-baseline]
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "..");
const BASELINE = join(HERE, "one-source-input-baseline.json");
const ROOTS = ["features", "components", "app", "lib"];

// The canonical homes, and hosts of unrelated "source" pickers (file-storage location windows).
const CANONICAL = /(^|\/)features\/resource-manager\/(source-input|resource-picker)\//;
const SKIP = /(^|\/)(node_modules|__tests__|\(dev\)|generated|\.next)(\/|$)|\.(test|spec|stories|d)\.tsx?$|(^|\/)features\/overlays\/|(^|\/)features\/window-panels\//;

const NAME = /Source(Input|Picker|Capture)/;
const OPTIONS_CONST = /^\s*(?:export\s+)?const\s+[A-Z_]*(?:ADD_)?SOURCE_(?:OPTIONS|TILES|CHOICES|DOORS)\b/m;
const DOOR_FAMILIES = [
  ["upload", /["'`>]\s*Upload\b/],
  ["paste", /["'`>]\s*Paste\b/],
  ["web", /["'`>]\s*(?:Web\s?page|Website|Web link)\b/i],
  ["youtube", /["'`>]\s*YouTube\b/],
];
const ASSOC_IMPORT = /import\s*\{[^}]*\bUniversalAssociationPicker\b[^}]*\}\s*from/;
// Known local copies the patterns above cannot see (a tile row built from icons, or a data file). They stay
// flagged for as long as the file exists, so the baseline entry is what lets them live, and deleting the file
// (or moving the screen onto <SourceInput>) is what shrinks the census.
const KNOWN_LOCAL = new Set([
  "features/transcript-studio/components/columns/AudioImportDialog.tsx",
  "app/(core)/transcripts/new/page.tsx",
  "features/marketing/seo/topical-map/start/startMapSources.ts",
  "features/marketing/seo/topical-map/start/StartMapScreen.tsx",
  "features/education/media/mindmap/components/MindMapNew.tsx",
]);
const EDU_CLASS = /(^|\/)features\/education\/classes\//;

function* walk(dir) {
  let names;
  try { names = readdirSync(dir); } catch { return; }
  for (const n of names) {
    const p = join(dir, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (n !== "node_modules" && n !== ".next") yield* walk(p); }
    else if (/\.tsx?$/.test(n)) yield p;
  }
}

/** Rules a file trips. Pure: (relative path, source) -> string[] */
export function findings(rel, src) {
  if (CANONICAL.test(rel) || SKIP.test(rel)) return [];
  const out = [];
  if (NAME.test(rel.split("/").pop())) out.push("named-source-input-file");
  if (OPTIONS_CONST.test(src)) out.push("local-source-options-list");
  const fams = DOOR_FAMILIES.filter(([, re]) => re.test(src)).map(([n]) => n);
  if (fams.length >= 3) out.push("hand-rolled-door-row");
  if (KNOWN_LOCAL.has(rel)) out.push("known-local-copy");
  if (EDU_CLASS.test(rel) && ASSOC_IMPORT.test(src)) out.push("local-association-picker-for-sources");
  return out;
}

export function scan(root) {
  const hits = {};
  for (const r of ROOTS) {
    for (const f of walk(join(root, r))) {
      const rel = relative(root, f).split("\\").join("/");
      const rules = findings(rel, readFileSync(f, "utf8"));
      if (rules.length) hits[rel] = rules;
    }
  }
  return hits;
}

export function compare(hits, baseline) {
  const grown = [], stale = [];
  for (const [file, rules] of Object.entries(hits)) {
    const allowed = baseline[file];
    if (!allowed) { grown.push(`${file}  [${rules.join(", ")}]`); continue; }
    const extra = rules.filter((r) => !allowed.includes(r));
    if (extra.length) grown.push(`${file}  new rule(s): ${extra.join(", ")}`);
  }
  for (const file of Object.keys(baseline)) if (!hits[file]) stale.push(file);
  return { grown, stale };
}

function readBaseline(p) {
  try { return JSON.parse(readFileSync(p, "utf8")).copies ?? {}; } catch { return {}; }
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "one-source-input-"));
  const put = (rel, body) => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
  try {
    put("features/foo/Tiles.tsx", `export const A = () => (<div><b>Upload</b><b>Paste</b><b>Website</b><b>YouTube</b></div>);`);
    put("features/foo/MySourceInput.tsx", `export const B = 1;`);
    put("features/foo/constants.ts", `export const SOURCE_OPTIONS = [];`);
    put("features/resource-manager/source-input/Ok.tsx", `<b>Upload</b><b>Paste</b><b>Website</b><b>YouTube</b>`);
    put("features/foo/Fine.tsx", `export const C = () => <b>Upload</b>;`);
    const hits = scan(dir);
    const keys = Object.keys(hits).sort();
    const expect = ["features/foo/MySourceInput.tsx", "features/foo/Tiles.tsx", "features/foo/constants.ts"];
    if (JSON.stringify(keys) !== JSON.stringify(expect)) { console.error("self-test FAILED: detection", keys); process.exit(1); }
    const { grown } = compare(hits, { "features/foo/Tiles.tsx": ["hand-rolled-door-row"] });
    if (grown.length !== 2) { console.error("self-test FAILED: baseline compare", grown); process.exit(1); }
    if (compare(hits, Object.fromEntries(Object.entries(hits))).grown.length) { console.error("self-test FAILED: full baseline should pass"); process.exit(1); }
    console.log("check-one-source-input self-test: ok (detects 3 copy shapes, ignores canonical folder, baseline gates growth)");
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function main() {
  const a = process.argv.slice(2);
  if (a.includes("--self-test")) return selfTest();
  const arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const root = resolve(arg("--root", DEFAULT_ROOT));
  const basePath = resolve(arg("--baseline", BASELINE));
  const hits = scan(root);
  if (a.includes("--write-baseline")) {
    const sorted = Object.fromEntries(Object.keys(hits).sort().map((k) => [k, hits[k]]));
    writeFileSync(basePath, JSON.stringify({ note: "Shrink-only census of local source-input copies. Delete entries as screens move onto features/resource-manager/source-input. Never add.", copies: sorted }, null, 2) + "\n");
    console.log(`wrote ${Object.keys(sorted).length} entries to ${relative(process.cwd(), basePath)}`);
    return;
  }
  const { grown, stale } = compare(hits, readBaseline(basePath));
  for (const s of stale) console.log(`shrunk: ${s} no longer a local copy; delete it from scripts/one-source-input-baseline.json`);
  if (grown.length) {
    for (const g of grown) console.error(`${g}\n   renders its own source input. Use <SourceInput> from features/resource-manager/source-input (add options to the canonical tiles, never a local list).`);
    console.error(`\n${grown.length} new local source-input copy(ies). The census may only shrink.`);
    process.exit(1);
  }
  console.log(`check-one-source-input: clean (${Object.keys(hits).length} grandfathered, ${stale.length} shrunk)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

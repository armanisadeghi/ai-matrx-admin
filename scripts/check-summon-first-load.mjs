#!/usr/bin/env node
// check-summon-first-load — first-load JS that @ai-matrx/summon and the app's overlay definitions
// put on representative routes, attributed per source file through the browser source maps.
//
// The overlay system must cost next to nothing until something opens: the root provider, the store
// slices and the light window-host belong in first load; WindowPanel, the light window, the link
// manager, persistence and the ~224 overlay definitions do not. 2026-10-17 measured 159 KB min of
// summon + 164 KB min of definitions on /notes, /dashboard and /pricing (three static imports).
//
// Needs a production build WITH browser source maps (Turbopack emits none otherwise):
//   bash scripts/build-lab/run.sh <label> --maps --keep
//   node scripts/check-summon-first-load.mjs --next ~/.cache/matrx-build-lab/wt-<label>/.next
// Budgets: scripts/summon-first-load-budget.json (minified bytes per route). `--update` lowers a
// budget to the measured value and refuses to raise one (ratchet only down).
// Exit: 0 within budget · 1 over budget or a forbidden source present · 2 no build / no source maps.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUDGET_PATH = join(ROOT, "scripts/summon-first-load-budget.json");

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const nextDir = resolve(flag("--next") ?? join(ROOT, ".next"));
const update = args.includes("--update");

function die(code, message) {
  process.stderr.write(`check-summon-first-load: ${message}\n`);
  process.exit(code);
}

/** Summon source (dist or src path in the map) → "summon/<file>"; overlay app code → "app:<dir>". */
export function groupOf(source) {
  const s = source.replace(/\\/g, "/");
  const pkg = s.match(/@ai-matrx\/summon\/(?:dist|src)\/(.+)$/);
  if (pkg) return `summon/${pkg[1]}`;
  const def = s.match(/features\/overlays\/(definitions|host)\//);
  if (def) return `app:features/overlays/${def[1]}`;
  return null;
}

function routeChunks(route) {
  const manifest = join(nextDir, "server/app", route, "page_client-reference-manifest.js");
  if (!existsSync(manifest)) die(2, `no client manifest for ${route} at ${manifest}`);
  globalThis.self = globalThis;
  globalThis.__RSC_MANIFEST = {};
  require(manifest);
  const entry = Object.values(globalThis.__RSC_MANIFEST)[0];
  const build = JSON.parse(readFileSync(join(nextDir, "build-manifest.json"), "utf8"));
  const chunks = new Set([...build.rootMainFiles, ...(build.polyfillFiles ?? [])]);
  for (const files of Object.values(entry.entryJSFiles)) for (const f of files) chunks.add(f);
  return [...chunks];
}

const perChunk = new Map();
function attribute(chunk) {
  if (perChunk.has(chunk)) return perChunk.get(chunk);
  const { SourceMapConsumer } = require("source-map-js");
  const js = readFileSync(join(nextDir, chunk), "utf8");
  const url = (js.match(/\/\/# sourceMappingURL=(\S+)\s*$/) ?? [])[1];
  const mapFile = url ? join(nextDir, dirname(chunk), url) : null;
  if (!mapFile || !existsSync(mapFile)) die(2, `${chunk} has no source map: rebuild with \`scripts/build-lab/run.sh <label> --maps\``);
  const lines = js.split("\n");
  const smc = new SourceMapConsumer(JSON.parse(readFileSync(mapFile, "utf8")));
  const maps = [];
  smc.eachMapping((m) => maps.push(m), null, SourceMapConsumer.GENERATED_ORDER);
  maps.sort((a, b) => a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn);
  const groups = new Map();
  for (let i = 0; i < maps.length; i += 1) {
    const m = maps[i];
    const g = m.source ? groupOf(m.source) : null;
    if (!g) continue;
    const line = lines[m.generatedLine - 1] ?? "";
    const n = maps[i + 1];
    const text = line.slice(m.generatedColumn, n && n.generatedLine === m.generatedLine ? n.generatedColumn : line.length);
    const e = groups.get(g) ?? { min: 0, text: [] };
    e.min += text.length;
    e.text.push(text);
    groups.set(g, e);
  }
  perChunk.set(chunk, groups);
  return groups;
}

export function measure(route) {
  const groups = new Map();
  for (const chunk of routeChunks(route)) {
    for (const [g, e] of attribute(chunk)) {
      const t = groups.get(g) ?? { min: 0, text: [] };
      t.min += e.min;
      t.text.push(...e.text);
      groups.set(g, t);
    }
  }
  const rows = [...groups].map(([g, e]) => ({ g, min: e.min, gz: gzipSync(e.text.join("")).length })).sort((a, b) => b.min - a.min);
  const total = rows.reduce((a, r) => a + r.min, 0);
  return { rows, total };
}

if (!existsSync(join(nextDir, "build-manifest.json"))) die(2, `no production build at ${nextDir}`);
const budget = JSON.parse(readFileSync(BUDGET_PATH, "utf8"));
const forbidden = budget.forbidden.map((p) => new RegExp(p));
let failed = false;
for (const [route, allowed] of Object.entries(budget.routes)) {
  const { rows, total } = measure(route);
  const bad = rows.filter((r) => forbidden.some((re) => re.test(r.g)));
  const gz = rows.reduce((a, r) => a + r.gz, 0);
  console.log(`${route}: summon + overlay app code ${total} B min (~${gz} B gz), budget ${allowed} B min`);
  for (const r of rows.slice(0, 12)) console.log(`   ${r.g.padEnd(52)} ${String(r.min).padStart(7)} min ${String(r.gz).padStart(6)} gz`);
  for (const r of bad) {
    failed = true;
    console.log(`   ✗ forbidden in first load: ${r.g} (${r.min} B min) — reach it through a lazy edge`);
  }
  if (total > allowed) {
    failed = true;
    console.log(`   ✗ over budget by ${total - allowed} B`);
  } else if (update && total < allowed) {
    budget.routes[route] = total;
  }
}
if (update) writeFileSync(BUDGET_PATH, `${JSON.stringify(budget, null, 2)}\n`);
process.exit(failed ? 1 : 0);

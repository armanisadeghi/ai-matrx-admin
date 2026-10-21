#!/usr/bin/env node
/**
 * check:no-client-brands — A BRAND IS A BRAND, NEVER A "CLIENT" (Arman, 2026-10-21;
 * common-docs/systems/marketing/VISION.md § Brands, never clients).
 *
 * Most businesses market their own one brand; an agency managing several is one case, not the
 * model. So no in-app text in the Marketing module says "client" / "clients": refuses, by
 * file:line, the word inside a string literal or JSX text in Marketing code. Comments are not
 * scanned. Software meanings ("client-side", "use client", an OAuth / API / HTTP client), module
 * paths, and a line marked `brand-word-ok: <reason>` (the brand's OWN customers, e.g. a persona
 * word) pass.
 *
 *   pnpm check:no-client-brands              # scan
 *   pnpm check:no-client-brands --self-test  # prove the detector fails on each bad shape
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const SCAN = [
  "features/marketing",
  "app/(core)/marketing",
  "app/(admin)/administration/marketing",
  "features/window-panels/windows/marketing",
  "features/shell/frame/flows/marketing.json",
];
const SCAN_PREFIX = ["features/surfaces/manifests/marketing"];
const SKIP = /(__fixtures__|node_modules|\.test\.|__tests__|fixtures\.ts$)/;

const WORD = /\bclients?\b|\bclient's\b/i;
/** Software meanings of "client" — never a brand. */
const SOFTWARE =
  /client[- ](side|only|safe|state|component|bundle|render|cache|code|abort|mirror|half|contract|write|read|refetch)|use client|(oauth|api|http|query|supabase|scraper|python|dataforseo|brave|direct)[- ]client|client[ _-]?(id|secret)|server\/client|client\/server|the client (app|reads|holds|keeps|never|cannot|can't|may not)|(stamped|computed|written|read) by the client|a client that (refused|reads|writes)|client (error|wrapper)|"client" \| "scraper"|source.{0,40}"client"/i;
/** A module specifier, e.g. "@/utils/supabase/client". */
const MODULE_PATH = /^(@\/|\.{1,2}\/|[\w@-]+\/)[\w./@-]*$/;

const STRING = /(["'`])((?:\\.|(?!\1).)*)\1/g;

function stripComment(line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return "";
  const i = line.search(/(^|[^:"'`])\/\/(?![^"'`]*["'`])/);
  return i >= 0 ? line.slice(0, i + 1) : line;
}

export function scan(file, src) {
  const out = [];
  const json = file.endsWith(".json");
  const lines = src.split("\n");
  lines.forEach((raw, i) => {
    if (lines.slice(Math.max(0, i - 2), i + 1).some((l) => l.includes("brand-word-ok:"))) return;
    const line = json ? raw : stripComment(raw);
    if (!WORD.test(line) || SOFTWARE.test(line)) return;
    const texts = [];
    for (const m of line.matchAll(STRING)) texts.push(m[2]);
    // JSX text: a line of words between tags, no code punctuation.
    const bare = line.replace(STRING, "").trim();
    if (!json && /\s\w/.test(bare) && !/[=;(){}]/.test(bare) && /^[<>\w\s.,!?'’—-]+$/.test(bare)) texts.push(bare);
    for (const t of texts) {
      if (WORD.test(t) && !SOFTWARE.test(t) && !MODULE_PATH.test(t)) {
        out.push({ file, line: i + 1, text: t.trim().slice(0, 120) });
        break;
      }
    }
  });
  return out;
}

function walk(path, acc) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const e of readdirSync(path)) walk(join(path, e), acc);
  } else if (/\.(tsx?|json)$/.test(path) && !SKIP.test(path)) acc.push(path);
}

function files() {
  const acc = [];
  for (const s of SCAN) walk(join(ROOT, s), acc);
  const man = join(ROOT, "features/surfaces/manifests");
  for (const e of readdirSync(man)) {
    const rel = `features/surfaces/manifests/${e}`;
    if (SCAN_PREFIX.some((p) => rel.startsWith(p))) walk(join(man, e), acc);
  }
  return acc;
}

function selfTest() {
  const bad = [
    ['a.tsx', 'const label = "Clients & Brands";'],
    ['b.tsx', '      description: "Every client you manage",'],
    ['c.tsx', "  title={`What we know about the client`}"],
    ['d.tsx', "          This client at a glance"],
    ['e.json', '  "why": "One client at a glance"'],
    ['f.ts', 'const ROLES = ["own", "client"] as const;'],
  ];
  const good = [
    ['g.tsx', '"use client";'],
    ['h.ts', '// the client reads this row directly'],
    ['i.ts', 'throw new Error("the API client failed");'],
    ['j.ts', 'const s = "computed client-side";'],
    ['k.ts', 'const client = await authed();'],
    ['l.tsx', '<Label>Brands</Label>'],
    ['m.ts', 'import { supabase } from "@/utils/supabase/client";'],
    ['n.ts', '  // brand-word-ok: the brand\'s own customers\n  "customer, client, follower",'],
  ];
  let fail = 0;
  for (const [f, src] of bad) if (scan(f, src).length !== 1) (fail += 1), console.error(`self-test: MISSED ${f}: ${src}`);
  for (const [f, src] of good) if (scan(f, src).length !== 0) (fail += 1), console.error(`self-test: FALSE HIT ${f}: ${src}`);
  if (fail) process.exit(1);
  console.log(`check:no-client-brands self-test: ${bad.length} bad shapes caught, ${good.length} software uses passed`);
}

if (process.argv.includes("--self-test")) selfTest();
else {
  const findings = files().flatMap((p) => scan(relative(ROOT, p), readFileSync(p, "utf8")));
  if (findings.length) {
    console.error(`check:no-client-brands: ${findings.length} place(s) call a brand a "client" (Arman 2026-10-21 — say "brand"):`);
    for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.text}`);
    process.exit(1);
  }
  console.log("check:no-client-brands: no brand is called a client in Marketing text");
}

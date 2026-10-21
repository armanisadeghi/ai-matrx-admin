#!/usr/bin/env node
/**
 * check:feature-pages — every feature has the same pages (policy: common-docs/policies/feature-pages.md).
 *
 * Kinds are declared ONCE in features/shell/constants/feature-pages.ts (read here as text).
 *   collection  front door + /all + /new + record
 *   workspace   front door + /all + record
 *   tool        front door only
 *
 * Findings (one line each: feature · rule · what is missing):
 *   rule 1  kind        top-level app/(core) feature with no declared kind; a required page that does not exist
 *   rule 2  list        front door neither redirects to /all nor is a ModuleLanding; /all not built on EntityListPage
 *   rule 3  create      /new missing; a create form in a Dialog/Sheet that is not the shared body in a window panel
 *   rule 5  surface     a page mounting no surface (manifest / surfaceName)
 *   rule 6  record-top  record page without RecordPageHeader
 *
 * Page trees are walked 3 import hops deep (static, no network). BASELINE (baseline.json) ONLY SHRINKS:
 * a new finding fails, and so does a baseline key that no longer occurs (run --shrink to drop it).
 *
 *   node scripts/feature-pages/check-feature-pages.mjs [--shrink] [--seed] [--self-test]
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const TAG = "[feature-pages]";
const BASELINE = join(HERE, "baseline.json");
const REGISTRY = "features/shell/constants/feature-pages.ts";
const DEPTH = 3;
const KINDS = new Set(["collection", "workspace", "tool"]);

const SURFACE = /surfaceName|SurfaceRuntimeProvider|_SURFACE_NAME|SURFACE_MANIFEST|surface-manifest|useSurface|SurfaceBoundary/;
const LIST = /\bEntityListPage\b/;
const RECORD_TOP = /\bRecordPageHeader\b/;
const LANDING = /\bModuleLanding\b|module-landing\/landings\//;
const WINDOW_PANEL = /WindowPanel|openWindowPanel|window-panels|useOpenWindow|PanelAction|open-[a-z-]+-panel/;
const DIALOG_IMPORT = /components\/ui\/(dialog|sheet|drawer)|@ai-matrx\/design-system[^"']*(dialog|sheet)|\b(DialogContent|SheetContent)\b/;
const CREATE_NAME = /(create|new)[A-Za-z]*(dialog|modal|sheet)|(dialog|modal|sheet)[A-Za-z]*(create|new)/i;

export const RULE_TEXT = {
  kind: "declare the feature's kind in features/shell/constants/feature-pages.ts, or add the missing page",
  list: "the front door redirects signed-in people to /all (or is a ModuleLanding) and /all is built on EntityListPage",
  create: "add /<feature>/new as a real page whose body is the ONE shared create component; a quick create is that same body in the window panel",
  surface: "mount the page's surface (manifest + surfaceName) so agents can see and work on it",
  "record-top": "the record page's top is RecordPageHeader",
};
export function remedyForKey(key) {
  return RULE_TEXT[String(key).split("|")[1]] ?? null;
}

// ---------- registry ----------
export function parseRegistry(text) {
  const out = [];
  const re = /\{\s*route:\s*"([^"]+)"\s*,\s*node:\s*"([^"]+)"\s*,\s*kind:\s*"([^"]+)"\s*\}/g;
  for (let m; (m = re.exec(text)); ) out.push({ route: m[1], node: m[2], kind: m[3] });
  return out;
}

// ---------- route table ----------
function walk(dir, visit) {
  let names;
  try { names = readdirSync(dir); } catch { return; }
  for (const n of names) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(dir, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, visit); else visit(p);
  }
}
/** route ("/agents/all", "/agents/[id]") -> page file (relative to root), route groups stripped. */
export function buildRoutes(root) {
  const routes = new Map();
  const appDir = join(root, "app");
  walk(appDir, (p) => {
    if (!/\/page\.(tsx|ts|jsx)$/.test(p)) return;
    const segs = relative(appDir, dirname(p)).split("/").filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
    const route = "/" + segs.join("/");
    if (!routes.has(route)) routes.set(route, relative(root, p));
  });
  return routes;
}

// ---------- import walk ----------
function makeReader(root) {
  const cache = new Map();
  const resolveCache = new Map();
  const read = (rel) => {
    if (!cache.has(rel)) { try { cache.set(rel, readFileSync(join(root, rel), "utf8")); } catch { cache.set(rel, ""); } }
    return cache.get(rel);
  };
  const resolveSpec = (fromRel, spec) => {
    const key = fromRel + "\0" + spec;
    if (resolveCache.has(key)) return resolveCache.get(key);
    let base = null;
    if (spec.startsWith("@/")) base = spec.slice(2);
    else if (spec.startsWith(".")) base = relative(root, resolve(root, dirname(fromRel), spec));
    let found = null;
    if (base) {
      for (const c of [base + ".tsx", base + ".ts", base + "/index.tsx", base + "/index.ts", base]) {
        const abs = join(root, c);
        if (existsSync(abs) && statSync(abs).isFile() && /\.(tsx?|jsx?)$/.test(c)) { found = c; break; }
      }
    }
    resolveCache.set(key, found);
    return found;
  };
  /** Every file reachable from `entry` within `depth` import hops (entry included). */
  const tree = (entry, depth = DEPTH) => {
    const seen = new Set([entry]);
    let frontier = [entry];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const f of frontier) {
        const src = read(f);
        for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
          const r = resolveSpec(f, m[1]);
          if (r && !seen.has(r)) { seen.add(r); next.push(r); }
        }
      }
      frontier = next;
    }
    return [...seen];
  };
  return { read, tree };
}

// ---------- the check ----------
export function check(root, entries) {
  const findings = [];
  const add = (feature, rule, detail) => findings.push({ key: `${feature}|${rule}|${detail}`, feature, rule, detail });
  const routes = buildRoutes(root);
  const { read, tree } = makeReader(root);
  const anyIn = (page, re) => tree(page).some((f) => re.test(read(f)));
  const dynamicChild = (route) => {
    const prefix = route === "/" ? "/" : route + "/";
    const hit = [...routes.keys()].filter((r) => r.startsWith(prefix) && /^\[[^/]+\]$/.test(r.slice(prefix.length)));
    return hit.length ? routes.get(hit[0]) : null;
  };

  // top-level app/(core) features with no declared kind
  const declared = entries.map((e) => e.route);
  const coreDir = join(root, "app", "(core)");
  let tops = [];
  try { tops = readdirSync(coreDir).filter((n) => !n.startsWith("_") && !n.startsWith("[") && existsSync(join(coreDir, n, "page.tsx"))); } catch { /* none */ }
  for (const t of tops) {
    const r = "/" + t;
    if (!declared.some((d) => d === r || d.startsWith(r + "/"))) add(r, "kind", "no kind declared");
  }

  for (const e of entries) {
    const f = e.route;
    if (!KINDS.has(e.kind)) { add(f, "kind", `unknown kind "${e.kind}"`); continue; }
    const front = routes.get(f);
    const all = routes.get(f + "/all");
    const neu = routes.get(f + "/new");
    const rec = dynamicChild(f);
    const needAll = e.kind !== "tool";
    const needNew = e.kind === "collection";
    const needRec = e.kind !== "tool";

    if (!front) add(f, "kind", "front door page missing");
    if (needAll && !all) add(f, "kind", "/all page missing");
    if (needNew && !neu) add(f, "create", "/new page missing");
    if (needRec && !rec) add(f, "kind", "record page missing");

    if (front) {
      if (e.kind === "tool") { /* the tool is the front door */ }
      else {
        const src = read(front);
        const redirectsToAll = /redirect\([^)]*\/all/.test(src) || tree(front, 1).some((x) => /redirect\([^)]*\/all/.test(read(x)));
        if (!redirectsToAll && !anyIn(front, LANDING)) add(f, "list", "front door neither redirects signed-in people to /all nor is a ModuleLanding");
      }
    }
    if (all && !anyIn(all, LIST)) add(f, "list", "/all is not built on EntityListPage");
    if (rec && !anyIn(rec, RECORD_TOP)) add(f, "record-top", "record page has no RecordPageHeader");

    for (const [label, page] of [["front door", front], ["/all", all], ["/new", neu], ["record", rec]]) {
      if (page && !anyIn(page, SURFACE)) add(f, "surface", `${label} mounts no surface (manifest/surfaceName)`);
    }

    // rule 3: a create form in a Dialog/Sheet that is not the shared body opened through a window panel
    const pages = [front, all, neu, rec].filter(Boolean);
    const files = new Set(pages.flatMap((p) => tree(p)));
    for (const file of files) {
      const base = file.split("/").pop().replace(/\.[tj]sx?$/, "");
      if (!CREATE_NAME.test(base)) continue;
      const src = read(file);
      if (DIALOG_IMPORT.test(src) && !WINDOW_PANEL.test(src)) add(f, "create", `create form in a Dialog/Sheet (${file}), not the shared create body in a window panel`);
    }
  }
  return findings.sort((a, b) => a.key.localeCompare(b.key));
}

// ---------- baseline + CLI ----------
function loadBaseline() {
  try { return new Set(JSON.parse(readFileSync(BASELINE, "utf8")).keys); } catch { return new Set(); }
}
function writeBaseline(keys) {
  writeFileSync(BASELINE, JSON.stringify({
    note: "Shrink-only: feature-page gaps today. Remove a key by fixing it (--shrink drops fixed ones); never add one — a new feature has none (scripts/feature-pages/check-feature-pages.mjs).",
    keys: [...keys].sort(),
  }, null, 2) + "\n");
}
function registryEntries(root) {
  return parseRegistry(readFileSync(join(root, REGISTRY), "utf8"));
}

function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), "feature-pages-"));
  const put = (rel, body) => { const p = join(tmp, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
  try {
    const front = `import { redirect } from "next/navigation";\nexport default async function P(){ redirect("/X/all"); }\nconst surfaceName = "s";`;
    const list = `import { EntityListPage } from "@/lib/entity-list";\nconst surfaceName = "s"; export default function L(){ return <EntityListPage/>; }`;
    const neu = `const surfaceName = "s"; export default function N(){ return null; }`;
    const rec = `import { RecordPageHeader } from "@/h";\nconst surfaceName = "s"; export default function R(){ return <RecordPageHeader/>; }`;
    const good = (f) => {
      put(`app/(core)/${f}/page.tsx`, front.replace("X", f));
      put(`app/(core)/${f}/all/page.tsx`, list);
      put(`app/(core)/${f}/new/page.tsx`, neu);
      put(`app/(core)/${f}/[id]/page.tsx`, rec);
    };
    good("good");
    good("nolist"); put("app/(core)/nolist/all/page.tsx", `const surfaceName="s"; export default function L(){ return null; }`);
    good("nonew"); rmSync(join(tmp, "app/(core)/nonew/new"), { recursive: true });
    good("nosurface"); put("app/(core)/nosurface/[id]/page.tsx", `import { RecordPageHeader } from "@/h"; export default function R(){ return <RecordPageHeader/>; }`);
    good("norecordtop"); put("app/(core)/norecordtop/[id]/page.tsx", `const surfaceName="s"; export default function R(){ return null; }`);
    good("nofrontdoor"); put("app/(core)/nofrontdoor/page.tsx", `const surfaceName="s"; export default function P(){ return null; }`);
    good("dialog"); put("app/(core)/dialog/new/page.tsx", `import { CreateDialog } from "./CreateThingDialog";\nconst surfaceName="s"; export default function N(){ return <CreateDialog/>; }`);
    put("app/(core)/dialog/new/CreateThingDialog.tsx", `import { DialogContent } from "@/components/ui/dialog";\nexport function CreateDialog(){ return <DialogContent/>; }`);
    put("app/(core)/undeclared/page.tsx", `export default function P(){ return null; }`);
    put("app/(core)/tooly/page.tsx", `const surfaceName="s"; export default function P(){ return null; }`);
    put("app/(core)/wkspc/page.tsx", `import { ModuleLanding } from "@/m";\nconst surfaceName="s"; export default function P(){ return <ModuleLanding/>; }`);
    put("app/(core)/wkspc/all/page.tsx", list);
    put("app/(core)/wkspc/[id]/page.tsx", rec);
    const entries = [
      ...["good", "nolist", "nonew", "nosurface", "norecordtop", "nofrontdoor", "dialog"].map((f) => ({ route: "/" + f, node: f, kind: "collection" })),
      { route: "/tooly", node: "tooly", kind: "tool" },
      { route: "/wkspc", node: "wkspc", kind: "workspace" },
      { route: "/badkind", node: "x", kind: "bogus" },
    ];
    const got = new Set(check(tmp, entries).map((x) => x.key));
    const expect = [
      "/nolist|list|/all is not built on EntityListPage",
      "/nonew|create|/new page missing",
      "/nosurface|surface|record mounts no surface (manifest/surfaceName)",
      "/norecordtop|record-top|record page has no RecordPageHeader",
      "/nofrontdoor|list|front door neither redirects signed-in people to /all nor is a ModuleLanding",
      "/dialog|create|create form in a Dialog/Sheet (app/(core)/dialog/new/CreateThingDialog.tsx), not the shared create body in a window panel",
      "/undeclared|kind|no kind declared",
      '/badkind|kind|unknown kind "bogus"',
    ];
    let bad = 0;
    for (const k of expect) if (!got.has(k)) { console.log(`${TAG} self-test FAIL: not caught: ${k}`); bad++; }
    const extra = [...got].filter((k) => !expect.includes(k));
    for (const k of extra) { console.log(`${TAG} self-test FAIL: false positive: ${k}`); bad++; }
    if (bad) process.exit(1);
    console.log(`${TAG} self-test OK: ${expect.length} planted breaks caught, 0 false positives (good, tool, workspace clean)`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();
  const findings = check(ROOT, registryEntries(ROOT));
  const keys = new Set(findings.map((f) => f.key));
  if (args.includes("--seed")) { writeBaseline(keys); console.log(`${TAG} baseline seeded: ${keys.size}`); return; }
  const base = loadBaseline();
  const stale = [...base].filter((k) => !keys.has(k));
  if (args.includes("--shrink")) { writeBaseline(new Set([...base].filter((k) => keys.has(k)))); console.log(`${TAG} baseline shrunk: dropped ${stale.length}, now ${base.size - stale.length}`); return; }
  const fresh = findings.filter((f) => !base.has(f.key));
  for (const f of findings) {
    const isNew = !base.has(f.key);
    console.log(`${isNew ? "NEW   " : "known "}${f.feature} · rule ${f.rule} · ${f.detail}`);
    emitItem({ key: f.key, status: isNew ? "new" : "known", ...(isNew ? {} : { basis: "debt" }), title: `${f.feature} · ${f.rule} · ${f.detail}`, rule: f.rule });
  }
  endItems();
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  console.log(`${TAG} ${findings.length} findings (${fresh.length} new, ${findings.length - fresh.length} baselined, ${stale.length} stale) by rule: ${JSON.stringify(byRule)}`);
  if (stale.length) for (const k of stale) console.log(`STALE ${k} — fixed; run: node scripts/feature-pages/check-feature-pages.mjs --shrink`);
  if (fresh.length || stale.length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

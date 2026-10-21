/**
 * ROUTE LINK GRAPH (owner, 2026-10-21): "the flow of the routes … the big picture and how
 * everything is going to relate to each other". Deterministic static scan -> route-flow.json.
 *
 *   pnpm route-flow            # writes features/shell/frame/route-flow.json
 *
 * Nodes = every page in app/ (same derivation as frame/__tests__/every-page-has-a-home.test.ts),
 * edges = links found in the page file or any file it imports (depth <= 4), plus the menu
 * (nav-data.ts, evaluated, not parsed). Blind spots are listed in frame/FEATURE.md.
 */
import fs from "node:fs";
import path from "node:path";
import {
  listMarketingBrandModeGroups,
} from "@/features/marketing/lib/brand-sections";
import {
  listMarketingSeoModeGroups,
  listMarketingWebsiteModeGroups,
} from "@/features/marketing/lib/route-sections";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import {
  adminNavItems,
  expandNavChildren,
  primaryNavItems,
  settingsItem,
  type ShellNavChild,
  type ShellNavItem,
} from "@/features/shell/constants/nav-data";

const ROOT = path.resolve(__dirname, "../..");
const APP = path.join(ROOT, "app");
const OUT = path.join(ROOT, "features/shell/frame/route-flow.json");
const MAX_DEPTH = 4;
const SCAN_DIRS = ["app", "features", "components", "lib"].map((d) => path.join(ROOT, d));
const SRC_EXTS = [".tsx", ".ts", ".jsx", ".js"];

type Confidence = "exact" | "pattern";
type EdgeKind = "link" | "push" | "menu" | "config" | "layout" | "sidebar";

interface RouteNode {
  route: string;
  file: string;
  otherFiles: string[];
  group: string;
  treeNode: string | null;
  howFound: string | null;
  menuLabels: string[];
  title: string | null;
  titleSource: string;
  inbound: number;
  outbound: number;
  reachableFromMenu: boolean;
}
interface Edge {
  from: string;
  to: string;
  kind: EdgeKind;
  confidence: Confidence;
  via: string;
}

// ---------- pages (same derivation as every-page-has-a-home.test.ts) ----------
function pageExts(): string[] {
  const cfg = fs.readFileSync(path.join(ROOT, "next.config.js"), "utf8");
  const m = /const pageExtensions =[\s\S]*?:\s*\[([\s\S]*?)\.\.\.\(INCLUDE_DEV/.exec(cfg);
  const exts = m ? [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]) : [];
  if (!exts.length) throw new Error("could not read pageExtensions from next.config.js");
  return exts;
}
const PAGE_FILE = new RegExp(`^page\\.(${pageExts().join("|")})$`);
const LAYOUT_FILE = /^layout\.(tsx|ts|jsx|js)$/;

function walk(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === "node_modules" || name.startsWith(".") || name.startsWith("_")) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, match, out);
    else if (match.test(name)) out.push(p);
  }
  return out;
}

function toRoute(file: string): { group: string; route: string } {
  const rel = path.relative(APP, path.dirname(file)).split(path.sep);
  const gm = /^\((.+)\)$/.exec(rel[0] ?? "");
  const group = gm ? gm[1] : "root";
  const segs = (gm ? rel.slice(1) : rel).filter((s) => s && !/^\(.+\)$/.test(s));
  return { group, route: "/" + segs.join("/") };
}
const rp = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");

// ---------- route matching ----------
interface Pattern { route: string; segs: string[]; dynamic: number }
function buildPatterns(routes: string[]): Pattern[] {
  return routes.map((route) => {
    const segs = route.split("/").filter(Boolean);
    return { route, segs, dynamic: segs.filter((s) => s.startsWith("[")).length };
  });
}
const PH = "\u0000"; // placeholder for ${...}
/** Match a link path to the most specific route. Returns route + confidence, or null. */
function matchRoute(raw: string, patterns: Pattern[]): { route: string; confidence: Confidence } | null {
  let p = raw.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) return null;
  p = p.replace(/\/+$/, "") || "/";
  const segs = p.split("/").filter(Boolean);
  const hasPlaceholder = p.includes(PH);
  let best: { pat: Pattern; viaDynamic: boolean } | null = null;
  for (const pat of patterns) {
    const catchAll = pat.segs.length > 0 && /^\[\[?\.\.\./.test(pat.segs[pat.segs.length - 1]);
    if (!catchAll && pat.segs.length !== segs.length) continue;
    if (catchAll && segs.length < pat.segs.length - 1) continue;
    let ok = true;
    let viaDynamic = false;
    for (let i = 0; i < pat.segs.length && ok; i++) {
      const ps = pat.segs[i];
      const ls = segs[i];
      if (ps.startsWith("[")) {
        if (ls === undefined && !/^\[\[\.\.\./.test(ps)) ok = false;
        viaDynamic = true;
      } else if (ls === undefined) ok = false;
      else if (ls.includes(PH)) ok = ls === PH ? false : new RegExp("^" + ls.split(PH).map(esc).join(".+") + "$").test(ps);
      else if (ls !== ps) ok = false;
    }
    if (!ok) continue;
    if (!best || pat.dynamic < best.pat.dynamic || (pat.dynamic === best.pat.dynamic && pat.segs.length > best.pat.segs.length)) best = { pat, viaDynamic };
  }
  if (!best) return null;
  return { route: best.pat.route, confidence: hasPlaceholder || best.viaDynamic ? "pattern" : "exact" };
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------- file scanning ----------
interface Link { path: string; kind: EdgeKind }
interface FileInfo { imports: string[]; links: Link[] }
const fileCache = new Map<string, FileInfo>();
const resolveCache = new Map<string, string | null>();

function resolveFile(base: string): string | null {
  if (resolveCache.has(base)) return resolveCache.get(base)!;
  let found: string | null = null;
  const cands = [base, ...SRC_EXTS.map((e) => base + e), ...SRC_EXTS.map((e) => path.join(base, "index" + e))];
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) { found = c; break; }
  }
  resolveCache.set(base, found);
  return found;
}
function resolveImport(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  const f = resolveFile(base);
  if (!f) return null;
  return SCAN_DIRS.some((d) => f.startsWith(d + path.sep)) ? f : null;
}

// Route-helper objects: `marketingRoutes.brand(id)` is evaluated with placeholder args, not parsed.
const HELPER_ARG = "__P__";
const helperPaths = new Map<string, string>();
for (const [name, fn] of Object.entries(marketingRoutes as Record<string, unknown>)) {
  if (typeof fn !== "function") continue;
  try {
    const out = (fn as (...a: string[]) => unknown)(HELPER_ARG, HELPER_ARG, HELPER_ARG, HELPER_ARG);
    if (typeof out === "string" && out.startsWith("/")) helperPaths.set(`marketingRoutes.${name}`, out.split(HELPER_ARG).join(PH));
  } catch {
    /* a helper that needs real arguments is a blind spot, not a crash */
  }
}
const HELPER_RE = /\b(marketingRoutes\.\w+)\s*\(/g;

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^"'`;]*?from\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s+["']([^"']+)["']/g;
const LINK_RES: Array<{ re: RegExp; kind: EdgeKind }> = [
  { re: /\bhref\s*=\s*\{?\s*(["'`])(\/[^"'`]*)\1/g, kind: "link" },
  { re: /\b(?:push|replace|prefetch)\s*\(\s*(["'`])(\/[^"'`]*)\1/g, kind: "push" },
  { re: /\b(?:href|path|url|to)\s*:\s*(["'`])(\/[^"'`]*)\1/g, kind: "config" },
];

function scanFile(file: string): FileInfo {
  const hit = fileCache.get(file);
  if (hit) return hit;
  const src = fs.readFileSync(file, "utf8");
  const imports = new Set<string>();
  for (const m of src.matchAll(IMPORT_RE)) {
    const r = resolveImport(m[1] ?? m[2] ?? m[3], file);
    if (r) imports.add(r);
  }
  const links: Link[] = [];
  for (const { re, kind } of LINK_RES) {
    for (const m of src.matchAll(re)) {
      let p = m[2];
      if (m[1] === "`") p = p.replace(/\$\{[^}]*\}/g, PH);
      else if (p.includes("${")) continue;
      if (p.startsWith("//")) continue;
      links.push({ path: p, kind });
    }
  }
  for (const m of src.matchAll(HELPER_RE)) {
    const p = helperPaths.get(m[1]);
    if (p) links.push({ path: p, kind: "link" });
  }
  const info = { imports: [...imports].sort(), links };
  fileCache.set(file, info);
  return info;
}

/** Files reachable from `start` through imports, depth <= MAX_DEPTH, each with its shortest depth. */
function closure(start: string): Map<string, number> {
  const seen = new Map<string, number>([[start, 0]]);
  let frontier = [start];
  for (let d = 1; d <= MAX_DEPTH; d++) {
    const next: string[] = [];
    for (const f of frontier) for (const i of scanFile(f).imports) if (!seen.has(i)) { seen.set(i, d); next.push(i); }
    frontier = next;
  }
  return seen;
}

// ---------- titles ----------
function pageTitle(file: string): { title: string | null; source: string } {
  const src = fs.readFileSync(file, "utf8");
  const pats: Array<[RegExp, string]> = [
    [/metadata[^=]*=\s*\{[\s\S]{0,300}?\btitle\s*:\s*(?:\{[^}]*?(?:default|absolute)\s*:\s*)?["'`]([^"'`$]+)["'`]/, "metadata"],
    [/<PageHeader[^>]*?\btitle\s*=\s*["']([^"']+)["']/, "PageHeader"],
    [/createRouteMetadata\([^)]*?\btitle\s*:\s*["'`]([^"'`$]+)["'`]/, "createRouteMetadata"],
    [/<h1[^>]*>\s*([A-Za-z][^<{}]{2,60}?)\s*<\/h1>/, "h1"],
  ];
  for (const [re, source] of pats) {
    const m = re.exec(src);
    if (m) return { title: m[1].trim(), source };
  }
  return { title: null, source: "unknown" };
}

// ---------- menu ----------
interface MenuEntry { href: string; label: string }
function menuEntries(): MenuEntry[] {
  const out: MenuEntry[] = [];
  const add = (trail: string[], href: string, external?: boolean) => {
    if (!href || external || /^https?:/.test(href) || href.startsWith("#")) return;
    out.push({ href, label: trail.join(" › ") });
  };
  const walkChild = (trail: string[], c: ShellNavChild) => {
    add([...trail, c.label], c.href, c.external);
    for (const k of expandNavChildren(c.children)) walkChild([...trail, c.label], k);
  };
  const walkItem = (section: string, i: ShellNavItem) => {
    add([section, i.label], i.href, i.external);
    for (const c of expandNavChildren(i.children)) walkChild([section, i.label], c);
  };
  for (const i of primaryNavItems) walkItem("Menu", i);
  for (const i of adminNavItems) walkItem("Admin menu", i);
  walkItem("Menu", settingsItem);
  return out;
}

// ---------- main ----------
function main() {
  const pageFiles = walk(APP, PAGE_FILE);
  const byRoute = new Map<string, { group: string; files: string[] }>();
  for (const f of pageFiles) {
    const { group, route } = toRoute(f);
    const r = route === "/" ? "/" : route.replace(/\/$/, "");
    const e = byRoute.get(r) ?? { group, files: [] };
    e.files.push(rp(f));
    byRoute.set(r, e);
  }
  const routes = [...byRoute.keys()].sort();
  const patterns = buildPatterns(routes);

  const homes = new Map<string, { node: string; how: string }>();
  const tsv = fs.readFileSync(path.join(ROOT, "features/shell/frame/route-homes.tsv"), "utf8").split("\n").slice(1);
  for (const l of tsv) {
    const c = l.split("\t");
    if (c[0]?.trim()) homes.set(c[0], { node: c[1] ?? "", how: c[2] ?? "" });
  }

  const edgeMap = new Map<string, Edge>();
  const addEdge = (e: Edge) => {
    if (e.from === e.to) return;
    const k = `${e.from}\u0001${e.to}\u0001${e.kind}`;
    const old = edgeMap.get(k);
    if (!old || (old.confidence === "pattern" && e.confidence === "exact") || (old.confidence === e.confidence && e.via < old.via)) edgeMap.set(k, e);
  };

  // page + layout edges
  const MENU = "@menu";
  const layoutByDir = new Map<string, string>();
  for (const f of walk(APP, LAYOUT_FILE)) layoutByDir.set(path.dirname(f), f);
  const pageDirRoute = new Map<string, string>();
  for (const f of pageFiles) pageDirRoute.set(path.dirname(f), toRoute(f).route === "/" ? "/" : toRoute(f).route);

  const scanFrom = (from: string, start: string, defaultKind?: EdgeKind) => {
    for (const [file, depth] of closure(start)) {
      for (const l of scanFile(file).links) {
        const m = matchRoute(l.path, patterns);
        if (!m) continue;
        const kind = defaultKind ?? l.kind;
        addEdge({ from, to: m.route, kind, confidence: m.confidence, via: rp(file) + (depth ? ` (depth ${depth})` : "") });
      }
    }
  };
  for (const route of routes) {
    const g = byRoute.get(route)!;
    scanFrom(route, path.join(ROOT, g.files[0]));
  }
  // a layout's links belong to the section's own index page (the one page at the layout's directory)
  for (const [dir, lf] of [...layoutByDir].sort()) {
    const idx = pageDirRoute.get(dir);
    if (idx && byRoute.has(idx)) scanFrom(idx, lf, "layout");
  }

  // sidebar registries: the brand / website / SEO sidebars are built from declared section lists
  const registry = (parent: string, groups: Array<{ modes: Array<{ href: string; name?: string; label?: string }> }>) => {
    if (!byRoute.has(parent)) return;
    for (const g of groups) for (const m of g.modes) {
      const hit = matchRoute(m.href.split("__P__").join(PH), patterns);
      if (hit) addEdge({ from: parent, to: hit.route, kind: "sidebar", confidence: "pattern", via: `sidebar: ${m.name ?? m.label ?? m.href}` });
    }
  };
  registry("/marketing/[brandId]", listMarketingBrandModeGroups("/marketing/__P__"));
  registry("/marketing/[brandId]/websites/[siteId]", listMarketingWebsiteModeGroups("/marketing/__P__/websites/__P__"));
  registry("/marketing/[brandId]/seo/[siteId]", listMarketingSeoModeGroups("/marketing/__P__/seo/__P__"));

  // menu edges
  const menuTargets = new Map<string, string[]>();
  const menuLabels = new Map<string, string[]>();
  for (const m of menuEntries()) {
    const hit = matchRoute(m.href, patterns);
    if (!hit) continue;
    addEdge({ from: MENU, to: hit.route, kind: "menu", confidence: hit.confidence, via: m.label });
    menuTargets.set(hit.route, [...(menuTargets.get(hit.route) ?? []), m.label]);
    if (hit.confidence === "exact") menuLabels.set(hit.route, [...(menuLabels.get(hit.route) ?? []), m.label]);
  }

  const edges = [...edgeMap.values()].sort((a, b) => (a.from + a.to + a.kind).localeCompare(b.from + b.to + b.kind));
  const adj = new Map<string, string[]>();
  const inb = new Map<string, Set<string>>();
  const outb = new Map<string, Set<string>>();
  for (const e of edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
    if (e.from !== MENU) {
      (outb.get(e.from) ?? outb.set(e.from, new Set()).get(e.from)!).add(e.to);
    }
    (inb.get(e.to) ?? inb.set(e.to, new Set()).get(e.to)!).add(e.from);
  }
  const reach = new Set<string>();
  const queue = [MENU];
  while (queue.length) {
    const n = queue.pop()!;
    for (const t of adj.get(n) ?? []) if (!reach.has(t)) { reach.add(t); queue.push(t); }
  }

  const nodes: RouteNode[] = routes.map((route) => {
    const g = byRoute.get(route)!;
    const t = pageTitle(path.join(ROOT, g.files[0]));
    const h = homes.get(route);
    return {
      route,
      file: g.files[0],
      otherFiles: g.files.slice(1),
      group: g.group,
      treeNode: h?.node || null,
      howFound: h?.how || null,
      menuLabels: [...new Set(menuLabels.get(route) ?? [])].sort(),
      title: t.title,
      titleSource: t.source,
      inbound: inb.get(route)?.size ?? 0,
      outbound: outb.get(route)?.size ?? 0,
      reachableFromMenu: reach.has(route),
    };
  });

  const out = {
    generatedBy: "scripts/route-flow/extract.ts",
    menuNode: MENU,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      menuEdges: edges.filter((e) => e.kind === "menu").length,
      unreachableFromMenu: nodes.filter((n) => !n.reachableFromMenu).length,
    },
    nodes,
    edges,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(JSON.stringify(out.stats));
}
main();

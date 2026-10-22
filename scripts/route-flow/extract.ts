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
import * as hrRoutes from "@/features/hr/routes";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { getAgentModeHref, MODES as AGENT_MODES } from "@ai-matrx/chat/agents/components/shared/AgentModeController";
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
type EdgeKind = "link" | "push" | "menu" | "config" | "layout" | "sidebar" | "tab" | "admin-map";

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
interface ImportRec {
  resolved: string;
  /** Local names bound by the import, with the exported name they came from. */
  bindings: Array<{ imported: string; local: string }>;
  namespace: string | null;
  /** Dynamic `import()` and side-effect imports: always followed. */
  always: boolean;
}
interface ReExports { named: Map<string, { spec: string; orig: string }>; stars: string[] }
interface FileInfo { src: string; imports: ImportRec[]; reexports: ReExports; links: Link[] }
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

// ---------- route helpers (evaluated, never parsed) ----------
// `marketingRoutes.brand(id)` and the HR module's `hr*Href(org, ...)` builders are called with the
// call site's literal arguments and a placeholder for everything else.
const HELPER_ARG = "__P__";
const helperFns = new Map<string, (...a: unknown[]) => unknown>();
const helperSourceFiles = new Set<string>([
  "features/marketing/lib/routes.ts",
  "features/hr/routes.ts",
]);
for (const [name, fn] of Object.entries(marketingRoutes as Record<string, unknown>)) {
  if (typeof fn === "function") helperFns.set(`marketingRoutes.${name}`, fn as (...a: unknown[]) => unknown);
}
for (const [name, fn] of Object.entries(hrRoutes as Record<string, unknown>)) {
  if (typeof fn === "function" && /^hr\w+(Href|Url)$/.test(name)) helperFns.set(name, fn as (...a: unknown[]) => unknown);
}
const HELPER_RE = new RegExp(
  `(?<![\\w.])(${[...helperFns.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/\./g, "\\.")).join("|")})\\b`,
  "g",
);
const helperCache = new Map<string, string | null>();

/** Split the call arguments that start right after `(` at `idx`. Returns null when unbalanced. */
function parseCallArgs(src: string, idx: number): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  let quote: string | null = null;
  for (let i = idx; i < src.length && i < idx + 600; i++) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (c === "\\") { cur += src[++i] ?? ""; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; cur += c; continue; }
    if (c === "(" || c === "[" || c === "{") { depth++; cur += c; continue; }
    if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) { if (cur.trim()) args.push(cur.trim()); return args; }
      depth--; cur += c; continue;
    }
    if (c === "," && depth === 0) { args.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  return null;
}
function argValue(a: string): unknown {
  const m = /^(["'`])([\s\S]*)\1$/.exec(a);
  if (m) return m[1] === "`" ? m[2].replace(/\$\{[^}]*\}/g, HELPER_ARG) : m[2];
  if (a.startsWith("{")) return {};
  return HELPER_ARG;
}
function evalHelper(name: string, args: unknown[]): string | null {
  const key = name + "\u0001" + JSON.stringify(args);
  if (helperCache.has(key)) return helperCache.get(key)!;
  let out: string | null = null;
  try {
    const v = helperFns.get(name)!(...args);
    if (typeof v === "string" && v.startsWith("/")) out = v.split(HELPER_ARG).join(PH);
  } catch {
    /* a helper that needs real arguments is a blind spot, not a crash */
  }
  helperCache.set(key, out);
  return out;
}

const IMPORT_RE = /(?:^|\n)[ \t]*import\s+(?!type\b)([^"';]*?)\s*from\s*["']([^"']+)["']/g;
const SIDE_EFFECT_RE = /(?:^|\n)[ \t]*import\s+["']([^"']+)["']/g;
const DYNAMIC_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const REEXPORT_RE = /(?:^|\n)[ \t]*export\s+(?!type\b)(\*|\{[^}]*\})(?:\s+as\s+\w+)?\s*from\s*["']([^"']+)["']/g;
const LINK_RES: Array<{ re: RegExp; kind: EdgeKind }> = [
  { re: /\bhref\s*=\s*\{?\s*(["'`])(\/[^"'`]*)\1/g, kind: "link" },
  { re: /\b(?:push|replace|prefetch|redirect|permanentRedirect|openFromNotice|open|go|assign)\s*\(\s*(["'`])(\/[^"'`]*)\1/g, kind: "push" },
  { re: /\b(?:href|path|url|to)\s*:\s*(["'`])(\/[^"'`]*)\1/g, kind: "config" },
];

function parseClause(clause: string): { bindings: Array<{ imported: string; local: string }>; namespace: string | null } {
  const bindings: Array<{ imported: string; local: string }> = [];
  let namespace: string | null = null;
  const braces = /\{([^}]*)\}/.exec(clause);
  const rest = clause.replace(/\{[^}]*\}/, "");
  const ns = /\*\s+as\s+(\w+)/.exec(rest);
  if (ns) namespace = ns[1];
  const def = /^\s*([A-Za-z_$][\w$]*)\s*,?\s*$/.exec(rest.replace(/\*\s+as\s+\w+/, "").replace(/,\s*$/, ""));
  if (def) bindings.push({ imported: "default", local: def[1] });
  if (braces) {
    for (const part of braces[1].split(",")) {
      const t = part.trim();
      if (!t || /^type\s/.test(t)) continue;
      const m = /^([\w$]+)(?:\s+as\s+([\w$]+))?$/.exec(t);
      if (m) bindings.push({ imported: m[1], local: m[2] ?? m[1] });
    }
  }
  return { bindings, namespace };
}

function scanFile(file: string): FileInfo {
  const hit = fileCache.get(file);
  if (hit) return hit;
  const src = fs.readFileSync(file, "utf8");
  const imports: ImportRec[] = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    const resolved = resolveImport(m[2], file);
    if (!resolved) continue;
    const { bindings, namespace } = parseClause(m[1]);
    imports.push({ resolved, bindings, namespace, always: false });
  }
  for (const m of src.matchAll(SIDE_EFFECT_RE)) {
    const resolved = resolveImport(m[1], file);
    if (resolved) imports.push({ resolved, bindings: [{ imported: "default", local: "" }], namespace: null, always: true });
  }
  for (const m of src.matchAll(DYNAMIC_RE)) {
    const resolved = resolveImport(m[1], file);
    if (resolved) imports.push({ resolved, bindings: [{ imported: "default", local: "" }], namespace: null, always: true });
  }
  const reexports: ReExports = { named: new Map(), stars: [] };
  for (const m of src.matchAll(REEXPORT_RE)) {
    if (m[1] === "*") { reexports.stars.push(m[2]); continue; }
    for (const part of m[1].slice(1, -1).split(",")) {
      const t = part.trim();
      if (!t || /^type\s/.test(t)) continue;
      const mm = /^([\w$]+)(?:\s+as\s+([\w$]+))?$/.exec(t);
      if (mm) reexports.named.set(mm[2] ?? mm[1], { spec: m[2], orig: mm[1] });
    }
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
  // `const identityPath = marketingRoutes.brandIdentity(x)` ... `${identityPath}/voice`: evaluate the alias
  const aliases = new Map<string, string>();
  for (const m of src.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(["'])(\/[^"'$]*)\2\s*[;\n]|([\w.]+)\s*\()/g)) {
    if (m[3]) { aliases.set(m[1], m[3]); continue; }
    if (!helperFns.has(m[4])) continue;
    const parsed = parseCallArgs(src, m.index! + m[0].length);
    const v = evalHelper(m[4], parsed ? parsed.map(argValue) : [HELPER_ARG, HELPER_ARG, HELPER_ARG, HELPER_ARG]);
    if (v) aliases.set(m[1], v);
  }
  for (const m of src.matchAll(/`\$\{\s*([\w.]+)\s*(\()?/g)) {
    let prefix: string | undefined;
    let end: number;
    if (m[2]) {
      if (!helperFns.has(m[1])) continue;
      const parsed = parseCallArgs(src, m.index! + m[0].length);
      if (!parsed) continue;
      prefix = evalHelper(m[1], parsed.map(argValue)) ?? undefined;
      end = src.indexOf("}", src.indexOf(")", m.index! + m[0].length + parsed.join(",").length));
    } else {
      prefix = aliases.get(m[1]);
      end = src.indexOf("}", m.index!);
    }
    if (!prefix || end < 0) continue;
    const close = src.indexOf("`", end);
    if (close < 0 || close - end > 160) continue;
    const rest = src.slice(end + 1, close).replace(/\$\{[^}]*\}/g, PH);
    if (rest && !rest.startsWith("/")) continue;
    links.push({ path: prefix.split("?")[0] + rest, kind: "link" });
  }
  if (!helperSourceFiles.has(rp(file))) {
    // helper names inside import statements are not uses
    const body = src.replace(/(?:^|\n)[ \t]*(?:import|export)\s+(?!type\b)[^"';]*?from\s*["'][^"']+["'];?/g, "\n");
    for (const m of body.matchAll(HELPER_RE)) {
      const name = m[1];
      const before = body.slice(Math.max(0, m.index! - 12), m.index!);
      if (/function\s+$/.test(before)) continue;
      const after = m.index! + m[0].length;
      let args: unknown[];
      const call = /^\s*\(/.exec(body.slice(after));
      if (call) {
        const parsed = parseCallArgs(body, after + call[0].length);
        args = parsed ? parsed.map(argValue) : [HELPER_ARG, HELPER_ARG, HELPER_ARG, HELPER_ARG];
      } else args = [HELPER_ARG, HELPER_ARG, HELPER_ARG, HELPER_ARG];
      const p = evalHelper(name, args);
      if (p) links.push({ path: p, kind: "link" });
    }
  }
  const info = { src, imports, reexports, links };
  fileCache.set(file, info);
  return info;
}

// ---------- import following: components rendered by the file, barrels resolved to their source ----------
const localDefCache = new Map<string, Map<string, boolean>>();
function definesLocally(file: string, name: string): boolean {
  const m = localDefCache.get(file) ?? localDefCache.set(file, new Map()).get(file)!;
  if (m.has(name)) return m.get(name)!;
  const src = scanFile(file).src;
  const re = name === "default"
    ? /\bexport\s+default\b/
    : new RegExp(`\\b(?:function\\*?|const|let|var|class|enum)\\s+${esc(name)}\\b`);
  const r = re.test(src);
  m.set(name, r);
  return r;
}
function isBarrel(file: string): boolean {
  const info = scanFile(file);
  if (!info.reexports.stars.length && !info.reexports.named.size) return false;
  return !/^\s*(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s/m.test(info.src);
}
/** The file that defines `name` as exported by `file`; null when a barrel does not say. */
function resolveExport(file: string, name: string, strict: boolean, seen = new Set<string>()): string | null {
  const key = file + "\u0001" + name;
  if (seen.has(key)) return null;
  seen.add(key);
  const info = scanFile(file);
  const named = info.reexports.named.get(name);
  if (named) {
    const t = resolveImport(named.spec, file);
    return t ? resolveExport(t, named.orig, false, seen) : null;
  }
  if (definesLocally(file, name)) return file;
  for (const s of info.reexports.stars) {
    const t = resolveImport(s, file);
    const r = t ? resolveExport(t, name, true, seen) : null;
    if (r) return r;
  }
  if (!strict && !isBarrel(file)) return file;
  return null;
}

const DATA_NAME = /^[A-Z][A-Z0-9_]+$|(?:Tabs|Items|Links|Nav|Routes|Sections|Modes|Steps|Config|Registry)$/;
function renders(src: string, local: string): boolean {
  if (!local) return true;
  if (DATA_NAME.test(local)) return true;
  const l = esc(local);
  return new RegExp(`<${l}[\\s/>.]|createElement\\(\\s*${l}\\b|component=\\{\\s*${l}\\b`).test(src);
}

const followCache = new Map<string, string[]>();
function followTargets(file: string, onlyRendered: boolean): string[] {
  const ck = file + (onlyRendered ? "|r" : "|a");
  const hit = followCache.get(ck);
  if (hit) return hit;
  const info = scanFile(file);
  const out = new Set<string>();
  for (const imp of info.imports) {
    if (imp.always) {
      const t = resolveExport(imp.resolved, "default", false);
      if (t) out.add(t);
      continue;
    }
    if (imp.namespace && (!onlyRendered || new RegExp(`\\b${esc(imp.namespace)}\\.`).test(info.src))) {
      out.add(imp.resolved);
    }
    for (const b of imp.bindings) {
      if (onlyRendered && !renders(info.src, b.local)) continue;
      const t = resolveExport(imp.resolved, b.imported, false);
      if (t) out.add(t);
    }
  }
  const r = [...out].sort();
  followCache.set(ck, r);
  return r;
}

// ---------- shared chrome (menus, sidebars, tab bars, shells) ----------
const CHROME_NAME = /(Sidebar|SideNav|Shell|NavMenu|AppMenu|Subnav|SubNav|SectionNav|RouteNav|ModeNav|TabBar|Tabs|Breadcrumbs?|Crumb|Navigation)$/;
function isChrome(file: string): boolean {
  const r = rp(file);
  if (r.startsWith("features/shell/")) return true;
  return CHROME_NAME.test(path.basename(r).replace(/\.[a-z]+$/, ""));
}
function chromeId(file: string): string {
  const r = rp(file);
  const parts = r.split("/");
  const feature = r.startsWith("features/shell/") ? "shell" : parts[0] === "features" ? parts[1] : `${parts[0]}-${parts[1]}`;
  const base = r.startsWith("features/shell/") ? "" : "/" + path.basename(r).replace(/\.[a-z]+$/, "");
  return `sidebar:${feature}${base}`;
}

interface Closure { files: Map<string, number>; chrome: Set<string> }
/** Files reachable from `start`, depth <= MAX_DEPTH. Chrome files are recorded, never entered. */
function closure(start: string, onlyRendered: boolean): Closure {
  const files = new Map<string, number>([[start, 0]]);
  const chrome = new Set<string>();
  let frontier = [start];
  for (let d = 1; d <= MAX_DEPTH; d++) {
    const next: string[] = [];
    for (const f of frontier) {
      for (const i of followTargets(f, onlyRendered)) {
        if (files.has(i)) continue;
        if (isChrome(i)) { chrome.add(i); continue; }
        files.set(i, d);
        next.push(i);
      }
    }
    frontier = next;
  }
  return { files, chrome };
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
interface MenuEntry { product: string; href: string; label: string }
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function menuEntries(): MenuEntry[] {
  const out: MenuEntry[] = [];
  const add = (product: string, trail: string[], href: string, external?: boolean) => {
    if (!href || external || /^https?:/.test(href) || href.startsWith("#")) return;
    out.push({ product, href, label: trail.join(" › ") });
  };
  const walkChild = (product: string, trail: string[], c: ShellNavChild) => {
    add(product, [...trail, c.label], c.href, c.external);
    for (const k of expandNavChildren(c.children)) walkChild(product, [...trail, c.label], k);
  };
  const walkItem = (product: string, section: string, i: ShellNavItem) => {
    add(product, [section, i.label], i.href, i.external);
    for (const c of expandNavChildren(i.children)) walkChild(product, [section, i.label], c);
  };
  for (const i of primaryNavItems) walkItem(`menu:${slug(i.label) || slug(i.href)}`, "Menu", i);
  for (const i of adminNavItems) walkItem("menu:admin", "Admin menu", i);
  walkItem("menu:settings", "Menu", settingsItem);
  return out;
}

// ---------- synthetic nodes: menus, sidebars, layouts, tab sets ----------
type SyntheticKind = "menu" | "sidebar" | "layout" | "tabs";
interface Synthetic {
  id: string;
  kind: SyntheticKind;
  /** Pages that render it directly. */
  hostPages: Set<string>;
  /** Every page under this app directory renders it (layouts). */
  appDirs: Set<string>;
  /** Every route equal to or below one of these renders it (registries, tab sets). */
  routePrefixes: Set<string>;
  files: Set<string>;
}
const synthetics = new Map<string, Synthetic>();
function synth(id: string, kind: SyntheticKind): Synthetic {
  let s = synthetics.get(id);
  if (!s) synthetics.set(id, (s = { id, kind, hostPages: new Set(), appDirs: new Set(), routePrefixes: new Set(), files: new Set() }));
  return s;
}
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Admin map pages (/<feature>/admin), the documentation hub and feature-map registries link to everything. */
const ADMIN_MAP_FILE = /(^|\/)(admin\/feature-maps\/|feature-docs\/|[A-Za-z]*[Aa]dminMap\b|FeatureAdminPage|featureAdminMap)/;
function isAdminMapSource(route: string, viaFile: string): boolean {
  const segs = route.split("/").filter(Boolean);
  if (segs[segs.length - 1] === "admin") return true;
  if (route.startsWith("/administration/documentation")) return true;
  return ADMIN_MAP_FILE.test(viaFile);
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
  const routes = [...byRoute.keys()].sort(cmp);
  const patterns = buildPatterns(routes);
  const warnings: string[] = [];

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

  const layoutByDir = new Map<string, string>();
  for (const f of walk(APP, LAYOUT_FILE)) layoutByDir.set(path.dirname(f), f);

  // chrome files seen, and which chrome rendered which (for host propagation)
  const chromeFiles = new Set<string>();
  const nestedIn = new Map<string, Set<string>>();

  const scanFrom = (
    emit: (to: string, kind: EdgeKind, conf: Confidence, via: string) => void,
    start: string,
    onlyRendered: boolean,
  ): Set<string> => {
    const c = closure(start, onlyRendered);
    for (const [file, depth] of c.files) {
      for (const l of scanFile(file).links) {
        const m = matchRoute(l.path, patterns);
        if (!m) continue;
        emit(m.route, l.kind, m.confidence, rp(file) + (depth ? ` (depth ${depth})` : ""));
      }
    }
    return c.chrome;
  };

  // pages
  for (const route of routes) {
    const g = byRoute.get(route)!;
    const chrome = scanFrom((to, kind, conf, via) => {
      addEdge({ from: route, to, kind: isAdminMapSource(route, via) ? "admin-map" : kind, confidence: conf, via });
    }, path.join(ROOT, g.files[0]), true);
    for (const c of chrome) { chromeFiles.add(c); synth(chromeId(c), "sidebar").hostPages.add(route); }
  }
  // layouts: the links are the section's navigation, rendered on every page beneath the layout
  for (const [dir, lf] of [...layoutByDir].sort((a, b) => cmp(a[0], b[0]))) {
    const id = `layout:${toRoute(path.join(dir, "layout.tsx")).route}@${rp(dir)}`;
    let used = false;
    const chrome = scanFrom((to, _k, conf, via) => {
      used = true;
      addEdge({ from: id, to, kind: "layout", confidence: conf, via });
    }, lf, true);
    for (const c of chrome) { chromeFiles.add(c); synth(chromeId(c), "sidebar").appDirs.add(dir); }
    if (used) { const sy = synth(id, "layout"); sy.appDirs.add(dir); sy.files.add(rp(lf)); }
  }
  // chrome: each shared menu/sidebar/tab bar/shell is ONE source node, hosted by every page that renders it
  const done = new Set<string>();
  const pending = [...chromeFiles].sort();
  while (pending.length) {
    const cf = pending.shift()!;
    if (done.has(cf)) continue;
    done.add(cf);
    const id = chromeId(cf);
    const sy = synth(id, "sidebar");
    sy.files.add(rp(cf));
    const inner = scanFrom((to, _k, conf, via) => {
      addEdge({ from: id, to, kind: "sidebar", confidence: conf, via });
    }, cf, false);
    for (const c of inner) {
      if (chromeId(c) === id) continue;
      chromeFiles.add(c);
      (nestedIn.get(chromeId(c)) ?? nestedIn.set(chromeId(c), new Set()).get(chromeId(c))!).add(id);
      if (!done.has(c)) pending.push(c);
    }
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const [child, parents] of nestedIn) {
      const cs = synth(child, "sidebar");
      for (const pid of parents) {
        const ps = synthetics.get(pid);
        if (!ps) continue;
        for (const h of ps.hostPages) if (!cs.hostPages.has(h)) { cs.hostPages.add(h); changed = true; }
        for (const h of ps.appDirs) if (!cs.appDirs.has(h)) { cs.appDirs.add(h); changed = true; }
        for (const h of ps.routePrefixes) if (!cs.routePrefixes.has(h)) { cs.routePrefixes.add(h); changed = true; }
      }
    }
  }

  // sidebar registries: the brand / website / SEO sidebars are built from declared section lists
  const registry = (id: string, parent: string, groups: Array<{ modes: Array<{ href: string; name?: string; label?: string }> }>) => {
    if (!byRoute.has(parent)) return;
    const sy = synth(id, "sidebar");
    sy.routePrefixes.add(parent);
    for (const g of groups) for (const m of g.modes) {
      const hit = matchRoute(m.href.split(HELPER_ARG).join(PH), patterns);
      if (hit) addEdge({ from: id, to: hit.route, kind: "sidebar", confidence: "pattern", via: `registry: ${m.name ?? m.label ?? m.href}` });
    }
  };
  registry("sidebar:marketing/brand-sections", "/marketing/brands/[brandId]", listMarketingBrandModeGroups(`/marketing/brands/${HELPER_ARG}`));
  registry("sidebar:marketing/website-sections", "/marketing/brands/[brandId]/websites/[siteId]", listMarketingWebsiteModeGroups(`/marketing/brands/${HELPER_ARG}/websites/${HELPER_ARG}`));
  registry("sidebar:marketing/seo-sections", "/marketing/brands/[brandId]/seo/[siteId]", listMarketingSeoModeGroups(`/marketing/brands/${HELPER_ARG}/seo/${HELPER_ARG}`));

  // per-agent tab bar (lives in @ai-matrx/chat; evaluated, not parsed)
  for (const base of ["/agents", "/administration/agents/system-agents/agents"]) {
    const host = matchRoute(`${base}/${PH}`, patterns);
    if (!host) { warnings.push(`agent tab host not found for ${base}`); continue; }
    const id = base === "/agents" ? "tabs:agents/mode-bar" : "tabs:agents/mode-bar-system";
    synth(id, "tabs").routePrefixes.add(host.route);
    for (const mode of AGENT_MODES) {
      const m = matchRoute(getAgentModeHref(mode.id, PH, base).split(HELPER_ARG).join(PH), patterns);
      if (m) addEdge({ from: id, to: m.route, kind: "tab", confidence: m.confidence, via: `AgentModeController: ${mode.label}` });
    }
  }

  // menu edges, one source node per product
  const menuLabels = new Map<string, string[]>();
  for (const m of menuEntries()) {
    const hit = matchRoute(m.href, patterns);
    if (!hit) continue;
    synth(m.product, "menu");
    addEdge({ from: m.product, to: hit.route, kind: "menu", confidence: hit.confidence, via: m.label });
    if (hit.confidence === "exact") menuLabels.set(hit.route, [...(menuLabels.get(hit.route) ?? []), m.label]);
  }

  // which pages host which synthetic node
  const pageFileDir = new Map<string, string>();
  for (const r of routes) pageFileDir.set(r, path.dirname(path.join(ROOT, byRoute.get(r)!.files[0])));
  const hostsOf = new Map<string, string[]>();
  const hostedBy = new Map<string, string[]>();
  for (const sy of [...synthetics.values()].sort((a, b) => cmp(a.id, b.id))) {
    if (sy.kind === "menu") continue;
    const hosts = new Set(sy.hostPages);
    for (const r of routes) {
      const dir = pageFileDir.get(r)!;
      if ([...sy.appDirs].some((d) => dir === d || dir.startsWith(d + path.sep))) hosts.add(r);
      if ([...sy.routePrefixes].some((p) => r === p || r.startsWith(p + "/"))) hosts.add(r);
    }
    const list = [...hosts].sort(cmp);
    hostsOf.set(sy.id, list);
    for (const h of list) (hostedBy.get(h) ?? hostedBy.set(h, []).get(h)!).push(sy.id);
  }

  const edges = [...edgeMap.values()].sort((a, b) => cmp(a.from + "\u0001" + a.to + "\u0001" + a.kind, b.from + "\u0001" + b.to + "\u0001" + b.kind));
  const isSynthetic = (id: string) => synthetics.has(id);

  const reachFrom = (includeAdminMap: boolean): Set<string> => {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (e.kind === "admin-map" && !includeAdminMap) continue;
      (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
    }
    const seen = new Set<string>();
    const queue = [...synthetics.values()].filter((s) => s.kind === "menu").map((s) => s.id);
    for (const q of queue) seen.add(q);
    while (queue.length) {
      const n = queue.pop()!;
      for (const t of adj.get(n) ?? []) if (!seen.has(t)) { seen.add(t); queue.push(t); }
      for (const sy of hostedBy.get(n) ?? []) if (!seen.has(sy)) { seen.add(sy); queue.push(sy); }
    }
    return seen;
  };
  const reach = reachFrom(false);
  const reachAll = reachFrom(true);

  const inPages = new Map<string, Set<string>>();
  const inSynth = new Map<string, Set<string>>();
  const inAdmin = new Map<string, Set<string>>();
  const out = new Map<string, Set<string>>();
  const outAdmin = new Map<string, Set<string>>();
  const put = (m: Map<string, Set<string>>, k: string, v: string) => (m.get(k) ?? m.set(k, new Set()).get(k)!).add(v);
  for (const e of edges) {
    if (e.kind === "admin-map") { put(inAdmin, e.to, e.from); put(outAdmin, e.from, e.to); continue; }
    if (isSynthetic(e.from)) put(inSynth, e.to, e.from);
    else { put(inPages, e.to, e.from); put(out, e.from, e.to); }
  }

  const nodes = routes.map((route) => {
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
      inbound: (inPages.get(route)?.size ?? 0) + (inSynth.get(route)?.size ?? 0),
      inboundPages: inPages.get(route)?.size ?? 0,
      inboundSynthetic: inSynth.get(route)?.size ?? 0,
      inboundAdminMap: inAdmin.get(route)?.size ?? 0,
      outbound: out.get(route)?.size ?? 0,
      outboundAdminMap: outAdmin.get(route)?.size ?? 0,
      hostedBy: (hostedBy.get(route) ?? []).slice(),
      reachableFromMenu: reach.has(route),
      reachableOnlyViaAdminMap: !reach.has(route) && reachAll.has(route),
    };
  });

  const topOf = (r: string) => (r === "/" ? "(root)" : r.split("/")[1]);
  const bySegment: Record<string, { pages: number; reachable: number; reachableOnlyViaAdminMap: number; stranded: number }> = {};
  for (const n of nodes) {
    const k = topOf(n.route);
    const s = (bySegment[k] ??= { pages: 0, reachable: 0, reachableOnlyViaAdminMap: 0, stranded: 0 });
    s.pages++;
    if (n.reachableFromMenu) s.reachable++;
    else if (n.reachableOnlyViaAdminMap) s.reachableOnlyViaAdminMap++;
    else s.stranded++;
  }
  const segmentSummary = Object.fromEntries(Object.entries(bySegment).sort((a, b) => cmp(a[0], b[0])));
  const edgesByKind: Record<string, number> = {};
  for (const e of edges) edgesByKind[e.kind] = (edgesByKind[e.kind] ?? 0) + 1;

  const syntheticOut = [...synthetics.values()]
    .filter((s) => s.kind === "menu" || edges.some((e) => e.from === s.id))
    .sort((a, b) => cmp(a.id, b.id))
    .map((s) => ({
      id: s.id,
      kind: s.kind,
      files: [...s.files].sort(),
      hostCount: hostsOf.get(s.id)?.length ?? 0,
      hostPages: s.hostPages.size && s.hostPages.size <= 60 ? [...s.hostPages].sort(cmp) : undefined,
      appDirs: s.appDirs.size ? [...s.appDirs].map(rp).sort(cmp) : undefined,
      routePrefixes: s.routePrefixes.size ? [...s.routePrefixes].sort(cmp) : undefined,
    }));

  const doc = {
    generatedBy: "scripts/route-flow/extract.ts",
    menuNodes: syntheticOut.filter((s) => s.kind === "menu").map((s) => s.id),
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      edgesByKind,
      syntheticNodes: syntheticOut.length,
      menuEdges: edgesByKind["menu"] ?? 0,
      reachableFromMenu: nodes.filter((n) => n.reachableFromMenu).length,
      reachableOnlyViaAdminMap: nodes.filter((n) => n.reachableOnlyViaAdminMap).length,
      stranded: nodes.filter((n) => !reachAll.has(n.route)).length,
      unreachableFromMenu: nodes.filter((n) => !n.reachableFromMenu).length,
    },
    warnings,
    summaryBySegment: segmentSummary,
    synthetic: syntheticOut,
    nodes,
    edges,
  };
  fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
  console.log(JSON.stringify(doc.stats));
  for (const w of warnings) console.warn("[route-flow] WARNING", w);
}
main();

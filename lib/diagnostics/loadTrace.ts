/**
 * loadTrace.ts — ONE ORDERED TIMELINE OF A PAGE LOAD, IN THE CONSOLE, WITH SMOKE DETECTORS.
 *
 * Nothing prints while the page loads. When it SETTLES, one block prints, on one clock (ms since
 * navigation start), in this order:
 *   1. the SUMMARY line (settle time, FCP, LCP, CLS, requests, scripts, smoke verdict);
 *   2. "Paint & renders" — navigation, first byte, paints, every `RENDERED  Sidebar (12ms)` line,
 *      core markers, the first click/key, route changes, PAGE SETTLED;
 *   3. "Lazy loads", "Heavy" (RED before the first engagement), "Layout shifts" (with the shifted
 *      element), "Stalls" (long frames) — Heavy and Layout shifts always print, "clean" when empty;
 *   4. ONE collapsed group "Requests (N) — DB n, server n, next n", printed when the network goes
 *      quiet after settle (1.5 s, at most 10 s): database calls first (table or rpc, method, ms,
 *      size), identical requests and repeated Next RSC fetches flagged ×N in yellow;
 *   5. a collapsed "Biggest scripts" group (plain lines, never console.table).
 * Anything that happens later prints as an "after settle" line, in order, below that block.
 *
 * RENDER LINES — a client component calls `useLoadMark("Sidebar")` (loadMark.ts, no imports); a
 * server component renders `<LoadMark name="Sidebar" />`. Packages write the inline one-liner.
 *
 * MARKERS — any module, in this app or an @ai-matrx package, announces itself with the native
 * `performance.mark("load:<kind>:<name>")`. No import, so a marker never adds a build-graph edge.
 * Put it at MODULE TOP LEVEL of the Impl/body file (it fires when that chunk evaluates), guarded
 * for the server: `if (typeof window !== "undefined") performance.mark("load:heavy:PDF viewer");`
 * Never in a shared barrel (the barrel evaluates for every importer).
 *
 *   render — a piece is on screen. `detail.ms` = render start → painted frame.
 *   heavy  — must NEVER load or render before the person engages (first trusted pointer press,
 *            touch or key; an autofocus is not engagement). Before → 🔴 RED. After → gray.
 *   lazy   — wanted work that must never run before the page settles (the idle flush). Before → 🔴
 *            RED (amber when a click came first: the person asked). After → green.
 *   core   — expected for first paint (route shell, composer…). A normal line with its time.
 *   A heavy thing names the routes that SHOW it as its home — `performance.mark("load:heavy:Notes
 *   editor", { detail: { home: ["/notes"] } })`, or a "^" pattern — and prints as core there.
 *   `load:module:<name>` and plain `load:<name>` (the older forms) print as core / mark lines.
 *
 * SHIFTS — every layout shift over 0.005 not caused by input prints RED with its value and the
 * shifted nodes; a shift means someone did not reserve space.
 *
 * ON automatically on localhost and development builds, in production for an admin with debug mode
 * on (from the next load), and for anyone with `?trace=load`; `?trace=off` silences it
 * (loadTraceFlag.ts). Off, it costs one localStorage read. On, it sets
 * `globalThis.__matrxLoadTraceOn` (the render marks read it) and records each fetch/XHR method.
 * `window.__matrxLoadTrace()` returns the same report as data (the `pnpm check:smoke` guard reads it).
 */

import { registerIdleTask } from "@ai-matrx/kit/idle-scheduler";
import { loadTraceEnabled } from "./loadTraceFlag";

/**
 * The trace's own console. Production builds strip every `console.log/table/group*` call
 * (`compiler.removeConsole` in next.config.js keeps only error/warn), which silently deleted this
 * whole timeline on aimatrx.com — it only ever printed on localhost. The compiler matches the
 * literal `console.<method>(` form, so the trace writes through this alias: its lines survive,
 * every other `console.log` in the app is still stripped.
 */
const traceConsole: Console = globalThis.console;

const SETTLE_CAP_MS = 15_000;
const STALL_MS = 100;
const SHIFT_MIN = 0.005;
/** The requests group prints once the network has been quiet this long after settle (or at the cap). */
const NET_QUIET_MS = 1_500;
const NET_GROUP_CAP_MS = 10_000;

export type LoadTraceKind =
  | "nav"
  | "net"
  | "paint"
  | "mark"
  | "render"
  | "core"
  | "heavy"
  | "lazy"
  | "shift"
  | "stall"
  | "engage"
  | "settle";

export type LoadTraceRequestGroup = "db" | "server" | "next" | "other";

export interface LoadTraceEvent {
  at: number;
  kind: LoadTraceKind;
  name: string;
  ms?: number;
  detail?: string;
  /** Layout shift value. */
  value?: number;
  /** A render/heavy marker written by useLoadMark (rendered, not just loaded). */
  rendered?: boolean;
  /** Requests: HTTP method, where it went, size on the wire, and how many identical ones. */
  method?: string;
  group?: LoadTraceRequestGroup;
  sizeKB?: number;
  dupKey?: string;
  times?: number;
}

export interface LoadTraceViolation {
  kind: "heavy-before-engagement" | "lazy-before-settle" | "shift";
  name: string;
  at: number;
  detail?: string;
}

export interface LoadTraceDuplicate {
  key: string;
  group: LoadTraceRequestGroup;
  times: number;
  rsc: boolean;
}

export interface LoadTraceReport {
  route: string;
  settledAt: number | null;
  engagedAt: number | null;
  ttfb: number | null;
  fcp: number | null;
  lcp: { at: number; element: string } | null;
  /** Sum of every shift not caused by input. */
  cls: number;
  clsBeforeSettle: number;
  violations: LoadTraceViolation[];
  scripts: { count: number; wireKB: number; unpackedKB: number; biggest: { file: string; wireKB: number; unpackedKB: number; at: number }[] };
  css: { count: number; wireKB: number };
  requests: LoadTraceEvent[];
  /** Every RENDERED line (render markers), in order. */
  renders: LoadTraceEvent[];
  /** Identical requests (same method + URL; Next RSC fetches compared without their `_rsc` hash). */
  duplicates: LoadTraceDuplicate[];
  events: LoadTraceEvent[];
}

let events: LoadTraceEvent[] = [];
let settledAt: number | null = null;
let engagedAt: number | null = null;
let engagedBy = "click";
let lcp: { at: number; element: string } | null = null;
let cls = 0;
let clsBeforeSettle = 0;
let printedLive = false;
let requestsPrinted = false;
let lastResourceAt = 0;
let installed = false;
const seenOnce = new Set<string>();
const seenResources = new WeakSet<PerformanceEntry>();
const dupCounts = new Map<string, number>();
/** Fetch/XHR calls seen by the method recorder: absolute URL, method, call time. */
let calls: { url: string; method: string; t: number; used: boolean }[] = [];
const observers: { observer: PerformanceObserver; onEntry: (entry: PerformanceEntry) => void }[] = [];

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    return `${host}${u.pathname}${u.search ? u.search.slice(0, 60) : ""}`;
  } catch {
    return url;
  }
}

/** Where a request went, a readable label, and its duplicate key (RSC hash removed). */
export function classifyRequest(url: string, method: string, origin: string): { group: LoadTraceRequestGroup; label: string; dupKey: string; rsc: boolean } {
  let u: URL;
  try {
    u = new URL(url, origin);
  } catch {
    return { group: "other", label: url, dupKey: `${method} ${url}`, rsc: false };
  }
  const rsc = u.searchParams.has("_rsc");
  if (rsc) u.searchParams.delete("_rsc");
  const search = u.search ? decodeURIComponent(u.search).slice(0, 80) : "";
  const dupKey = `${method} ${u.origin}${u.pathname}${u.search}`;
  const host = u.host;
  if (host.startsWith("db.") || host.endsWith(".supabase.co")) {
    const rest = /^\/rest\/v1\/(rpc\/)?([^/?]+)/.exec(u.pathname);
    const label = rest
      ? `${rest[1] ? "rpc " : ""}${rest[2]}${search ? ` ${search.slice(0, 60)}` : ""}`
      : u.pathname.replace(/^\/(auth|storage|realtime|functions)\/v1/, "$1");
    return { group: "db", label, dupKey, rsc };
  }
  if (host.endsWith("matrxserver.com")) return { group: "server", label: `${host.split(".")[0]} ${u.pathname}${search}`, dupKey, rsc };
  if (u.origin === origin) return { group: "next", label: `${rsc ? "RSC " : ""}${u.pathname}${search}`, dupKey, rsc };
  return { group: "other", label: shortUrl(u.href), dupKey, rsc };
}

/** A short CSS-ish path for a node: up to three levels, tag#id.class.class. */
export function nodePath(node: Node | null | undefined): string {
  const parts: string[] = [];
  let el: Element | null = node instanceof Element ? node : (node?.parentElement ?? null);
  while (el && parts.length < 3 && el !== document.body) {
    const label =
      el.getAttribute("data-testid") ??
      el.getAttribute("data-surface") ??
      el.getAttribute("aria-label");
    let part = el.tagName.toLowerCase();
    if (el.id) part += `#${el.id}`;
    else if (label) part += `[${label.slice(0, 30)}]`;
    else {
      const classes = (typeof el.className === "string" ? el.className : "")
        .split(/\s+/)
        .filter((c) => c && /^[\w-]+$/.test(c))
        .slice(0, 2);
      if (classes.length) part += `.${classes.join(".")}`;
    }
    parts.unshift(part);
    el = el.parentElement;
  }
  return parts.join(" > ") || "(node gone)";
}

// Every style starts with "color:" — scripts/check-smoke.mjs strips the style argument by that prefix.
const STYLE = {
  plain: "color:inherit",
  net: "color:#2563eb",
  milestone: "color:#16a34a;font-weight:bold",
  core: "color:#0891b2",
  render: "color:#7c3aed",
  grey: "color:#9ca3af",
  green: "color:#16a34a",
  amber: "color:#d97706;font-weight:bold",
  yellow: "color:#a16207;background:#fef9c3;font-weight:bold;padding:0 4px",
  red: "color:#fff;background:#dc2626;font-weight:bold;padding:0 4px",
  stall: "color:#dc2626",
  section: "color:inherit;font-weight:bold",
};

function kb(n: number): number {
  return Math.round(n / 1024);
}

/** The one line for an event, classified against what is known now. */
function line(e: LoadTraceEvent): { text: string; style: string } {
  const ms = e.ms !== undefined ? ` (${e.ms}ms)` : "";
  const detail = e.detail ? ` · ${e.detail}` : "";
  switch (e.kind) {
    case "render":
      return { text: `RENDERED  ${e.name}${ms}${detail}`, style: STYLE.render };
    case "heavy": {
      const verb = e.rendered ? "RENDERED" : "LOADED";
      if (engagedAt === null || e.at < engagedAt)
        return { text: `🔴 HEAVY ${verb} BEFORE ENGAGEMENT  ${e.name}${ms}`, style: STYLE.red };
      return { text: `heavy ${verb.toLowerCase()}  ${e.name}${ms} (+${e.at - engagedAt}ms after ${engagedBy})`, style: STYLE.grey };
    }
    case "lazy":
      if (settledAt === null || e.at < settledAt) {
        if (engagedAt !== null && e.at >= engagedAt)
          return { text: `LAZY RAN BEFORE SETTLE (after your ${engagedBy}): ${e.name}`, style: STYLE.amber };
        return { text: `🔴 LAZY RAN BEFORE SETTLE: ${e.name}${settledAt !== null ? ` (settled at +${settledAt}ms)` : ""}`, style: STYLE.red };
      }
      return { text: `lazy ${e.name} (+${e.at - settledAt}ms after settle)`, style: STYLE.green };
    case "core":
      return { text: `core ${e.name}${ms}${detail}`, style: STYLE.core };
    case "shift":
      return {
        text: `🔴 LAYOUT SHIFT ${e.value?.toFixed(4)} ${settledAt === null || e.at < settledAt ? "before" : "after"} settle · CLS ${e.detail}`,
        style: STYLE.red,
      };
    case "net": {
      const size = e.sizeKB ? `  ${e.sizeKB} KB` : "";
      const dup = (e.times ?? 1) > 1 ? `  ×${e.times} DUPLICATE` : "";
      return { text: `${(e.method ?? "GET").padEnd(6)} ${e.name}${ms}${size}${dup}`, style: dup ? STYLE.yellow : STYLE.net };
    }
    case "stall":
      return { text: `STALL ${e.name}${ms}${detail}`, style: STYLE.stall };
    case "engage":
    case "settle":
    case "paint":
    case "nav":
      return { text: `${e.name}${ms}${detail}`, style: STYLE.milestone };
    default:
      return { text: `${e.name}${ms}${detail}`, style: STYLE.plain };
  }
}

function at(n: number): string {
  return `+${String(n).padStart(6)}ms`;
}

function print(e: LoadTraceEvent, prefix = ""): void {
  const { text, style } = line(e);
  traceConsole.log(`%c[load] ${prefix}${at(e.at)}  ${text}`, style);
}

function push(event: LoadTraceEvent): void {
  events.push(event);
  // A request that finishes after settle waits for the requests group (it lists every request,
  // in place, once the network goes quiet); only one after THAT prints as its own late line.
  if (event.kind === "net" && !requestsPrinted) return;
  if (printedLive) print(event, "after settle ");
}

function observe(type: string, onEntry: (entry: PerformanceEntry) => void): void {
  try {
    const observer = new PerformanceObserver((list) => list.getEntries().forEach(onEntry));
    observer.observe({ type, buffered: true });
    observers.push({ observer, onEntry });
  } catch {
    /* this browser does not report this entry type */
  }
}

/** Deliver every entry the browser has queued but not yet handed to the observers. */
function flushObservers(): void {
  for (const { observer, onEntry } of observers) {
    try {
      observer.takeRecords().forEach(onEntry);
    } catch {
      /* observer gone */
    }
  }
  for (const entry of performance.getEntriesByType("resource")) onResource(entry);
}

function isScript(entry: PerformanceResourceTiming): boolean {
  return entry.initiatorType === "script" || /\.m?js(\?|$)/.test(entry.name);
}

/** The method the recorder saw for this URL nearest this start time; GET when none was recorded. */
function methodFor(url: string, startTime: number): string {
  let best: (typeof calls)[number] | null = null;
  for (const c of calls) {
    if (c.used || c.url !== url) continue;
    if (!best || Math.abs(c.t - startTime) < Math.abs(best.t - startTime)) best = c;
  }
  if (best && Math.abs(best.t - startTime) < 250) {
    best.used = true;
    return best.method;
  }
  return "GET";
}

function onResource(entry: PerformanceEntry): void {
  const r = entry as PerformanceResourceTiming;
  if (r.initiatorType !== "fetch" && r.initiatorType !== "xmlhttprequest") return;
  if (seenResources.has(r)) return;
  seenResources.add(r);
  lastResourceAt = performance.now();
  const method = methodFor(r.name, r.startTime);
  const { group, label, dupKey } = classifyRequest(r.name, method, window.location.origin);
  const times = (dupCounts.get(dupKey) ?? 0) + 1;
  dupCounts.set(dupKey, times);
  const size = r.encodedBodySize || r.transferSize || 0;
  push({
    at: Math.round(r.startTime),
    kind: "net",
    name: label,
    ms: Math.round(r.duration),
    method,
    group,
    dupKey,
    times,
    sizeKB: size ? Math.max(1, kb(size)) : undefined,
  });
}

/** Record the METHOD of every fetch/XHR (resource timing has none). Records only; never awaits. */
function recordRequestMethods(): void {
  const origin = window.location.origin;
  const abs = (url: string) => {
    try {
      return new URL(url, origin).href;
    } catch {
      return url;
    }
  };
  const original = window.fetch;
  if (typeof original === "function") {
    window.fetch = function tracedFetch(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
        if (calls.length < 5_000) calls.push({ url: abs(url), method, t: performance.now(), used: false });
      } catch {
        /* never break a request for the trace */
      }
      return original.call(globalThis, input, init);
    } as typeof window.fetch;
  }
  const xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function tracedOpen(this: XMLHttpRequest, ...args: unknown[]) {
    try {
      const [method, url] = args as [string, string | URL];
      if (calls.length < 5_000) calls.push({ url: abs(String(url)), method: String(method).toUpperCase(), t: performance.now(), used: false });
    } catch {
      /* never break a request for the trace */
    }
    return (xhrOpen as (...a: unknown[]) => void).apply(this, args);
  } as typeof XMLHttpRequest.prototype.open;
}

function violations(): LoadTraceViolation[] {
  const out: LoadTraceViolation[] = [];
  for (const e of events) {
    if (e.kind === "heavy" && (engagedAt === null || e.at < engagedAt))
      out.push({ kind: "heavy-before-engagement", name: e.name, at: e.at });
    else if (e.kind === "lazy" && (settledAt === null || e.at < settledAt) && (engagedAt === null || e.at < engagedAt))
      out.push({ kind: "lazy-before-settle", name: e.name, at: e.at });
    else if (e.kind === "shift") out.push({ kind: "shift", name: `layout shift ${e.value?.toFixed(4)}`, at: e.at, detail: e.detail });
  }
  return out;
}

export function loadTraceReport(): LoadTraceReport {
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const scripts = resources.filter(isScript);
  const css = resources.filter((r) => /\.css(\?|$)/.test(r.name));
  const requests = events.filter((e) => e.kind === "net");
  const duplicates: LoadTraceDuplicate[] = [];
  for (const [key, times] of dupCounts) {
    if (times < 2) continue;
    const sample = requests.find((r) => r.dupKey === key);
    duplicates.push({ key, times, group: sample?.group ?? "other", rsc: sample?.name.startsWith("RSC ") ?? false });
  }
  return {
    route: window.location.pathname,
    settledAt,
    engagedAt,
    ttfb: events.find((e) => e.name === "server first byte")?.at ?? null,
    fcp: events.find((e) => e.name === "first contentful paint")?.at ?? null,
    lcp,
    cls: Number(cls.toFixed(4)),
    clsBeforeSettle: Number(clsBeforeSettle.toFixed(4)),
    violations: violations(),
    scripts: {
      count: scripts.length,
      wireKB: kb(scripts.reduce((a, r) => a + (r.encodedBodySize || 0), 0)),
      unpackedKB: kb(scripts.reduce((a, r) => a + (r.decodedBodySize || 0), 0)),
      biggest: [...scripts]
        .sort((a, b) => b.decodedBodySize - a.decodedBodySize)
        .slice(0, 15)
        .map((r) => ({ file: r.name.split("/").pop() ?? r.name, wireKB: kb(r.encodedBodySize), unpackedKB: kb(r.decodedBodySize), at: Math.round(r.startTime) })),
    },
    css: { count: css.length, wireKB: kb(css.reduce((a, r) => a + (r.encodedBodySize || 0), 0)) },
    requests,
    renders: events.filter((e) => e.kind === "render" || (e.kind === "heavy" && e.rendered)).sort((a, b) => a.at - b.at),
    duplicates: duplicates.sort((a, b) => b.times - a.times),
    events: [...events].sort((a, b) => a.at - b.at),
  };
}

const PAINT_KINDS: LoadTraceKind[] = ["nav", "paint", "render", "core", "mark", "engage", "settle"];
const GROUP_ORDER: LoadTraceRequestGroup[] = ["db", "server", "next", "other"];

function section(title: string, list: LoadTraceEvent[], emptyText?: string): void {
  if (!list.length && !emptyText) return;
  traceConsole.log(`%c[load] ── ${title} (${list.length})${list.length ? "" : ` — ${emptyText}`}`, STYLE.section);
  for (const e of list) print(e);
}

/**
 * 4. Requests: ONE collapsed group, database calls first. Printed once the network has been quiet
 * for NET_QUIET_MS after settle (most of a page's reads finish after the idle flush begins), so
 * every request of the load sits in it — never as a stream of loose lines.
 */
function printRequests(): void {
  if (requestsPrinted) return;
  flushObservers();
  requestsPrinted = true;
  const report = loadTraceReport();
  const byGroup = (g: LoadTraceRequestGroup) => report.requests.filter((r) => r.group === g).sort((a, b) => a.at - b.at);
  const wasted = report.duplicates.reduce((a, d) => a + d.times - 1, 0);
  traceConsole.groupCollapsed(
    `[load] Requests (${report.requests.length}, to +${Math.round(performance.now())}ms) — DB ${byGroup("db").length}, server ${byGroup("server").length}, next ${byGroup("next").length}${byGroup("other").length ? `, other ${byGroup("other").length}` : ""}${wasted ? ` · ${wasted} duplicate` : ""}`,
  );
  for (const g of GROUP_ORDER) {
    const list = byGroup(g);
    if (!list.length) continue;
    traceConsole.log(`%c[load] ── ${g === "db" ? "DB" : g} (${list.length})`, STYLE.section);
    // The ×N count is final now (a late copy is printed again as an "after settle" line).
    for (const e of list) print({ ...e, times: dupCounts.get(e.dupKey ?? "") ?? 1 });
  }
  for (const d of report.duplicates)
    traceConsole.log(`%c[load] DUPLICATE ×${d.times}${d.rsc ? " (Next RSC fetch of the same route)" : ""}  ${d.key}`, STYLE.yellow);
  traceConsole.groupEnd();

  // 5. Biggest scripts, as plain lines.
  traceConsole.groupCollapsed(`[load] Biggest scripts (${report.scripts.count} scripts, ${report.scripts.unpackedKB} KB unpacked)`);
  for (const s of report.scripts.biggest)
    traceConsole.log(`[load] ${at(s.at)}  ${String(s.unpackedKB).padStart(5)} KB unpacked  ${String(s.wireKB).padStart(4)} KB wire  ${s.file}`);
  traceConsole.groupEnd();
}

function printTimelineAndSummary(): void {
  const report = loadTraceReport();
  printedLive = true;
  const heavy = report.violations.filter((v) => v.kind === "heavy-before-engagement").length;
  const lazy = report.violations.filter((v) => v.kind === "lazy-before-settle").length;
  const shifts = report.violations.filter((v) => v.kind === "shift").length;
  const smoke = heavy + lazy + shifts;
  const wasted = report.duplicates.reduce((a, d) => a + d.times - 1, 0);

  // 1. The headline (request counts so far; the requests group below prints when the network is quiet).
  traceConsole.log(
    `%c[load] SUMMARY ${report.route} · settled +${report.settledAt}ms · TTFB ${report.ttfb ?? "?"}ms · FCP ${report.fcp ?? "?"}ms · LCP ${report.lcp ? `${report.lcp.at}ms ${report.lcp.element}` : "?"} · CLS ${report.cls} · ${report.renders.length} renders · ${report.requests.length} requests${wasted ? ` (${wasted} duplicate)` : ""} · ${report.scripts.count} scripts ${report.scripts.wireKB} KB wire / ${report.scripts.unpackedKB} KB unpacked · smoke ${smoke ? `🔴 ${heavy} heavy, ${lazy} lazy, ${shifts} shifts` : "clean"}`,
    smoke ? STYLE.red : STYLE.milestone,
  );

  // 2–3. The ordered timeline, grouped.
  section("Paint & renders", report.events.filter((e) => PAINT_KINDS.includes(e.kind)));
  section("Lazy loads", report.events.filter((e) => e.kind === "lazy"));
  section("Heavy", report.events.filter((e) => e.kind === "heavy"), "clean, nothing heavy before engagement");
  section("Layout shifts", report.events.filter((e) => e.kind === "shift"), `clean, CLS ${report.cls}`);
  section("Stalls", report.events.filter((e) => e.kind === "stall"));
}

function markKind(name: string): { kind: LoadTraceKind; label: string } {
  const [head, ...rest] = name.split(":");
  const label = rest.join(":");
  if (head === "heavy" || head === "lazy" || head === "core" || head === "render") return { kind: head, label: label || head };
  if (head === "module") return { kind: "core", label };
  return { kind: "mark", label: name };
}

/** Called once from instrumentation-client.ts. Does nothing unless the trace is on. */
export function installLoadTrace(): void {
  if (installed || typeof window === "undefined" || !loadTraceEnabled()) return;
  installed = true;
  (globalThis as { __matrxLoadTraceOn?: boolean }).__matrxLoadTraceOn = true;
  try {
    performance.setResourceTimingBufferSize(10_000);
  } catch {
    /* older browser */
  }
  recordRequestMethods();
  (window as unknown as { __matrxLoadTrace: () => LoadTraceReport }).__matrxLoadTrace = loadTraceReport;
  traceConsole.log("%c[load] trace ON — the timeline prints when the page settles (?trace=off to silence)", STYLE.milestone);

  push({ at: 0, kind: "nav", name: "navigation start", detail: window.location.pathname });
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (nav) push({ at: Math.round(nav.responseStart), kind: "nav", name: "server first byte", detail: nav.type });

  // ENGAGEMENT: the first trusted press. Capture phase, so it is recorded before any handler runs
  // (and before anything that handler imports evaluates).
  const engage = (event: Event) => {
    if (!event.isTrusted || engagedAt !== null) return;
    engagedAt = Math.round(performance.now());
    engagedBy = event.type === "keydown" ? "key press" : event.type === "touchstart" ? "touch" : "click";
    push({ at: engagedAt, kind: "engage", name: `FIRST ${engagedBy.toUpperCase()}`, detail: nodePath(event.target as Node) });
    for (const type of ["pointerdown", "keydown", "touchstart"]) window.removeEventListener(type, engage, true);
  };
  for (const type of ["pointerdown", "keydown", "touchstart"])
    window.addEventListener(type, engage, { capture: true, passive: true });

  observe("resource", onResource);
  observe("mark", (entry) => {
    if (!entry.name.startsWith("load:")) return;
    const parsed = markKind(entry.name.slice("load:".length));
    let { kind, label } = parsed;
    const detail = (entry as PerformanceMark).detail as { home?: string[]; ms?: number; hydrated?: boolean } | null | undefined;
    // A heavy thing on its own HOME route (the PDF studio on /pdf, the notes editor on /notes) is
    // what that page shows: `performance.mark("load:heavy:X", { detail: { home: ["/notes"] } })`.
    const home = detail?.home;
    const path = window.location.pathname;
    // A home entry is a path prefix, or a pattern when it starts with "^" ("^/chat/(?!new)").
    if (kind === "heavy" && home?.some((h) => (h.startsWith("^") ? new RegExp(h).test(path) : path.startsWith(h)))) {
      kind = "core";
      label = `${label} (home route)`;
    }
    // A component's first-render marker fires per mount; render/heavy/core say "arrived" once.
    if (kind === "heavy" || kind === "core" || kind === "render") {
      if (seenOnce.has(entry.name)) return;
      seenOnce.add(entry.name);
    }
    const rendered = typeof detail?.ms === "number";
    push({
      at: Math.round(entry.startTime),
      kind,
      name: label,
      ms: rendered ? detail?.ms : undefined,
      rendered: rendered || undefined,
      detail: detail?.hydrated ? "server HTML, hydrated" : undefined,
    });
  });
  observe("paint", (entry) =>
    push({ at: Math.round(entry.startTime), kind: "paint", name: entry.name === "first-contentful-paint" ? "first contentful paint" : "first paint" }),
  );
  observe("largest-contentful-paint", (entry) => {
    const element = nodePath((entry as unknown as { element?: Element }).element);
    lcp = { at: Math.round(entry.startTime), element };
    const existing = events.find((e) => e.name === "largest paint");
    if (existing && !printedLive) {
      existing.at = lcp.at;
      existing.detail = element;
    } else if (!existing) push({ at: lcp.at, kind: "paint", name: "largest paint", detail: element });
  });
  observe("layout-shift", (entry) => {
    const shift = entry as unknown as { value: number; hadRecentInput: boolean; sources?: { node?: Node }[] };
    if (shift.hadRecentInput) return;
    cls += shift.value;
    const when = Math.round(entry.startTime);
    if (settledAt === null || when < settledAt) clsBeforeSettle += shift.value;
    if (shift.value <= SHIFT_MIN) return;
    const nodes = (shift.sources ?? []).map((s) => nodePath(s.node)).slice(0, 4).join(" | ");
    push({ at: when, kind: "shift", name: "layout shift", value: shift.value, detail: `${cls.toFixed(4)} · ${nodes}` });
  });
  observe("long-animation-frame", (entry) => {
    if (entry.duration < STALL_MS) return;
    const scripts = (entry as unknown as { scripts?: { sourceURL?: string; sourceFunctionName?: string; duration: number }[] }).scripts ?? [];
    const worst = [...scripts].sort((a, b) => b.duration - a.duration)[0];
    push({
      at: Math.round(entry.startTime),
      kind: "stall",
      name: "long frame",
      ms: Math.round(entry.duration),
      detail: worst ? `${worst.sourceFunctionName || "(anonymous)"} · ${(worst.sourceURL ?? "").split("/").pop()}` : undefined,
    });
  });

  // Client-side route changes (Chromium's Navigation API; elsewhere the timeline just continues).
  const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
  navigation?.addEventListener("navigatesuccess", () =>
    push({ at: Math.round(performance.now()), kind: "nav", name: "route change", detail: window.location.pathname }),
  );

  const settle = () => {
    if (settledAt !== null) return;
    // Everything the browser already measured belongs in the block, never as a late line under it.
    flushObservers();
    settledAt = Math.round(performance.now());
    events.push({ at: settledAt, kind: "settle", name: "PAGE SETTLED" });
    printTimelineAndSummary();
    const quietCheck = window.setInterval(() => {
      flushObservers();
      const now = performance.now();
      if (now - Math.max(lastResourceAt, settledAt ?? 0) >= NET_QUIET_MS || now - (settledAt ?? 0) >= NET_GROUP_CAP_MS) {
        window.clearInterval(quietCheck);
        printRequests();
      }
    }, 250);
  };
  // Settled = the moment the page-load idle flush BEGINS (priority 1, registered first, so it runs
  // before every other idle task — the lazy work that must come after it).
  registerIdleTask("matrx-load-trace:settled", 1, settle);
  window.setTimeout(settle, SETTLE_CAP_MS);
}

/** For tests. */
export function resetLoadTraceForTests(): void {
  events = [];
  settledAt = null;
  engagedAt = null;
  lcp = null;
  cls = 0;
  clsBeforeSettle = 0;
  printedLive = false;
  requestsPrinted = false;
  lastResourceAt = 0;
  installed = false;
  seenOnce.clear();
  dupCounts.clear();
  calls = [];
  for (const { observer } of observers.splice(0)) observer.disconnect();
  delete (globalThis as { __matrxLoadTraceOn?: boolean }).__matrxLoadTraceOn;
}

/** For tests: the request recorder and classifier without a browser's resource timing. */
export const __loadTraceTesting = { onResource, recordRequestMethods, printTimelineAndSummary, printRequests, push };

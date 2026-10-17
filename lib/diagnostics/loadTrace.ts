/**
 * loadTrace.ts — ONE ORDERED TIMELINE OF A PAGE LOAD, IN THE CONSOLE, WITH SMOKE DETECTORS.
 *
 * One line per event, in order, on one clock (ms since navigation start): navigation start, server
 * first byte, first contentful paint, largest paint (with its element), every fetch/XHR, every
 * MARKER, every LAYOUT SHIFT, every long frame, the first click/key, page settled — then a summary
 * (requests, script KB, CLS, LCP, smoke violations).
 *
 * MARKERS — any module, in this app or an @ai-matrx package, announces itself with the native
 * `performance.mark("load:<kind>:<name>")`. No import, so a marker never adds a build-graph edge.
 * Put it at MODULE TOP LEVEL of the Impl/body file (it fires when that chunk evaluates), guarded
 * for the server: `if (typeof window !== "undefined") performance.mark("load:heavy:PDF viewer");`
 * Never in a shared barrel (the barrel evaluates for every importer).
 *
 *   heavy — must NEVER load before the person engages (first trusted pointer press, touch or key;
 *           a real person cannot focus a text field without one, and an autofocus is not
 *           engagement). Before → 🔴 RED. After → a grey "loaded (+40ms after click)" line.
 *   lazy  — wanted work that must never run before the page settles (the idle flush). Before → 🔴
 *           RED (amber when a click came first: the person asked). After → green.
 *   core  — expected for first paint (route shell, composer…). A normal line with its time.
 *   A heavy thing names the routes that SHOW it as its home — `performance.mark("load:heavy:Notes
 *   editor", { detail: { home: ["/notes"] } })`, or a "^" pattern — and prints as core there.
 *   `load:module:<name>` and plain `load:<name>` (the older forms) print as core / mark lines.
 *
 * SHIFTS — every layout shift over 0.005 not caused by input prints RED with its value and the
 * shifted nodes; a shift means someone did not reserve space.
 *
 * ON automatically on localhost and development builds, in production for an admin with debug mode
 * on (from the next load), and for anyone with `?trace=load`; `?trace=off` silences it
 * (loadTraceFlag.ts). Off, it costs one localStorage read. `window.__matrxLoadTrace()` returns the
 * same report as data (the `pnpm check:smoke` guard reads it).
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

export type LoadTraceKind =
  | "nav"
  | "net"
  | "paint"
  | "mark"
  | "core"
  | "heavy"
  | "lazy"
  | "shift"
  | "stall"
  | "engage"
  | "settle";

export interface LoadTraceEvent {
  at: number;
  kind: LoadTraceKind;
  name: string;
  ms?: number;
  detail?: string;
  /** Layout shift value. */
  value?: number;
}

export interface LoadTraceViolation {
  kind: "heavy-before-engagement" | "lazy-before-settle" | "shift";
  name: string;
  at: number;
  detail?: string;
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
let installed = false;
const seenOnce = new Set<string>();

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    return `${host}${u.pathname}${u.search ? u.search.slice(0, 60) : ""}`;
  } catch {
    return url;
  }
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

const STYLE = {
  plain: "color:inherit",
  net: "color:#2563eb",
  milestone: "color:#16a34a;font-weight:bold",
  core: "color:#0891b2",
  grey: "color:#9ca3af",
  green: "color:#16a34a",
  amber: "color:#d97706;font-weight:bold",
  red: "color:#fff;background:#dc2626;font-weight:bold;padding:0 4px",
  stall: "color:#dc2626",
};

/** The one line for an event, classified against what is known now. */
function line(e: LoadTraceEvent): { text: string; style: string } {
  const ms = e.ms !== undefined ? ` (${e.ms}ms)` : "";
  const detail = e.detail ? ` · ${e.detail}` : "";
  switch (e.kind) {
    case "heavy":
      if (engagedAt === null || e.at < engagedAt)
        return { text: `🔴 HEAVY LOADED BEFORE ENGAGEMENT: ${e.name} (+${e.at}ms)`, style: STYLE.red };
      return { text: `${e.name} loaded (+${e.at - engagedAt}ms after ${engagedBy})`, style: STYLE.grey };
    case "lazy":
      if (settledAt === null || e.at < settledAt) {
        if (engagedAt !== null && e.at >= engagedAt)
          return { text: `LAZY RAN BEFORE SETTLE (after your ${engagedBy}): ${e.name}`, style: STYLE.amber };
        return { text: `🔴 LAZY RAN BEFORE SETTLE: ${e.name} (+${e.at}ms${settledAt !== null ? `, settled at +${settledAt}ms` : ""})`, style: STYLE.red };
      }
      return { text: `lazy ${e.name} (+${e.at - settledAt}ms after settle)`, style: STYLE.green };
    case "core":
      return { text: `core ${e.name}${detail}`, style: STYLE.core };
    case "shift":
      return {
        text: `🔴 LAYOUT SHIFT ${e.value?.toFixed(4)} ${settledAt === null || e.at < settledAt ? "before" : "after"} settle · CLS ${e.detail}`,
        style: STYLE.red,
      };
    case "net":
      return { text: `NET ${e.name}${ms}`, style: STYLE.net };
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

function print(e: LoadTraceEvent): void {
  const { text, style } = line(e);
  out.log(`%c[load] +${String(e.at).padStart(6)}ms  ${text}`, style);
}

function push(event: LoadTraceEvent): void {
  events.push(event);
  if (printedLive) print(event);
}

function observe(type: string, onEntry: (entry: PerformanceEntry) => void): void {
  try {
    new PerformanceObserver((list) => list.getEntries().forEach(onEntry)).observe({ type, buffered: true });
  } catch {
    /* this browser does not report this entry type */
  }
}

function isScript(entry: PerformanceResourceTiming): boolean {
  return entry.initiatorType === "script" || /\.m?js(\?|$)/.test(entry.name);
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
  const kb = (n: number) => Math.round(n / 1024);
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
    requests: events.filter((e) => e.kind === "net"),
    events: [...events].sort((a, b) => a.at - b.at),
  };
}

function printTimelineAndSummary(): void {
  const report = loadTraceReport();
  for (const e of report.events) print(e);
  printedLive = true;
  const heavy = report.violations.filter((v) => v.kind === "heavy-before-engagement").length;
  const lazy = report.violations.filter((v) => v.kind === "lazy-before-settle").length;
  const shifts = report.violations.filter((v) => v.kind === "shift").length;
  const smoke = heavy + lazy + shifts;
  out.log(
    `%c[load] SUMMARY ${report.route} · settled +${report.settledAt}ms · ${report.requests.length} requests · ${report.scripts.count} scripts ${report.scripts.wireKB} KB wire / ${report.scripts.unpackedKB} KB unpacked · TTFB ${report.ttfb ?? "?"}ms · FCP ${report.fcp ?? "?"}ms · LCP ${report.lcp ? `${report.lcp.at}ms ${report.lcp.element}` : "?"} · CLS ${report.cls} · smoke ${smoke ? `🔴 ${heavy} heavy, ${lazy} lazy, ${shifts} shifts` : "clean"}`,
    smoke ? STYLE.red : STYLE.milestone,
  );
  out.groupCollapsed("[load] biggest scripts");
  out.table(report.scripts.biggest);
  out.groupEnd();
}

function markKind(name: string): { kind: LoadTraceKind; label: string } {
  const [head, ...rest] = name.split(":");
  const label = rest.join(":");
  if (head === "heavy" || head === "lazy" || head === "core") return { kind: head, label: label || head };
  if (head === "module") return { kind: "core", label };
  return { kind: "mark", label: name };
}

/** Called once from instrumentation-client.ts. Does nothing unless the trace is on. */
export function installLoadTrace(): void {
  if (installed || typeof window === "undefined" || !loadTraceEnabled()) return;
  installed = true;
  try {
    performance.setResourceTimingBufferSize(10_000);
  } catch {
    /* older browser */
  }
  (window as unknown as { __matrxLoadTrace: () => LoadTraceReport }).__matrxLoadTrace = loadTraceReport;
  out.log("%c[load] trace ON — timeline prints when the page settles (?trace=off to silence)", STYLE.milestone);

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

  observe("resource", (entry) => {
    const r = entry as PerformanceResourceTiming;
    if (r.initiatorType !== "fetch" && r.initiatorType !== "xmlhttprequest") return;
    push({ at: Math.round(r.startTime), kind: "net", name: shortUrl(r.name), ms: Math.round(r.duration) });
  });
  observe("mark", (entry) => {
    if (!entry.name.startsWith("load:")) return;
    const parsed = markKind(entry.name.slice("load:".length));
    let { kind, label } = parsed;
    // A heavy thing on its own HOME route (the PDF studio on /pdf, the notes editor on /notes) is
    // what that page shows: `performance.mark("load:heavy:X", { detail: { home: ["/notes"] } })`.
    const home = (entry as PerformanceMark).detail?.home as string[] | undefined;
    const path = window.location.pathname;
    // A home entry is a path prefix, or a pattern when it starts with "^" ("^/chat/(?!new)").
    if (kind === "heavy" && home?.some((h) => (h.startsWith("^") ? new RegExp(h).test(path) : path.startsWith(h)))) {
      kind = "core";
      label = `${label} (home route)`;
    }
    // A component's first-render marker fires per mount; heavy/core say "arrived" once.
    if (kind === "heavy" || kind === "core") {
      if (seenOnce.has(entry.name)) return;
      seenOnce.add(entry.name);
    }
    push({ at: Math.round(entry.startTime), kind, name: label });
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
    const at = Math.round(entry.startTime);
    if (settledAt === null || at < settledAt) clsBeforeSettle += shift.value;
    if (shift.value <= SHIFT_MIN) return;
    const nodes = (shift.sources ?? []).map((s) => nodePath(s.node)).slice(0, 4).join(" | ");
    push({ at, kind: "shift", name: "layout shift", value: shift.value, detail: `${cls.toFixed(4)} · ${nodes}` });
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
    settledAt = Math.round(performance.now());
    push({ at: settledAt, kind: "settle", name: "PAGE SETTLED" });
    printTimelineAndSummary();
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
  installed = false;
  seenOnce.clear();
}

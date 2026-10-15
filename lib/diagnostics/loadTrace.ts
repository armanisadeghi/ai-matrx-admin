/**
 * loadTrace.ts — ONE ORDERED TIMELINE OF A PAGE LOAD, IN THE CONSOLE.
 *
 * The load law (loadLedger.ts) says a page fetches only what it shows. This makes the whole load
 * visible in order, on one clock (ms since navigation start):
 *
 *   NET     every fetch / XHR the page made (Supabase, our Python server, Next server actions, …)
 *   MODULE  every "big thing arrived" announcement — any module, in this app OR an @ai-matrx
 *           package, announces itself with the native `performance.mark("load:module:<name>")`
 *           (no import, so announcing costs the build nothing)
 *   MARK    milestones: first paint, first contentful paint, largest paint, load event, settled,
 *           and any `performance.mark("load:<name>")` a surface sets (e.g. "chat input ready")
 *   STALL   main-thread blocks over 100ms (long animation frames / long tasks)
 *
 * Off by default and free when off. Turn on in the browser with `?trace=load` (remembered in this
 * browser; `?trace=off` clears it). When on, each event prints live as it happens, and once the page
 * settles a summary prints: script chunks (count, KB over the wire, KB unpacked, the biggest), every
 * request in order, every mark. `window.__matrxLoadTrace()` returns the same report as data, so an
 * agent driving a browser reads it without scraping the console.
 */

import { whenPageIdle } from "@ai-matrx/kit/idle-scheduler";

const FLAG_KEY = "matrx:load-trace";
const SETTLE_CAP_MS = 15_000;
const STALL_MS = 100;

export interface LoadTraceEvent {
  at: number;
  kind: "net" | "module" | "mark" | "stall";
  name: string;
  ms?: number;
  detail?: string;
}

export interface LoadTraceReport {
  route: string;
  settledAt: number | null;
  scripts: { count: number; wireKB: number; unpackedKB: number; biggest: { file: string; wireKB: number; unpackedKB: number; at: number }[] };
  css: { count: number; wireKB: number };
  requests: LoadTraceEvent[];
  events: LoadTraceEvent[];
}

let events: LoadTraceEvent[] = [];
let settledAt: number | null = null;
let installed = false;

function enabled(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get("trace");
    if (param === "load") window.localStorage.setItem(FLAG_KEY, "1");
    if (param === "off") window.localStorage.removeItem(FLAG_KEY);
    return window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    return `${host}${u.pathname}${u.search ? u.search.slice(0, 60) : ""}`;
  } catch {
    return url;
  }
}

const KIND_STYLE: Record<LoadTraceEvent["kind"], string> = {
  net: "color:#2563eb",
  module: "color:#9333ea;font-weight:bold",
  mark: "color:#16a34a;font-weight:bold",
  stall: "color:#dc2626;font-weight:bold",
};

function push(event: LoadTraceEvent): void {
  events.push(event);
  const ms = event.ms !== undefined ? ` (${event.ms}ms)` : "";
  console.info(
    `%c[load +${event.at}ms] ${event.kind.toUpperCase()} ${event.name}${ms}${event.detail ? ` · ${event.detail}` : ""}`,
    KIND_STYLE[event.kind],
  );
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

export function loadTraceReport(): LoadTraceReport {
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const scripts = resources.filter(isScript);
  const css = resources.filter((r) => /\.css(\?|$)/.test(r.name));
  const kb = (n: number) => Math.round(n / 1024);
  return {
    route: window.location.pathname,
    settledAt,
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

function printSummary(): void {
  const report = loadTraceReport();
  console.groupCollapsed(
    `%c[load] SETTLED at +${report.settledAt}ms on ${report.route} · ${report.scripts.count} scripts (${report.scripts.wireKB} KB wire / ${report.scripts.unpackedKB} KB unpacked) · ${report.requests.length} requests`,
    "color:#16a34a;font-weight:bold",
  );
  console.table(report.scripts.biggest);
  console.table(report.requests.map((r) => ({ at: r.at, ms: r.ms, request: r.name })));
  console.table(report.events.filter((e) => e.kind !== "net").map((e) => ({ at: e.at, kind: e.kind, name: e.name, ms: e.ms })));
  console.groupEnd();
}

/** Called once from instrumentation-client.ts. Does nothing unless the trace is on. */
export function installLoadTrace(): void {
  if (installed || typeof window === "undefined" || !enabled()) return;
  installed = true;
  try {
    performance.setResourceTimingBufferSize(10_000);
  } catch {
    /* older browser */
  }
  (window as unknown as { __matrxLoadTrace: () => LoadTraceReport }).__matrxLoadTrace = loadTraceReport;
  console.info("%c[load] trace ON (?trace=off to stop)", "color:#16a34a;font-weight:bold");

  observe("resource", (entry) => {
    const r = entry as PerformanceResourceTiming;
    if (r.initiatorType !== "fetch" && r.initiatorType !== "xmlhttprequest") return;
    push({ at: Math.round(r.startTime), kind: "net", name: shortUrl(r.name), ms: Math.round(r.duration) });
  });
  observe("mark", (entry) => {
    if (!entry.name.startsWith("load:")) return;
    const name = entry.name.slice("load:".length);
    const isModule = name.startsWith("module:");
    push({ at: Math.round(entry.startTime), kind: isModule ? "module" : "mark", name: isModule ? name.slice("module:".length) : name });
  });
  observe("paint", (entry) => push({ at: Math.round(entry.startTime), kind: "mark", name: entry.name }));
  observe("largest-contentful-paint", (entry) =>
    push({ at: Math.round(entry.startTime), kind: "mark", name: "largest-contentful-paint", detail: (entry as unknown as { element?: Element }).element?.tagName?.toLowerCase() }),
  );
  observe("long-animation-frame", (entry) => {
    if (entry.duration < STALL_MS) return;
    const scripts = (entry as unknown as { scripts?: { sourceURL?: string; sourceFunctionName?: string; duration: number }[] }).scripts ?? [];
    const worst = [...scripts].sort((a, b) => b.duration - a.duration)[0];
    push({
      at: Math.round(entry.startTime),
      kind: "stall",
      name: "main thread blocked",
      ms: Math.round(entry.duration),
      detail: worst ? `${worst.sourceFunctionName || "(anonymous)"} · ${(worst.sourceURL ?? "").split("/").pop()}` : undefined,
    });
  });

  window.addEventListener("load", () => push({ at: Math.round(performance.now()), kind: "mark", name: "window load" }), { once: true });
  const settle = () => {
    if (settledAt !== null) return;
    settledAt = Math.round(performance.now());
    push({ at: settledAt, kind: "mark", name: "settled" });
    printSummary();
  };
  void whenPageIdle().then(settle);
  window.setTimeout(settle, SETTLE_CAP_MS);
}

/** For tests. */
export function resetLoadTraceForTests(): void {
  events = [];
  settledAt = null;
  installed = false;
}

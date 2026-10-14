/**
 * loadLedger.ts — WHAT EVERY PAGE LOAD ASKED THE DATABASE FOR, AND WHEN.
 *
 * THE LOAD LAW (Arman, 2026-10-13): a page fetches only what it shows, and nothing it does not need
 * for its first paint leaves before that paint is done. Background counts (a badge, a toast) wait
 * until the page has fully settled; everything else is fetched by the thing that shows it, when it
 * shows it — like the Agents menu, which reads nothing until it is opened.
 *
 * This is how anyone SEES that law hold. Every browser Supabase call passes through ONE proxy
 * (`supabaseErrorCapture.ts`); it calls `recordLoadCall` as the request leaves, so this ledger holds
 * every `.from()` / `.rpc()` with the route it fired on, how long after that route started, and the
 * PHASE of the page at that moment:
 *
 *   first-paint — before the document's load event
 *   settling    — after load, before the page's idle flush (`@ai-matrx/kit/idle-scheduler`)
 *   settled     — after the idle flush (where background counts belong)
 *
 * A client-side navigation starts a new load (history push/replace/pop). The caller's stack is kept
 * as an unformatted Error and only formatted when an admin opens the row, so recording costs a
 * push into a fixed ring. Read by the Builder window's "Page load" tab.
 */

import { whenPageIdle } from "@ai-matrx/kit/idle-scheduler";

export type LoadPhase = "first-paint" | "settling" | "settled";

export interface LoadCall {
  seq: number;
  /** Which page load this call belongs to (increments per navigation). */
  load: number;
  route: string;
  /** Milliseconds after this load started. */
  at: number;
  phase: LoadPhase;
  schema: string;
  relation: string;
  operation: string;
  /** Unformatted until read — `callerFrames(call)`. */
  caller: Error;
}

export interface LoadInfo {
  load: number;
  route: string;
  /** performance.now() when the load started. */
  startedAt: number;
  /** ms after start when the page settled (idle flush), or null while it has not. */
  settledAt: number | null;
}

const MAX_CALLS = 800;

let seq = 0;
let calls: LoadCall[] = [];
let current: LoadInfo | null = null;
let loads: LoadInfo[] = [];
let installed = false;
const listeners = new Set<() => void>();
let notifyQueued = false;

function notify(): void {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    for (const listener of listeners) listener();
  });
}

function startLoad(fromNavigation: boolean): void {
  const info: LoadInfo = {
    load: (current?.load ?? 0) + 1,
    route: window.location.pathname,
    startedAt: fromNavigation ? performance.now() : 0,
    settledAt: null,
  };
  current = info;
  loads = [...loads, info].slice(-20);
  // The first load settles at the shell's idle flush; a client navigation has no flush of its own,
  // so it settles at the browser's first idle moment after it.
  const settled: Promise<boolean> = fromNavigation
    ? new Promise((resolve) => {
        const idle = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
          .requestIdleCallback;
        if (idle) idle(() => resolve(true), { timeout: 5_000 });
        else setTimeout(() => resolve(true), 1_000);
      })
    : whenPageIdle();
  void settled.then((idle) => {
    if (!idle || current !== info) return;
    info.settledAt = performance.now() - info.startedAt;
    loads = [...loads];
    notify();
  });
  notify();
}

function install(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  startLoad(false);
  const wrap = (method: "pushState" | "replaceState") => {
    const original = window.history[method].bind(window.history);
    window.history[method] = (...args: Parameters<History["pushState"]>) => {
      const before = window.location.pathname;
      original(...args);
      if (window.location.pathname !== before) startLoad(true);
    };
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", () => {
    if (window.location.pathname !== current?.route) startLoad(true);
  });
}

function phaseNow(info: LoadInfo): LoadPhase {
  if (info.load === 1 && document.readyState !== "complete") return "first-paint";
  return info.settledAt === null ? "settling" : "settled";
}

/** Called by the Supabase proxy as each request leaves. Browser only; never throws. */
export function recordLoadCall(input: {
  schema?: string;
  relation?: string;
  operation?: string;
  caller: Error;
}): void {
  try {
    if (typeof window === "undefined") return;
    install();
    const info = current;
    if (!info) return;
    calls.push({
      seq: ++seq,
      load: info.load,
      route: info.route,
      at: Math.round(performance.now() - info.startedAt),
      phase: phaseNow(info),
      schema: input.schema ?? "public",
      relation: input.relation ?? "?",
      operation: input.operation ?? "select",
      caller: input.caller,
    });
    if (calls.length > MAX_CALLS) calls = calls.slice(-MAX_CALLS);
    else calls = [...calls];
    notify();
  } catch {
    /* a diagnostic must never break a request */
  }
}

export function subscribeLoadLedger(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLoadCalls(): LoadCall[] {
  return calls;
}

export function getLoads(): LoadInfo[] {
  return loads;
}

const FRAMEWORK = /node_modules\/(react|react-dom|next|scheduler|@supabase)|\/_next\/static\/chunks\/(framework|main|webpack)|loadLedger|supabaseErrorCapture|<anonymous>/;

/** `at fn (https://host/_next/static/chunks/a/b/file.js:1:2)` → `fn · file.js:1`. */
function shortFrame(line: string): string {
  const match = /^at (?:async )?(.*?) \((.*)\)$/.exec(line) ?? /^at (?:async )?()(.*)$/.exec(line);
  if (!match) return line;
  const fn = match[1] || "(anonymous)";
  const where = (match[2] ?? "").replace(/\?[^:]*/, "");
  const file = /([^/]+?):(\d+):\d+$/.exec(where);
  return file ? `${fn} · ${file[1]}:${file[2]}` : fn;
}

/** The caller's stack, app frames first, shortened. Formats the stack (the expensive part) on demand only. */
export function callerFrames(call: LoadCall): string[] {
  const lines = (call.caller.stack ?? "").split("\n").slice(1).map((line) => line.trim());
  const app = lines.filter((line) => line && !FRAMEWORK.test(line));
  return (app.length ? app : lines).map(shortFrame);
}

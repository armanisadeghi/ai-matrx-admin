/**
 * loadMark.ts — "this piece RENDERED", for the page-load trace (loadTrace.ts). NO imports: any
 * component may call it without adding a build-graph edge.
 *
 *   useLoadMark("Sidebar")             → `+1234ms  RENDERED  Sidebar (12ms)` in the load timeline
 *   useLoadMark("PDF viewer", "heavy") → RED "BEFORE ENGAGEMENT" when it renders before the first
 *                                        trusted click/key/touch (loadTrace.ts has the rules)
 *
 * Call it at the top of a CLIENT component body. It is not a React hook (it uses no React state),
 * so it costs one global read when the trace is off. The first render of a name records the start;
 * the next animation frame (the frame that paints what React committed) writes
 * `performance.mark("load:<kind>:<name>", { detail: { ms } })` — `ms` is render start → painted.
 * Only the first render of each name per page load counts.
 *
 * A SERVER component cannot call it (it never runs in the browser) — render `<LoadMark name="…" />`
 * (LoadMarkIsland.tsx) inside it instead; that line says "server HTML, hydrated".
 *
 * Inside an @ai-matrx package (which cannot import this file) write the one-line equivalent at the
 * top of the component body:
 *   if (typeof window !== "undefined" && (globalThis as { __matrxLoadTraceOn?: boolean }).__matrxLoadTraceOn
 *     && !performance.getEntriesByName("load:render:Chat dock").length) performance.mark("load:render:Chat dock");
 */

export type LoadMarkKind = "render" | "heavy" | "core" | "lazy";

/** Set to true by installLoadTrace() before anything renders; absent when the trace is off. */
export function loadTraceIsOn(): boolean {
  return typeof window !== "undefined" && (globalThis as { __matrxLoadTraceOn?: boolean }).__matrxLoadTraceOn === true;
}

const started = new Set<string>();

/** Mark that `name` rendered (first render per page load). No-op unless the trace is on. */
export function useLoadMark(name: string, kind: LoadMarkKind = "render", extra?: Record<string, unknown>): void {
  if (!loadTraceIsOn()) return;
  const key = `${kind}:${name}`;
  if (started.has(key)) return;
  started.add(key);
  const t0 = performance.now();
  const write = () => {
    try {
      performance.mark(`load:${key}`, { detail: { ms: Math.round(performance.now() - t0), ...extra } });
    } catch {
      /* a browser without mark detail — the trace simply misses this line */
    }
  };
  // A hidden tab never runs animation frames; the line must still arrive.
  if (document.visibilityState === "hidden" || typeof requestAnimationFrame !== "function") setTimeout(write, 0);
  else requestAnimationFrame(write);
}

/** For tests. */
export function resetLoadMarksForTests(): void {
  started.clear();
}

/** The same mark under a non-hook name, for a conditional call (`if (open) markRendered("Command palette")`). */
export const markRendered = useLoadMark;

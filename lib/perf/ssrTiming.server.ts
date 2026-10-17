// lib/perf/ssrTiming.server.ts — one log line per signed-in shell render saying where the time
// before the first byte went (the reads a layout awaits), and whether this instance was cold.
//
// Why it exists: a signed-in /chat/new measured 3.3 s to first byte in production while the same
// page signed out answered in ~0.2 s, and nothing on the server said which await (or a cold start)
// was spending it. Production logs a line only when the wait is worth reading (slow, or the first
// renders of a fresh instance); development logs every render. `console.warn`, because the
// production build strips `console.log`/`info` (next.config.js `removeConsole`). Read them with
// `vercel logs --environment production --query "ssr-timing"`.

import "server-only";

/** When this module was first evaluated: the instance's start, near enough to call a cold start. */
const INSTANCE_STARTED_AT = Date.now();
let rendersOnThisInstance = 0;

/** Production logs a render whose awaits took at least this long… */
export const SSR_TIMING_SLOW_MS = 250;
/** …and the first few renders of every instance, so cold starts are always visible. */
const LOGGED_RENDERS_PER_INSTANCE = 3;

export interface SsrTiming {
  /** Times one awaited step; the result passes through untouched. */
  step<T>(name: string, run: PromiseLike<T>): Promise<T>;
  /** Writes the line (or not, per the thresholds above). Call once, after the last await. */
  end(extra?: Record<string, string | number | boolean | null>): void;
}

export function startSsrTiming(scope: string, path: string): SsrTiming {
  const started = performance.now();
  const steps: string[] = [];
  const render = ++rendersOnThisInstance;
  const instanceAgeMs = Date.now() - INSTANCE_STARTED_AT;
  return {
    async step<T>(name: string, run: PromiseLike<T>): Promise<T> {
      const at = performance.now();
      try {
        return await run;
      } finally {
        steps.push(`${name}=${Math.round(performance.now() - at)}`);
      }
    },
    end(extra = {}) {
      const totalMs = Math.round(performance.now() - started);
      const worth =
        process.env.NODE_ENV === "development" ||
        totalMs >= SSR_TIMING_SLOW_MS ||
        render <= LOGGED_RENDERS_PER_INSTANCE;
      if (!worth) return;
      const tail = Object.entries(extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
      console.warn(
        `[ssr-timing] ${scope} ${path} awaited=${totalMs}ms ${steps.join(" ")} ` +
          `render#${render} instanceAge=${Math.round(instanceAgeMs / 1000)}s${tail ? ` ${tail}` : ""}`,
      );
    },
  };
}

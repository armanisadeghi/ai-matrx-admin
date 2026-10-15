/**
 * Run reads that ride through a server restart (THE RECONNECT CONTRACT, common-docs
 * systems/architecture/runtime-continuity/FEATURE.md: runtime following tolerates ~three minutes of failures).
 *
 * A release replaces the server; for a moment its gateway answers 502/503/504 (no CORS headers, so the browser
 * reports "Failed to fetch") or nothing at all. MKT-089: a Smart Add page opened in that moment showed four 502s in
 * the error badge and, when the attach read was the one that failed, "We could not read this run" for good — the
 * attach read tried once. Now:
 *
 * - `isRestartFailure` says which failures are a restart (network failure, timeout, 502/503/504), never a refusal.
 * - `readThroughRestart` retries a read through such failures with backoff, for the window, then gives up loudly.
 * - `restartQuietCapture` decides whether a failed read enters the error badge: a refusal always does; a restart
 *   failure only once it has lasted longer than the window (a real outage is never silent).
 *
 * Pure but for the injected clock and sleep.
 */

/** How long a run read keeps trying through a restart before it says the run could not be read. */
export const RESTART_WINDOW_MS = 180_000;
const FIRST_DELAY_MS = 1_000;
const MAX_DELAY_MS = 10_000;

/** A failed read that a restarting server explains: no answer, a timeout, or a gateway 502/503/504. */
export function isRestartFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch failed: a gateway answer without CORS headers, or no answer
  if (typeof error !== "object" || error === null) return false;
  const e = error as { status?: unknown; code?: unknown; name?: unknown };
  if (e.name === "AbortError") return false; // the caller let go
  if (e.name === "TimeoutError" || e.code === "request_timeout") return true;
  return e.status === 502 || e.status === 503 || e.status === 504;
}

export interface ReadThroughRestartOptions {
  /** The caller let go: stop retrying and rethrow the last failure. */
  isStopped?: () => boolean;
  windowMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** `read()` until it answers; a restart failure is retried (1 s, 2 s, 4 s … 10 s) for the window, anything else throws. */
export async function readThroughRestart<T>(read: () => Promise<T>, opts: ReadThroughRestartOptions = {}): Promise<T> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? realSleep;
  const windowMs = opts.windowMs ?? RESTART_WINDOW_MS;
  const started = now();
  let delay = FIRST_DELAY_MS;
  for (;;) {
    try {
      return await read();
    } catch (error) {
      if (!isRestartFailure(error) || opts.isStopped?.() || now() - started + delay > windowMs) throw error;
      await sleep(delay);
      delay = Math.min(delay * 2, MAX_DELAY_MS);
      if (opts.isStopped?.()) throw error;
    }
  }
}

/**
 * One reader's failure clock: `failed(error)` says whether this failure belongs in the error badge; `answered()` resets
 * the clock. A refusal always does; restart failures only after they have lasted the whole window.
 */
export function restartQuietCapture(opts: { windowMs?: number; now?: () => number } = {}) {
  const now = opts.now ?? Date.now;
  const windowMs = opts.windowMs ?? RESTART_WINDOW_MS;
  let failingSince: number | null = null;
  return {
    answered(): void {
      failingSince = null;
    },
    failed(error: unknown): boolean {
      if (!isRestartFailure(error)) return true;
      failingSince ??= now();
      return now() - failingSince >= windowMs;
    },
  };
}

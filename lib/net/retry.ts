/**
 * withRetry — exponential backoff retry for idempotent operations.
 *
 * IMPORTANT: only wrap operations that are safe to repeat (GETs, cache
 * lookups, agent-definition fetches). Never wrap user-authored submissions —
 * the recovery UX handles those via explicit user-initiated retry.
 */

import { isNetError, NetError } from "./errors";

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Initial delay ms before the first retry. Default 250. */
  initialDelayMs?: number;
  /** Max delay ms cap between retries. Default 4_000. */
  maxDelayMs?: number;
  /** Multiplier applied after each failure. Default 2. */
  backoffFactor?: number;
  /** Jitter factor 0-1 applied to each delay. Default 0.25. */
  jitter?: number;
  /** Predicate deciding whether a given error should trigger a retry. Default: NetError.retryable. */
  retryOn?: (err: unknown) => boolean;
  /** Caller-provided signal. If aborted, no further retries are attempted. */
  signal?: AbortSignal;
  /** Fires before each retry; useful for logging/telemetry. */
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
}

function defaultRetryOn(err: unknown): boolean {
  return isNetError(err) && (err as NetError).retryable;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve();
      if (signal) signal.removeEventListener("abort", onAbort);
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("Aborted"));
    };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(signal.reason);
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
  });
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const initialDelayMs = opts.initialDelayMs ?? 250;
  const maxDelayMs = opts.maxDelayMs ?? 4_000;
  const factor = opts.backoffFactor ?? 2;
  const jitter = Math.max(0, Math.min(1, opts.jitter ?? 0.25));
  const retryOn = opts.retryOn ?? defaultRetryOn;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason;
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !retryOn(err)) throw err;

      const base = Math.min(
        maxDelayMs,
        initialDelayMs * Math.pow(factor, attempt - 1),
      );
      const jitterAmount = base * jitter * (Math.random() * 2 - 1);
      const delayMs = Math.max(0, Math.round(base + jitterAmount));
      opts.onRetry?.(attempt, err, delayMs);
      await sleep(delayMs, opts.signal);
    }
  }

  // Unreachable — the loop always either returns or throws.
  throw lastErr;
}

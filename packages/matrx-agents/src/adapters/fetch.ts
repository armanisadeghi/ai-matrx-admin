/**
 * FetchLike — the subset of the Fetch API the package uses for stream
 * requests (NDJSON, SSE-like).
 *
 * Consumers pass in either `globalThis.fetch` (browser / RN / Node 18+) or
 * a wrapped version that injects auth headers, retries, etc. The package
 * never reaches for a global; it reads this adapter from the config
 * registry at dispatch time.
 */

export type FetchLike = (
  input: string | URL,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<Response>;

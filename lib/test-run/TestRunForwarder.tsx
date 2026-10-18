"use client";

// lib/test-run/TestRunForwarder.tsx
//
// The browser half of the test stamp (./marker.ts). While this host carries the
// `matrx_test_run` cookie (set only by `pnpm dev-login`), every request leaves with
// `X-Matrx-Test-Run`: to this app's own routes, to the database (supabase-js resolves the
// global fetch per call), and to any other origin that accepts the header (probed once,
// like the agent-traffic forwarder — an origin that refuses it gets no header, never a
// failed request).
//
// Inert for everyone else: with no cookie, fetch is never touched.

import { MATRX_TEST_RUN, testRunFromCookieHeader } from "./marker";

const probes = new Map<string, Promise<boolean>>();
const PROBE_TIMEOUT_MS = 3000;
let installed = false;

function runId(): string | null {
  try {
    return testRunFromCookieHeader(document.cookie);
  } catch {
    return null;
  }
}

function databaseOrigin(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

function originAccepts(original: typeof fetch, origin: string, value: string): Promise<boolean> {
  let probe = probes.get(origin);
  if (!probe) {
    probe = original(`${origin}/health`, {
      method: "GET",
      cache: "no-store",
      headers: { [MATRX_TEST_RUN.header]: value },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    }).then(
      () => true,
      (error: unknown) => {
        if (error instanceof DOMException && error.name === "TimeoutError") {
          probes.delete(origin);
          return false;
        }
        console.warn(
          `[test-run] ${origin} refused the ${MATRX_TEST_RUN.header} header (CORS); ` +
            "rows created there in this test session are not stamped.",
        );
        return false;
      },
    );
    probes.set(origin, probe);
  }
  return probe;
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return new URL(raw, window.location.href);
  } catch {
    return null;
  }
}

export function installTestRunForwarder(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  const dbOrigin = databaseOrigin();
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const value = runId();
    if (!value) return original(input, init);
    const url = requestUrl(input);
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return original(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (headers.has(MATRX_TEST_RUN.header)) return original(input, init);
    const trusted = url.origin === window.location.origin || url.origin === dbOrigin;
    if (!trusted && !(await originAccepts(original, url.origin, value))) return original(input, init);
    headers.set(MATRX_TEST_RUN.header, value);
    if (input instanceof Request && !init) return original(new Request(input, { headers }));
    return original(input, { ...init, headers });
  };
}

installTestRunForwarder();

/** Mounted once in the root layout so this module loads on every route. */
export function TestRunForwarder(): null {
  return null;
}

// utils/supabase/testRun.ts — puts a test session's run id on every PostgREST request of a
// server-side supabase client (the browser is covered by lib/test-run/TestRunForwarder.tsx).
// Same transport seam as ./adminLane.ts. A null run id leaves the client untouched.

import { MATRX_TEST_RUN, isTestRunId } from "@/lib/test-run/marker";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const INSTALLED = Symbol.for("matrx.testRunInstalled");

interface RestCarrier {
  rest?: { fetch?: unknown; [INSTALLED]?: boolean };
}

export function testRunFetch(inner: FetchLike, runId: string): FetchLike {
  return (input, init) => {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(MATRX_TEST_RUN.header, runId);
    return inner(input, { ...init, headers });
  };
}

export function installTestRun<T>(client: T, runId: string | null): T {
  if (!isTestRunId(runId)) return client;
  const rest = (client as RestCarrier | null)?.rest;
  if (!rest || typeof rest.fetch !== "function" || rest[INSTALLED]) return client;
  rest.fetch = testRunFetch(rest.fetch as FetchLike, runId);
  rest[INSTALLED] = true;
  return client;
}

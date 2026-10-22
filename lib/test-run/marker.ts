// lib/test-run/marker.ts
//
// THE TEST STAMP — every row a TEST session creates carries that session's run id, so it can be
// archived later (platform.archive_test_run) instead of piling up as junk on the one live database.
//
// How it flows: `pnpm dev-login` mints a run id and the dev-login route stores it in the
// `matrx_test_run` cookie on the agent's own preview host. While that cookie is present, every
// request this browser makes to the database, to this app's own routes and to the Python server
// carries `X-Matrx-Test-Run` (./TestRunForwarder.tsx; utils/supabase/server.ts for server-rendered
// reads/writes). In Postgres, platform._stamp_test_run() stamps test_run_id + test_expires_at on
// every insert. A person's ordinary session has no cookie, sends no header, and is never stamped.
//
// Twin: aidream `aidream/services/runtime/test_run.py` (same header names). Persona factory:
// scripts/lib/persona.mjs (tag.test_run_id + the cookie in fixtureSessionCookies). Contract:
// common-docs/systems/architecture/database/data-lifecycle/projects/junk-data-cleanup/HANDOFF.md § 4 step 2.
//
// Plain erasable TypeScript with no imports, so Node scripts can import it directly.

import { isUuidShape } from "@ai-matrx/kit/uuid";
export const MATRX_TEST_RUN = {
  /** Request header PostgREST and the Python server read. */
  header: "X-Matrx-Test-Run",
  /** Optional: `on` marks the rows permanent baseline (stamped, never expire). */
  baselineHeader: "X-Matrx-Test-Baseline",
  /** First-party cookie the dev-login route sets on the agent's preview host. */
  cookie: "matrx_test_run",
  /** Cookie lifetime: one day; a test session older than that starts a new run. */
  cookieMaxAgeSeconds: 60 * 60 * 24,
} as const;


/** True for a well-formed run id (a uuid). Anything else is ignored, never sent. */
export function isTestRunId(value: string | null | undefined): value is string {
  return typeof value === "string" && isUuidShape(value.trim());
}

/** Reads the run id from a `Cookie` header string (no framework needed). */
export function testRunFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === MATRX_TEST_RUN.cookie) {
      const value = decodeURIComponent(rest.join("=")).trim();
      return isTestRunId(value) ? value.toLowerCase() : null;
    }
  }
  return null;
}

/** `{ "X-Matrx-Test-Run": <id> }` — or `{}` when there is no valid run id. */
export function testRunHeaders(runId: string | null | undefined): Record<string, string> {
  return isTestRunId(runId) ? { [MATRX_TEST_RUN.header]: runId.trim().toLowerCase() } : {};
}

/** The Set-Cookie value the dev-login route writes. Readable by the page (the forwarder reads it). */
export function testRunSetCookie(runId: string, secure: boolean): string {
  const parts = [
    `${MATRX_TEST_RUN.cookie}=${encodeURIComponent(runId.trim().toLowerCase())}`,
    "Path=/",
    `Max-Age=${MATRX_TEST_RUN.cookieMaxAgeSeconds}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

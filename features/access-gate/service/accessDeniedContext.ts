/**
 * accessDeniedContext — the client half of `public.access_denied_context`.
 *
 * ONE round trip answers everything the denied surface needs: what kind of
 * thing this is, what it's called, who owns it, which organization it lives in,
 * the nearest ancestor the caller CAN open, and the caller's own outstanding
 * request. Direct to Supabase — this is a plain DB read the browser is entitled
 * to make, so it never touches the Python server (CLAUDE.md § data flow).
 */
//
// The implementation is `@ai-matrx/data/access` (one copy for every app); this file only makes sure
// the app's client, pinned-key claims reader, organization-carrying fetch and website/page words are
// injected before it runs (see `@/features/access-gate/accessEnv`).

import * as access from "@ai-matrx/data/access";
import { ensureAccessEnv } from "@/features/access-gate/accessEnv";

export const fetchAccessDeniedContext: typeof access.fetchAccessDeniedContext = (
  ...args: Parameters<typeof access.fetchAccessDeniedContext>
) => {
  ensureAccessEnv();
  return access.fetchAccessDeniedContext(...args);
};
export const resolveAccessGateSlug: typeof access.resolveAccessGateSlug = (
  ...args: Parameters<typeof access.resolveAccessGateSlug>
) => {
  ensureAccessEnv();
  return access.resolveAccessGateSlug(...args);
};

/** The level a "Request access" click asks for by default. */
export const DEFAULT_REQUEST_LEVEL = access.DEFAULT_REQUEST_LEVEL;

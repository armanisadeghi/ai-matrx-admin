"use client";

// THE ADMIN ROSTER, fetched once per tab (users one-roof step 4, 2026-10-17; plan attack F7 step B).
//
// `GET /api/admin/users` lists EVERY account (up to 50 auth admin pages + 3 RPCs + profile paging).
// Accounts, Email, Usage limits, Organizations, the user-search window, knob overrides and the ⌘K
// people jump all need it; each used to fetch it on its own, so walking three admin pages cost three
// full roster reads. They all read it HERE: one in-flight promise shared by every caller, kept for
// ADMIN_ROSTER_MAX_AGE_MS (then the next reader refetches). A failed read is never kept (the next caller asks again).
//
// FRESHNESS. A screen that changed an account calls `invalidateAdminRoster()` (the next reader
// refetches), or `loadAdminRoster({ refresh: true })` when it wants the new roster now (Accounts'
// Refresh). Nothing here polls.

/** The route's whole answer — each caller reads (or zod-parses) the fields it needs. */
export interface AdminRosterPayload {
  users: unknown[];
  plans_error?: string | null;
  [key: string]: unknown;
}

/** How long a read roster is shared before the next reader asks the server again. */
export const ADMIN_ROSTER_MAX_AGE_MS = 60_000;

let inflight: Promise<AdminRosterPayload> | null = null;
let startedAt = 0;
let generation = 0;

async function readRoster(): Promise<AdminRosterPayload> {
  const response = await fetch("/api/admin/users", { cache: "no-store" });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const record = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof record.error === "string" ? record.error : `The people roster could not be read (HTTP ${response.status}).`,
    );
  }
  if (!Array.isArray(record.users)) throw new Error("The people roster answered without a users list.");
  return record as AdminRosterPayload;
}

/** The roster — shared by every caller in this tab. `refresh` drops what is held and reads again. */
export function loadAdminRoster(options: { refresh?: boolean } = {}): Promise<AdminRosterPayload> {
  if (options.refresh) invalidateAdminRoster();
  if (inflight && Date.now() - startedAt < ADMIN_ROSTER_MAX_AGE_MS) return inflight;
  const mine = ++generation;
  const pending = readRoster();
  inflight = pending;
  startedAt = Date.now();
  pending.catch(() => {
    // Never keep a failure: the next reader asks the server again.
    if (generation === mine) inflight = null;
  });
  return pending;
}

/** An account changed: the next reader fetches a fresh roster. */
export function invalidateAdminRoster(): void {
  inflight = null;
  generation += 1;
}

/**
 * Sign-up welcome — the background found search's state, read off the auth user the session already holds (the JWT
 * carries `user_metadata`, so this costs no read). Pure and tiny: the shell island imports only this, and loads the
 * search itself (foundSearchBackground.ts) only when there is something to do.
 */

import type { User } from "@supabase/supabase-js";

/** The window the found notice opens in place (welcomeFoundWindow's link key). */
export const FOUND_WINDOW_LINK_KEY = "welcome-found";
export const FOUND_WINDOW_LINK = `/dashboard?panels=${FOUND_WINDOW_LINK_KEY}`;

export interface FoundSearchState {
  startedAt: string | null;
  /** The latest round index started (-1: nothing to search with yet). */
  round: number;
  /** Every piece of information a round already searched with. */
  basis: string[];
  /** The latest round settled with nothing to show. */
  checkedAt: string | null;
  /** The notice went out: never again. */
  shownAt: string | null;
  /** A persona-factory account marked to skip it (`app_metadata.test_fixture.skip_found_search`). */
  skip: boolean;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function foundSearchState(user: Pick<User, "user_metadata" | "app_metadata">): FoundSearchState {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fixture = ((user.app_metadata ?? {}) as Record<string, unknown>).test_fixture as Record<string, unknown> | undefined;
  return {
    startedAt: str(m.found_search_started_at),
    round: typeof m.found_search_round === "number" ? m.found_search_round : 0,
    basis: Array.isArray(m.found_search_basis) ? m.found_search_basis.filter((k): k is string => typeof k === "string") : [],
    checkedAt: str(m.found_search_checked_at),
    shownAt: str(m.found_search_shown_at),
    skip: fixture?.skip_found_search === true,
  };
}

/** What the session alone says the person gave us: every name on the account and every linked sign-in. */
export function lightBasis(user: Pick<User, "user_metadata" | "identities">): string[] {
  const keys: string[] = [];
  const name = (v: unknown) => {
    const n = typeof v === "string" ? v.trim().replace(/\s+/g, " ").toLowerCase() : "";
    if (n) keys.push(`name:${n}`);
  };
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  name(m.full_name ?? m.name);
  for (const i of user.identities ?? []) {
    if (i.provider !== "email") keys.push(`identity:${i.provider}`);
    const d = (i.identity_data ?? {}) as Record<string, unknown>;
    name(d.full_name ?? d.name);
  }
  return [...new Set(keys)];
}

/**
 * Accounts made before the background search shipped never get it on their own (they already had the door; most are
 * test accounts): their way in stays /welcome?found=1. Only a new account is looked up on its first load.
 */
export const FOUND_SEARCH_ACCOUNTS_FROM = "2026-10-17T00:00:00Z";

export type FoundSearchNext = "start" | "watch" | "again" | null;

/** What this load should do: start the first round, watch the running one, try again with new info, or nothing. */
export function foundSearchNext(user: Pick<User, "user_metadata" | "app_metadata" | "identities" | "created_at">): FoundSearchNext {
  const s = foundSearchState(user);
  if (s.skip || s.shownAt) return null;
  if (!s.startedAt) return Date.parse(user.created_at) >= Date.parse(FOUND_SEARCH_ACCOUNTS_FROM) ? "start" : null;
  if (!s.checkedAt) return "watch";
  return lightBasis(user).some((k) => !s.basis.includes(k)) ? "again" : null;
}

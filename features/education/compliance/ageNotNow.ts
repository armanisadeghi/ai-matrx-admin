// features/education/compliance/ageNotNow.ts
//
// A person's "Not now" on the age question, kept on THEIR ACCOUNT (auth `user_metadata`, the same carrier the
// welcome steps use for `meet_matrx_seen` / `onboarding_completed`), so it holds across tabs, browsers and visits.
// Until 2026-10-22 the skip lived only in sessionStorage: /welcome's full-page age step asked again on every load
// (prod check, 2026-10-21).
//
// COMPLIANCE IS UNCHANGED. This is a time-boxed snooze of the NUDGE, never an opt-out and never a band: the band
// stays NULL, the per-action gate (useAiComplianceGate in front of education AI) still asks every time, and
// /education/family can always set it. After AGE_NOT_NOW_DAYS the nudge asks again.

import { supabase } from "@/utils/supabase/client";

export const AGE_NOT_NOW_KEY = "age_question_not_now_at" as const;
export const AGE_NOT_NOW_DAYS = 7;

type MetadataCarrier = { user_metadata?: Record<string, unknown> | null } | null | undefined;

/** True while the person's last "Not now" on the age question is younger than AGE_NOT_NOW_DAYS. */
export function ageNotNowActive(user: MetadataCarrier, now: number = Date.now()): boolean {
  const at = user?.user_metadata?.[AGE_NOT_NOW_KEY];
  if (typeof at !== "string") return false;
  const t = Date.parse(at);
  if (Number.isNaN(t) || t > now + 60_000) return false;
  return now - t < AGE_NOT_NOW_DAYS * 24 * 60 * 60 * 1000;
}

/** The metadata patch that records a "Not now" at `now`. */
export function ageNotNowPatch(now: number = Date.now()): Record<typeof AGE_NOT_NOW_KEY, string> {
  return { [AGE_NOT_NOW_KEY]: new Date(now).toISOString() };
}

/**
 * Records the "Not now" on the signed-in account and refreshes the session, so the next page load (SSR reads the
 * token's claims) already skips the question. Returns the error message, or null.
 */
export async function rememberAgeNotNow(): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ data: ageNotNowPatch() });
  if (error) return error.message;
  await supabase.auth.refreshSession();
  return null;
}

/** The current session's account says "Not now" is still in force (local session read, no network). */
export async function ageNotNowInSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return ageNotNowActive(data.session?.user);
}

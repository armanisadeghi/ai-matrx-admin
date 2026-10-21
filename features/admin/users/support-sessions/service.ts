// Support sessions — a super admin works inside a person's account for a timed window.
//
// Every read and write goes straight to the admin.support_session_* doors (they gate themselves:
// super admin for create/list, "this is that session's own sign-in" or super admin for extend/end).
// The one-time link is redeemed server-side by app/auth/support-session/route.ts.

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

type AdminFns = Database["admin"]["Functions"];
export type SupportSessionRow = AdminFns["support_session_list"]["Returns"][number];
/**
 * A support session as a table shows it. The generator renders RETURNS TABLE columns non-null, but
 * ended_at / started_at / emails / ip are null for many rows; the direct per-person read says so.
 */
export type SupportSessionListRow = {
  [K in keyof SupportSessionRow]: K extends "id" | "status" | "target_user_id" | "minutes_granted" | "created_at"
    ? SupportSessionRow[K]
    : SupportSessionRow[K] | null;
};
export type CurrentSupportSession = AdminFns["support_session_current"]["Returns"][number];

export interface SupportSessionEvent {
  event: "created" | "started" | "extended" | "ended";
  at: string;
  via: string;
  expires_at: string | null;
  target_live_sign_ins: number;
  target_last_active_at: string | null;
}

/** Marks a browser that holds a support session, so only that browser asks the database. */
export const SUPPORT_SESSION_COOKIE = "matrx_support_session";
/** Where the one-time link lands (outside proxy.ts: /auth is not matched). */
export const SUPPORT_SESSION_START_PATH = "/auth/support-session";
export const SUPPORT_SESSION_ENDED_PATH = "/auth/support-session/ended";

/**
 * Every support-session number is a platform knob (feature `support_sessions`, Users & Access ›
 * Limits & Knobs); nothing here carries a value of its own. Read with `useEffectiveKnob`.
 */
export const SUPPORT_SESSION_KNOBS = {
  lengthChoices: { feature: "support_sessions", key: "length_choices" },
  defaultMinutes: { feature: "support_sessions", key: "default_minutes" },
  extendMinutes: { feature: "support_sessions", key: "extend_minutes" },
} as const;

/** A whole number of minutes, or null when the knob has not answered (never a stand-in value). */
export function knobMinutes(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0 ? raw : null;
}

/** The offered lengths, or null when the knob has not answered or is malformed. */
export function knobMinuteChoices(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const choices = raw.map(knobMinutes);
  return choices.length > 0 && choices.every((m): m is number => m !== null) ? choices : null;
}

export async function createSupportSession(args: {
  targetUserId: string;
  reason: string;
  minutes: number;
}) {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("support_session_create", {
      p_target_user_id: args.targetUserId,
      p_reason: args.reason,
      p_minutes: args.minutes,
    });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("The support session was not created");
  return row;
}

export async function listSupportSessions(limit = 200): Promise<SupportSessionRow[]> {
  const supabase = createClient().schema("admin");
  // Sessions whose clock ran out in a closed browser are ended before they are listed.
  const swept = await supabase.rpc("support_session_close_expired");
  if (swept.error) throw swept.error;
  const { data, error } = await supabase.rpc("support_session_list", { p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

/**
 * One person's support sessions, newest first — read direct (admin.support_sessions, platform-admin
 * read; index (target_user_id, created_at DESC)) in the same row shape support_session_list returns.
 * Emails are null here: the table names people by id (AdminUserRef resolves them).
 */
export async function listSupportSessionsForTarget(targetUserId: string, limit = 200): Promise<SupportSessionListRow[]> {
  const supabase = createClient().schema("admin");
  const swept = await supabase.rpc("support_session_close_expired");
  if (swept.error) throw swept.error;
  const { data, error } = await supabase
    .from("support_sessions")
    .select(
      "id, status, reason, created_by, target_user_id, minutes_granted, created_at, started_at, expires_at, ended_at, end_reason, support_ip, support_user_agent, events:support_session_events!support_session_events_support_session_id_fkey(event, created_at, via, expires_at, target_live_sign_ins, target_last_active_at)",
    )
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    reason: s.reason,
    admin_user_id: s.created_by,
    admin_email: null,
    target_user_id: s.target_user_id,
    target_email: null,
    minutes_granted: s.minutes_granted,
    created_at: s.created_at,
    started_at: s.started_at,
    expires_at: s.expires_at,
    ended_at: s.ended_at,
    end_reason: s.end_reason,
    support_ip: s.support_ip === null ? null : String(s.support_ip),
    support_user_agent: s.support_user_agent,
    events: (s.events ?? [])
      .map((e) => ({
        event: e.event,
        at: e.created_at,
        via: e.via,
        expires_at: e.expires_at,
        target_live_sign_ins: e.target_live_sign_ins,
        target_last_active_at: e.target_last_active_at,
      }))
      .sort((a, b) => a.at.localeCompare(b.at)),
  }));
}

export async function currentSupportSession(client: Pick<ReturnType<typeof createClient>, "schema"> = createClient()): Promise<CurrentSupportSession | null> {
  const { data, error } = await client.schema("admin").rpc("support_session_current");
  if (error) throw error;
  return data?.[0] ?? null;
}

/** The new end time, or `null` when the session had already ended (the database closed it). */
export async function extendSupportSession(id: string, minutes: number): Promise<string | null> {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("support_session_extend", { p_id: id, p_minutes: minutes });
  if (error) throw error;
  return data?.[0]?.expires_at ?? null;
}

/** `reason` is required from the admin console (the database refuses it there without one). */
export async function endSupportSession(id: string, reason?: string): Promise<void> {
  const { error } = await createClient()
    .schema("admin")
    .rpc("support_session_end", { p_id: id, ...(reason ? { p_reason: reason } : {}) });
  if (error) throw error;
}

/** The link a super admin pastes into a separate browser. Local builds keep the local origin. */
export function supportSessionLink(claimToken: string, origin: string): string {
  return `${origin}${SUPPORT_SESSION_START_PATH}?t=${encodeURIComponent(claimToken)}`;
}

export function hasSupportSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${SUPPORT_SESSION_COOKIE}=`));
}

export function clearSupportSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SUPPORT_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Login details belong to the person: inside a support session, changing the email or signing out
 * their other devices is refused. Asks the database (the sign-in's own session id), not the cookie.
 */
export async function assertNotInSupportSession(client: Pick<ReturnType<typeof createClient>, "schema"> = createClient()): Promise<void> {
  const current = await currentSupportSession(client);
  if (current?.status === "active") {
    throw new Error("Login details can't be changed during a support session.");
  }
}

/**
 * A normal sign-out inside the support window ends the support session too, so the trail closes
 * with it instead of waiting for the clock. The cookie holds the session id; the database still
 * decides (only that window's own sign-in may end it).
 */
export async function endSupportSessionOnSignOut(): Promise<void> {
  if (typeof document === "undefined") return;
  const id = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SUPPORT_SESSION_COOKIE}=`))
    ?.slice(SUPPORT_SESSION_COOKIE.length + 1);
  if (!id) return;
  clearSupportSessionCookie();
  try {
    await endSupportSession(decodeURIComponent(id));
  } catch (error) {
    console.error("[support-session] ending it on sign-out failed:", error);
  }
}

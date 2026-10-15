// Support sessions — a super admin works inside a person's account for a timed window.
//
// Every read and write goes straight to the admin.support_session_* doors (they gate themselves:
// super admin for create/list, "this is that session's own sign-in" or super admin for extend/end).
// The one-time link is redeemed server-side by app/auth/support-session/route.ts.

import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

type AdminFns = Database["admin"]["Functions"];
export type SupportSessionRow = AdminFns["support_session_list"]["Returns"][number];
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

export const SUPPORT_SESSION_LENGTHS = [15, 30, 60, 120] as const;
export const SUPPORT_SESSION_DEFAULT_MINUTES = 30;
export const SUPPORT_SESSION_EXTEND_MINUTES = 15;

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

export async function currentSupportSession(): Promise<CurrentSupportSession | null> {
  const { data, error } = await createClient().schema("admin").rpc("support_session_current");
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function extendSupportSession(id: string, minutes: number): Promise<string> {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("support_session_extend", { p_id: id, p_minutes: minutes });
  if (error) throw error;
  const expiresAt = data?.[0]?.expires_at;
  if (!expiresAt) throw new Error("The new end time did not come back");
  return expiresAt;
}

export async function endSupportSession(id: string): Promise<void> {
  const { error } = await createClient()
    .schema("admin")
    .rpc("support_session_end", { p_id: id });
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
export async function assertNotInSupportSession(): Promise<void> {
  const current = await currentSupportSession();
  if (current?.status === "active") {
    throw new Error("Login details can't be changed during a support session.");
  }
}

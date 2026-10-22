import type { SupabaseClient } from "@supabase/supabase-js";
import { readAdminStatus } from "@ai-matrx/auth/admin";
import type { Database } from "@/types/database.types";
import type { DbRpcRow } from "@/types/supabase-rpc";
import type { JsonObject } from "@/types/json";
import { isJsonObject } from "@/types/json";
import { adminMfaAllows, readAdminMfaVerdict } from "@/utils/auth/adminMfa";

export type AdminLevel = Database["public"]["Enums"]["admin_level"];

export interface AdminStatus {
  isAdmin: boolean;
  level: AdminLevel | null;
}

export interface UserSessionData {
  isAdmin: boolean;
  preferences: JsonObject;
  preferencesExist: boolean;
}

interface UserSessionDataResponse {
  is_admin: boolean;
  preferences: unknown; // Json field — narrowed at use via isJsonObject (Pattern 4)
  preferences_exists: boolean;
}

// Compile-time guard — breaks if the DB row shape changes.
type _CheckUserSessionDataResponse =
  UserSessionDataResponse extends DbRpcRow<"get_user_session_data", "users"> ? true : false;
declare const _userSessionDataResponseCheck: _CheckUserSessionDataResponse;
true satisfies typeof _userSessionDataResponseCheck;

/**
 * Admin status for server layouts: THE one admin read (`readAdminStatus`, @ai-matrx/auth/admin),
 * with this host's policy — a failed read logs and is not admin. Returns the boolean and the level.
 *
 * The day this ships every existing admin row defaults to `super_admin`.
 */
export async function getAdminStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminStatus> {
  const status = await readAdminStatus(supabase, userId);

  if (status.state === "unknown") {
    console.error("Error checking admin status:", status.error);
    return { isAdmin: false, level: null };
  }

  if (status.state === "not_admin") return { isAdmin: false, level: null };
  return { isAdmin: true, level: status.level };
}

/**
 * Highest-bar check. The new default for every gate in the app — server
 * routes, layout guards, and (via the matching selector) UI gates.
 */
export async function checkIsSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { level } = await getAdminStatus(supabase, userId);
  // ADMIN POWER, not identity: with the administrator-MFA knob on, only a
  // current aal2 session holds it (utils/auth/adminMfa.ts). Knob off = unchanged.
  return level === "super_admin" && adminMfaAllows(await readAdminMfaVerdict());
}

/**
 * Returns true for ANY admin level. Kept for the future "selectively lower
 * the bar" use case — call sites that want to allow developer / senior_admin
 * in addition to super_admin.
 *
 * Most existing call sites switched to `checkIsSuperAdmin` when admin levels
 * shipped; new code should default to `checkIsSuperAdmin` and only use this
 * when the bar has been deliberately lowered for that surface.
 */
export async function checkIsUserAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { isAdmin } = await getAdminStatus(supabase, userId);
  return isAdmin && adminMfaAllows(await readAdminMfaVerdict());
}

/**
 * Fetches complete user session data (admin status + preferences) in a single database query.
 * This is much more efficient than making separate queries for admin check and preferences.
 * Use this in layouts where you need both admin status and user preferences.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch session data for
 */
export async function getUserSessionData(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSessionData> {
  const { data, error } = await supabase
    .schema("users")
    .rpc("get_user_session_data", { p_user_id: userId })
    .single();

  if (error) {
    console.error("Error fetching user session data:", error);
    return {
      isAdmin: false,
      preferences: {},
      preferencesExist: false,
    };
  }

  if (!data) {
    return {
      isAdmin: false,
      preferences: {},
      preferencesExist: false,
    };
  }

  const row = data as unknown as UserSessionDataResponse;
  return {
    isAdmin: row.is_admin,
    preferences: isJsonObject(row.preferences) ? row.preferences : {},
    preferencesExist: row.preferences_exists,
  };
}

"use client";
// lib/guest/ensure-guest-session.ts — make the visitor's guest session, once (G2 guest data, 2026-10-09).
//
// Called by the Applet host on a signed-out visitor's FIRST save or job — never on a page view, so a bot
// or a window-shopper never gets an account. The mint-once logic (aidream mints the guest, binds this
// browser's visitor id and adopts an earlier guest; single flight per tab and per browser) lives in
// `@ai-matrx/auth/guest` `createGuestSessionEnsurer`; this file injects the guest client, the server URL and
// the visitor fingerprint.
import { createGuestSessionEnsurer, type GuestSessionAnswer } from "@ai-matrx/auth/guest";

import { BACKEND_URLS } from "@/lib/api/endpoints";
import { getFingerprint } from "@/lib/services/fingerprint-service";
import { guestSupabase } from "@/lib/guest/guest-supabase-client";

export type { GuestSessionAnswer };

export const ensureGuestSession = createGuestSessionEnsurer({
  get auth() {
    return guestSupabase().auth;
  },
  async listWorkspaceIds(userId) {
    const { data: rows, error } = await guestSupabase().schema("iam").from("organization_member").select("organization_id").eq("user_id", userId);
    if (error) throw new Error(`Your guest workspace could not be read: ${error.message}`);
    return (rows ?? []).map((r) => r.organization_id).filter((o): o is string => typeof o === "string");
  },
  serverBaseUrl: BACKEND_URLS.production,
  getFingerprint,
});

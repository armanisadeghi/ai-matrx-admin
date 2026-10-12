// lib/guest/session-handover.ts — THE ONE PLACE A SESSION IS REPLACED (G2 guest data, 2026-10-09).
//
// The hand-over itself (read who the browser's guest is BEFORE the session is replaced, claim the guest's
// workspace into the account the session ends in, keep the guest cookie on a failed claim so the next sign-in
// retries; sign-up promotes the SAME account) lives in `@ai-matrx/auth/guest` `createGuestHandover`. This
// file injects what is THIS app's: the guest cookie name, the first-party visitor cookie, Next's cookie jar,
// and the service-lane store (admin client + the two server-only doors in `guest-db.ts`).
//
// Guard: `pnpm check:session-handover` fails on any session-replacing auth call outside this file.
import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getClaimsUser } from "@ai-matrx/auth";
import { createGuestHandover, type GuestStore } from "@ai-matrx/auth/guest";

import { createAdminClient } from "@/utils/supabase/adminClient";
import { ACQUISITION_VISITOR_COOKIE } from "@/lib/product-analytics/user-acquisition";
import { GUEST_AUTH_COOKIE } from "@/lib/guest/guest-cookie";
import { claimGuestWorkspace, reviveGuest } from "@/lib/guest/guest-db";

export type {
  GuestClaimOutcome,
  GuestPossession,
  GuestPromotion,
  HandoverVia,
} from "@ai-matrx/auth/guest";

/** Short-lived carrier for the visitor id across an OAuth provider round trip (read by the callback). */
export const GUEST_VISITOR_CARRIER_COOKIE = "matrx_guest_visitor";

const store: GuestStore = {
  async findGuestIdsByVisitor(visitorIds) {
    const { data, error } = await createAdminClient()
      .schema("users")
      .from("guest_executions")
      .select("auth_user_id")
      .in("fingerprint", visitorIds)
      .not("auth_user_id", "is", null);
    if (error) return { data: null, error: { message: error.message } };
    return { data: (data ?? []).map((r) => r.auth_user_id).filter((id): id is string => !!id), error: null };
  },
  async isAnonymousUser(userId) {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return data?.user?.is_anonymous === true;
  },
  claimWorkspace: ({ guestId, targetId, via }) => claimGuestWorkspace({ p_guest: guestId, p_target: targetId, p_via: via }),
  revive: (guestId) => reviveGuest(guestId),
  promoteUser: (guestId, { email, password }) =>
    createAdminClient().auth.admin.updateUserById(guestId, { email, password, email_confirm: true }),
  async stampConverted(guestId) {
    const { error } = await createAdminClient()
      .schema("users")
      .from("guest_executions")
      .update({ converted_to_user_id: guestId, converted_at: new Date().toISOString() })
      .eq("auth_user_id", guestId);
    return { error: error ? { message: error.message } : null };
  },
};

const handover = createGuestHandover({
  guestCookieName: GUEST_AUTH_COOKIE,
  visitorCookieName: ACQUISITION_VISITOR_COOKIE,
  carrierCookieName: GUEST_VISITOR_CARRIER_COOKIE,
  cookies: () => cookies(),
  store,
  // The anonymous JWT in this very request is the proof of possession: verified locally, never `getUser()`.
  async readGuestClaims(jar) {
    const guest = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
      {
        cookieOptions: { name: GUEST_AUTH_COOKIE },
        cookies: { getAll: () => jar.getAll(), setAll: () => undefined },
      },
    );
    const { data } = await getClaimsUser(guest);
    const user = data.user as { id: string; is_anonymous?: boolean } | null;
    return user ? { sub: user.id, is_anonymous: user.is_anonymous } : null;
  },
  secureCookies: process.env.NODE_ENV === "production",
});

export const looksLikeVisitorId = handover.looksLikeVisitorId;
export const readGuestPossession = handover.readGuestPossession;
export const claimGuestInto = handover.claimGuestInto;
export const handOverSession = handover.handOverSession;
export const settlePendingGuestClaim = handover.settlePendingGuestClaim;
export const promoteGuest = handover.promoteGuest;
export const finishPromotion = handover.finishPromotion;
export const rememberGuestVisitorId = handover.rememberGuestVisitorId;
export const takeGuestVisitorId = handover.takeGuestVisitorId;

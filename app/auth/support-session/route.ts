// app/auth/support-session/route.ts — redeems a super admin's one-time support link.
//
// The link is opened in a SEPARATE browser (or private window). This route, with the secret key:
//   1. claims the link (single use, 10 minutes; admin.support_session_claim clears its hash),
//   2. mints a magic-link token for the person and redeems it HERE, so the browser holds a real
//      sign-in as them and everything behaves exactly as it does for them,
//   3. binds that sign-in's session id to the support session and starts the clock
//      (admin.support_session_activate), which records whether the person was also signed in.
// The magic-link token never leaves the server. Outside proxy.ts by design (/auth is unmatched).
// Ending the session — by the countdown, the End button or an admin — deletes the auth session.

import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { handOverSession } from "@/lib/guest/session-handover";
import {
  SUPPORT_SESSION_COOKIE,
  SUPPORT_SESSION_ENDED_PATH,
} from "@/features/admin/users/support-sessions/service";

type Outcome = { ok: true } | { ok: false; why: "invalid" | "used" | "failed" };

function sessionIdOf(accessToken: string): string | null {
  const payload = accessToken.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      session_id?: unknown;
    };
    return typeof claims.session_id === "string" ? claims.session_id : null;
  } catch {
    return null;
  }
}

async function startSupportSession(token: string): Promise<Outcome> {
  const service = createAdminClient();
  const claimed = await service.schema("admin").rpc("support_session_claim", { p_claim_token: token });
  const claim = claimed.data?.[0];
  if (claimed.error || !claim) {
    console.warn("[support-session] claim refused:", claimed.error?.message ?? "no row");
    return { ok: false, why: "used" };
  }

  const abort = async (reason: string) => {
    console.error(`[support-session] ${claim.id} failed to start: ${reason}`);
    const { error } = await service.schema("admin").rpc("support_session_abort", { p_id: claim.id });
    if (error) console.error(`[support-session] ${claim.id} abort failed: ${error.message}`);
    return { ok: false, why: "failed" } as const;
  };

  if (!claim.target_email) return abort("the person has no email to sign in with");

  const link = await service.auth.admin.generateLink({ type: "magiclink", email: claim.target_email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return abort(link.error?.message ?? "no token came back");

  const supabase = await createClient();
  const verified = await handOverSession("email_otp", () =>
    supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash }),
  );
  const accessToken = verified.data?.session?.access_token;
  if (verified.error || !accessToken) {
    return abort(verified.error instanceof Error ? verified.error.message : "the sign-in was refused");
  }

  const authSessionId = sessionIdOf(accessToken);
  if (!authSessionId) return abort("the sign-in carried no session id");

  const activated = await service
    .schema("admin")
    .rpc("support_session_activate", { p_id: claim.id, p_auth_session_id: authSessionId });
  if (activated.error) return abort(activated.error.message);

  (await cookies()).set(SUPPORT_SESSION_COOKIE, claim.id, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
  return { ok: true };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t")?.trim() ?? "";
  const outcome: Outcome = /^[a-f0-9]{64}$/.test(token)
    ? await startSupportSession(token)
    : { ok: false, why: "invalid" };
  redirect(outcome.ok ? "/" : `${SUPPORT_SESSION_ENDED_PATH}?why=${outcome.why}`);
}

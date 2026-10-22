"use server";

// features/auth/phone/phoneAuthActions.ts
//
// Sign up / sign in with a phone number and a texted one-time code (Supabase Auth
// phone provider → our Twilio messaging service). One flow serves both pages: the
// code creates the account when the number is new and signs in when it is known.
// Success ends exactly like password sign-in (login/actions.ts): guest handover,
// the found search, the saved landing, and a FULL-DOCUMENT navigation to the
// destination the person asked for (utils/auth/FEATURE.md).

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { readAuthDestination, signInDestination } from "@/utils/auth/auth-destination";
import { markShellLayoutDeviceAtSignIn, shellLandingAfterSignIn } from "@/features/shell/shell-layout/server";
import { handOverSession } from "@/lib/guest/session-handover";
import { scheduleFoundSearchAtSignIn } from "@/features/marketing/smart-add/welcome/foundSearchAtSignIn";
import { toE164Phone } from "@/lib/sms/phoneUtils";

export type SendPhoneCodeResult = { ok: true; phone: string } | { ok: false; error: string };
export type VerifyPhoneCodeResult = { hardRedirect: string } | { error: string };

export async function sendPhoneCode(rawPhone: string): Promise<SendPhoneCodeResult> {
  const phone = toE164Phone(rawPhone);
  if (!phone) return { ok: false, error: "Enter a full phone number, like (949) 555-0123." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
  if (error) {
    console.error("[phone-auth] sending the code failed:", error.code ?? error.status, error.message);
    return { ok: false, error: error.message || "We couldn't text that number. Try again." };
  }
  return { ok: true, phone };
}

export async function verifyPhoneCode(input: {
  phone: string;
  code: string;
  redirectTo: string | null;
  guestFingerprint: string | null;
}): Promise<VerifyPhoneCodeResult> {
  const phone = toE164Phone(input.phone);
  const token = input.code.replace(/\D/g, "");
  if (!phone) return { error: "Enter a full phone number." };
  if (token.length < 6) return { error: "Enter the 6-digit code." };

  const supabase = await createClient();
  // TODO(phone-auth): "phone_otp" once @ai-matrx/auth > 0.4.6 is installed (aidream 591d02c8f1 adds it);
  // until then the guest claim is recorded under the other one-time-code label.
  const { data, error } = await handOverSession(
    "email_otp",
    () => supabase.auth.verifyOtp({ phone, token, type: "sms" }),
    { visitorId: input.guestFingerprint },
  );
  if (error || !data?.session) {
    console.error("[phone-auth] code check failed:", error?.code ?? error?.status, error?.message);
    return { error: error?.message || "That code didn't work. Try again." };
  }

  scheduleFoundSearchAtSignIn(data.session, "phone_otp");
  revalidatePath("/", "layout");

  const redirectTo = readAuthDestination({ redirectTo: input.redirectTo });
  const [finalRedirect] = await Promise.all([
    signInDestination({ redirectTo }, () => shellLandingAfterSignIn(supabase)),
    markShellLayoutDeviceAtSignIn(supabase),
  ]);
  return { hardRedirect: finalRedirect };
}

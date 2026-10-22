// File: app/auth/confirm/route.ts

import { type EmailOtpType } from "@supabase/supabase-js";
import { handOverSession } from "@/lib/guest/session-handover";
import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  authDestinationOr,
  signInDestination,
  normalizeAuthDestination,
  preserveAuthDestination,
  readAuthDestination,
  withAuthDestination,
  withAuthFlowParams,
} from "@/utils/auth/auth-destination";
import { markShellLayoutDeviceAtSignIn, shellLandingAfterSignIn } from "@/features/shell/shell-layout/server";
import { clearPendingSignupEmail } from "@/utils/auth/pending-signup";
import { scheduleFoundSearchAtSignIn } from "@/features/marketing/smart-add/welcome/foundSearchAtSignIn";

// The found search starts AFTER the response, in this function's lifetime (foundSearchAtSignIn.ts): an auth read, a
// registry read, the memberships, then a start that waits up to 20 s on aidream. The platform default cap would kill it.
export const maxDuration = 60;

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = isEmailOtpType(rawType) ? rawType : null;
  // Same rule as /auth/callback: a recovery confirm hops to /reset-password
  // (an auth page, so the shared validator rightly refuses it as a final
  // destination) carrying the user's real destination nested inside it.
  const rawRedirectTo = searchParams.get("redirectTo");
  const redirectTo =
    type === "recovery"
      ? withAuthDestination(
          "/reset-password",
          readAuthDestination(rawRedirectTo) ??
            normalizeAuthDestination(rawRedirectTo),
        )
      : authDestinationOr(rawRedirectTo ? { redirectTo: rawRedirectTo } : null);

  if (process.env.NODE_ENV === "development") {
    console.log("Email confirmation attempt:");
    console.log("  token_hash:", token_hash ? "present" : "missing");
    console.log("  type:", type);
    console.log("  redirectTo:", redirectTo);
  }

  if (token_hash && type) {
    const supabase = await createClient();

    // A confirm or password-recovery link opened in a browser holding a guest brings its records along (G2).
    const { data, error } = await handOverSession("email_otp", () =>
      supabase.auth.verifyOtp({
        type,
        token_hash,
      }),
    );

    if (!error) {
      await clearPendingSignupEmail();
      // The sign-up welcome's found search starts HERE, on the server, after the redirect is sent: never on the
      // person staying on a page (SIGNUP-WELCOME.md § The flow).
      if (type !== "recovery") scheduleFoundSearchAtSignIn(data?.session, "email_confirm");
      // redirect user to specified redirect URL with success message
      // The platform default counts as no destination: a saved landing applies (utils/auth/FEATURE.md).
      if (type !== "recovery") await markShellLayoutDeviceAtSignIn(supabase);
      const landed =
        type === "recovery"
          ? redirectTo
          : await signInDestination({ redirectTo }, () => shellLandingAfterSignIn(supabase));
      const successUrl = withAuthFlowParams(landed, {
        success: "Email confirmed! Welcome to AI Matrx!",
      });
      redirect(successUrl);
    } else {
      console.error("Email confirmation failed:", error);
      if (type === "signup" || type === "email") {
        redirect(
          preserveAuthDestination(
            "/check-email",
            { redirectTo },
            {
              error:
                "That confirmation link is invalid or expired. Request a new link below.",
            },
          ),
        );
      }
    }
  }

  // redirect to error page, preserving redirectTo if different from default
  const errorUrl = preserveAuthDestination("/error", { redirectTo });
  redirect(errorUrl);
}

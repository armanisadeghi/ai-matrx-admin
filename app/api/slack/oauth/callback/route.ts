import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import { getClaimsUser } from "@ai-matrx/auth";
import { buildMatrxRequestUrl, sendMatrxRequest } from "@ai-matrx/api";
import { requestBaseUrl } from "@/app/api/github/oauth/session";
import { SLACK_OAUTH_COOKIE, parseSlackOAuthSession } from "../session";

function done(request: NextRequest, returnUrl: string, error: string | null): NextResponse {
  const url = new URL("/api/slack/oauth/complete", requestBaseUrl(request));
  url.searchParams.set("return_url", returnUrl);
  if (error) url.searchParams.set("slack_error", error);
  else url.searchParams.set("slack", "connected");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SLACK_OAUTH_COOKIE)?.value;
  cookieStore.delete(SLACK_OAUTH_COOKIE);
  const oauth = raw ? parseSlackOAuthSession(raw) : null;
  if (!oauth) return done(request, "/settings", "Slack sign-in expired. Try again.");
  const returnedState = request.nextUrl.searchParams.get("state");
  if (returnedState !== oauth.state) {
    return done(request, oauth.returnUrl, "Slack sign-in could not be verified. Try again.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!user || !session?.access_token) {
    return done(request, oauth.returnUrl, "Sign in to AI Matrx again before connecting Slack.");
  }
  try {
    const response = await sendMatrxRequest(
      buildMatrxRequestUrl(AIDREAM_PRODUCTION_URL, "/api/slack/oauth/complete"),
      {
        method: "POST",
        headers: applyOrganizationContextHeader(
          { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          oauth.organizationId,
        ),
        body: JSON.stringify({
          state: returnedState,
          browser_proof: oauth.browserProof,
          code: request.nextUrl.searchParams.get("code"),
          provider_error: request.nextUrl.searchParams.get("error"),
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    const completed: unknown = await response.json().catch(() => null);
    if (!response.ok || !completed || typeof completed !== "object" || !("status" in completed)) {
      console.error("[slack-oauth:callback]", { status: response.status });
      return done(request, oauth.returnUrl, "Could not finish connecting Slack. Try again.");
    }
    if (completed.status === "cancelled") return done(request, oauth.returnUrl, "Slack sign-in was cancelled.");
    if (completed.status !== "connected") {
      return done(request, oauth.returnUrl, "Could not finish connecting Slack. Try again.");
    }
  } catch {
    console.error("[slack-oauth:callback]", { stage: "complete_request" });
    return done(request, oauth.returnUrl, "Could not finish connecting Slack. Try again.");
  }
  return done(request, oauth.returnUrl, null);
}

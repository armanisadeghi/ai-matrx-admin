import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { buildMatrxRequestUrl, sendMatrxRequest } from "@ai-matrx/api";
import { requestBaseUrl } from "@/app/api/github/oauth/session";
import { HUGGING_FACE_OAUTH_COOKIE, parseHuggingFaceOAuthSession } from "../session";

function done(request: NextRequest, returnUrl: string, error: string | null): NextResponse {
  const url = new URL("/api/hugging-face/oauth/complete", requestBaseUrl(request));
  url.searchParams.set("return_url", returnUrl);
  if (error) url.searchParams.set("huggingface_error", error);
  else url.searchParams.set("huggingface", "connected");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(HUGGING_FACE_OAUTH_COOKIE)?.value;
  cookieStore.delete(HUGGING_FACE_OAUTH_COOKIE);
  const oauth = raw ? parseHuggingFaceOAuthSession(raw) : null;
  if (!oauth) return done(request, "/settings", "Hugging Face sign-in expired. Try again.");
  const returnedState = request.nextUrl.searchParams.get("state");
  if (returnedState !== oauth.state) {
    return done(request, oauth.returnUrl, "Hugging Face sign-in could not be verified. Try again.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!user || !session?.access_token) {
    return done(request, oauth.returnUrl, "Sign in to AI Matrx again before connecting Hugging Face.");
  }
  try {
    const response = await sendMatrxRequest(
      buildMatrxRequestUrl(AIDREAM_PRODUCTION_URL, "/api/hugging-face/oauth/complete"),
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
      console.error("[huggingface-oauth:callback]", { status: response.status });
      return done(request, oauth.returnUrl, "Could not finish connecting Hugging Face. Try again.");
    }
    if (completed.status === "cancelled") return done(request, oauth.returnUrl, "Hugging Face sign-in was canceled.");
    if (completed.status !== "connected") {
      return done(request, oauth.returnUrl, "Could not finish connecting Hugging Face. Try again.");
    }
  } catch {
    console.error("[huggingface-oauth:callback]", { stage: "complete_request" });
    return done(request, oauth.returnUrl, "Could not finish connecting Hugging Face. Try again.");
  }
  return done(request, oauth.returnUrl, null);
}

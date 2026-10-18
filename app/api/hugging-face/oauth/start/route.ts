import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { safeRelativePath } from "@/utils/auth/safe-redirect";
import {
  OrganizationContextError,
  applyOrganizationContextHeader,
  requireOrganizationContext,
} from "@/lib/api/organization-context";
import { AIDREAM_PRODUCTION_URL } from "@/lib/api/endpoints";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { buildMatrxRequestUrl, sendMatrxRequest } from "@ai-matrx/api";
import { requestBaseUrl } from "@/app/api/github/oauth/session";
import { HUGGING_FACE_OAUTH_COOKIE, refusalWords, type HuggingFaceOAuthSession } from "../session";

function failed(request: NextRequest, returnUrl: string, message: string): NextResponse {
  const url = new URL("/api/hugging-face/oauth/complete", requestBaseUrl(request));
  url.searchParams.set("return_url", returnUrl);
  url.searchParams.set("huggingface_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  if (!user) return NextResponse.redirect(new URL("/login?next=/settings", requestBaseUrl(request)));

  let organizationId: string;
  try {
    organizationId = requireOrganizationContext(request.nextUrl.searchParams.get("organization_id"));
  } catch (error) {
    const message =
      error instanceof OrganizationContextError ? error.message : "An organization is required to connect Hugging Face.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const returnUrl = safeRelativePath(request.nextUrl.searchParams.get("return_url"), "/settings");
  const browserProof = randomBytes(32).toString("base64url");
  let started: unknown = null;
  let detail = "Could not start Hugging Face sign-in. Try again.";
  try {
    const backend = await sendMatrxRequest(
      buildMatrxRequestUrl(AIDREAM_PRODUCTION_URL, "/api/hugging-face/oauth/authorize"),
      {
        method: "POST",
        headers: applyOrganizationContextHeader(
          {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
            "Content-Type": "application/json",
          },
          organizationId,
        ),
        body: JSON.stringify({
          return_url: returnUrl,
          browser_proof_hash: createHash("sha256").update(browserProof).digest("hex"),
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    started = await backend.json().catch(() => null);
    if (!backend.ok) {
      // aidream's refusals here are written for the person ("not set up yet; paste a token").
      const said =
        refusalWords(started);
      console.error("[huggingface-oauth:start]", { status: backend.status });
      return failed(request, returnUrl, said ?? detail);
    }
  } catch {
    console.error("[huggingface-oauth:start]", { stage: "authorize_request" });
    return failed(request, returnUrl, detail);
  }
  if (
    !started ||
    typeof started !== "object" ||
    !("authorization_url" in started) ||
    !("state" in started) ||
    typeof started.authorization_url !== "string" ||
    typeof started.state !== "string"
  ) {
    return failed(request, returnUrl, detail);
  }
  let authorizationUrl: URL;
  try {
    authorizationUrl = new URL(started.authorization_url);
  } catch {
    return failed(request, returnUrl, detail);
  }
  if (authorizationUrl.protocol !== "https:" || authorizationUrl.hostname !== "huggingface.co") {
    detail = "Hugging Face sign-in pointed somewhere unexpected, so it was stopped.";
    return failed(request, returnUrl, detail);
  }
  const session: HuggingFaceOAuthSession = { state: started.state, returnUrl, browserProof, organizationId };
  (await cookies()).set(HUGGING_FACE_OAUTH_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(authorizationUrl);
}

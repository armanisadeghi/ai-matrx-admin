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
import { getClaimsUser } from "@ai-matrx/auth";
import { buildMatrxRequestUrl, sendMatrxRequest } from "@ai-matrx/api";
import { requestBaseUrl } from "@/app/api/github/oauth/session";
import { NOTION_OAUTH_COOKIE, refusalWords, type NotionOAuthSession } from "../session";

function failed(request: NextRequest, returnUrl: string, message: string): NextResponse {
  const url = new URL("/api/notion/oauth/complete", requestBaseUrl(request));
  url.searchParams.set("return_url", returnUrl);
  url.searchParams.set("notion_error", message);
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
      error instanceof OrganizationContextError ? error.message : "An organization is required to connect Notion.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const returnUrl = safeRelativePath(request.nextUrl.searchParams.get("return_url"), "/settings");
  const browserProof = randomBytes(32).toString("base64url");
  let started: unknown = null;
  let detail = "Could not start Notion sign-in. Try again.";
  try {
    const backend = await sendMatrxRequest(
      buildMatrxRequestUrl(AIDREAM_PRODUCTION_URL, "/api/notion/oauth/authorize"),
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
          // Notion sends the person back to this same host (aidream accepts only registered callbacks).
          redirect_uri: new URL("/api/notion/oauth/callback", requestBaseUrl(request)).toString(),
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    started = await backend.json().catch(() => null);
    if (!backend.ok) {
      // aidream's refusals here are written for the person ("not set up yet; paste a token").
      const said =
        refusalWords(started);
      console.error("[notion-oauth:start]", { status: backend.status });
      return failed(request, returnUrl, said ?? detail);
    }
  } catch {
    console.error("[notion-oauth:start]", { stage: "authorize_request" });
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
  if (authorizationUrl.protocol !== "https:" || authorizationUrl.hostname !== "api.notion.com") {
    detail = "Notion sign-in pointed somewhere unexpected, so it was stopped.";
    return failed(request, returnUrl, detail);
  }
  const session: NotionOAuthSession = { state: started.state, returnUrl, browserProof, organizationId };
  (await cookies()).set(NOTION_OAUTH_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(authorizationUrl);
}

// app/(public)/app_callback/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub is a first-party App integration, not a generic OAuth callback. The
 * state-bound `/api/github/oauth/start` → callback flow owns its exchange and
 * vault persistence; this legacy route must never receive or redirect a token.
 */
function githubConnectionRedirect(request: NextRequest): NextResponse {
  const url = new URL("/api/github/oauth/complete", request.url);
  url.searchParams.set("return_url", "/user-settings/integrations");
  url.searchParams.set(
    "github_error",
    "Connect GitHub from AI Matrx Settings.",
  );
  return NextResponse.redirect(url);
}

/**
 * Retired generic OAuth callback. It used to exchange a Slack/Notion code and put the access token
 * in a redirect URL (to a page that never existed). Slack connects through `/api/slack/oauth/*`;
 * no provider is exchanged here, and no code, state or token ever leaves this route.
 */
export async function GET(request: NextRequest) {
  const provider = new URL(request.url).searchParams.get("provider");
  if (provider === "github") return githubConnectionRedirect(request);
  return NextResponse.redirect(new URL("/user-settings/integrations", request.url));
}

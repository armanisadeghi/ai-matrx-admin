import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

interface OAuthSession {
  serverId: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpoint: string;
  redirectUri: string;
  returnUrl: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("mcp_oauth_session")?.value;

  cookieStore.delete("mcp_oauth_session");

  if (!sessionCookie) {
    return buildErrorRedirect(req, "/", "OAuth session expired or missing");
  }

  let session: OAuthSession;
  try {
    session = JSON.parse(sessionCookie) as OAuthSession;
  } catch {
    return buildErrorRedirect(req, "/", "Invalid OAuth session");
  }

  if (error) {
    return buildErrorRedirect(
      req,
      session.returnUrl,
      errorDescription ?? error,
    );
  }

  if (!code) {
    return buildErrorRedirect(
      req,
      session.returnUrl,
      "Missing authorization code",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildErrorRedirect(req, session.returnUrl, "Not authenticated");
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: session.redirectUri,
      client_id: session.clientId,
      code_verifier: session.codeVerifier,
    });

    if (session.clientSecret) {
      tokenBody.set("client_secret", session.clientSecret);
    }

    const tokenRes = await fetch(session.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`);
    }

    const tokens = (await tokenRes.json()) as TokenResponse;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: rpcError } = await supabase.rpc("upsert_mcp_connection", {
      p_server_id: session.serverId,
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token ?? null,
      p_token_expires_at: expiresAt,
      p_credentials_json: null,
      p_config_id: null,
      p_transport: "http",
      p_oauth_token_endpoint: session.tokenEndpoint,
      p_oauth_client_id: session.clientId,
      p_oauth_scopes: tokens.scope ? tokens.scope.split(" ") : null,
      p_endpoint_override: null,
    });

    if (rpcError) {
      throw new Error(`Failed to store MCP connection: ${rpcError.message}`);
    }

    const returnUrl = new URL(session.returnUrl, req.url);
    returnUrl.searchParams.set("mcp_connected", session.serverId);
    return NextResponse.redirect(returnUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange error";
    console.error("[MCP OAuth Callback]", message);
    return buildErrorRedirect(req, session.returnUrl, message);
  }
}

function buildErrorRedirect(
  req: NextRequest,
  returnUrl: string,
  errorMessage: string,
): NextResponse {
  const url = new URL(returnUrl, req.url);
  url.searchParams.set("mcp_error", errorMessage);
  return NextResponse.redirect(url);
}

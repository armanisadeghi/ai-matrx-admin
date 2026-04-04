import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  discoverOAuthEndpoints,
  registerDynamicClient,
} from "@/features/agents/services/mcp-oauth/discovery";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "@/features/agents/services/mcp-oauth/pkce";

const CALLBACK_PATH = "/api/mcp/oauth/callback";

function getCallbackUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}${CALLBACK_PATH}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serverId = searchParams.get("server_id");
  const returnUrl = searchParams.get("return_url");

  if (!serverId) {
    return NextResponse.json(
      { error: "server_id is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: server, error: serverError } = await supabase
    .from("mcp_servers")
    .select("endpoint_url, slug, auth_strategy")
    .eq("id", serverId)
    .single();

  if (serverError || !server) {
    return NextResponse.json(
      { error: "MCP server not found" },
      { status: 404 },
    );
  }

  if (server.auth_strategy !== "oauth_discovery") {
    return NextResponse.json(
      { error: "Server does not use OAuth discovery" },
      { status: 400 },
    );
  }

  if (!server.endpoint_url) {
    return NextResponse.json(
      { error: "Server has no endpoint URL" },
      { status: 400 },
    );
  }

  try {
    const { authServer } = await discoverOAuthEndpoints(server.endpoint_url);

    const redirectUri = getCallbackUrl(req);

    let clientId: string | undefined;
    let clientSecret: string | undefined;

    if (authServer.registration_endpoint) {
      const reg = await registerDynamicClient(
        authServer.registration_endpoint,
        {
          redirectUri,
          clientName: "AI Matrx",
          scope: authServer.scopes_supported?.join(" "),
        },
      );
      clientId = reg.client_id;
      clientSecret = reg.client_secret;
    }

    if (!clientId) {
      return NextResponse.json(
        {
          error:
            "OAuth server does not support Dynamic Client Registration and no pre-registered client_id is configured",
        },
        { status: 400 },
      );
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    const sessionPayload = JSON.stringify({
      serverId,
      codeVerifier,
      clientId,
      clientSecret: clientSecret ?? null,
      tokenEndpoint: authServer.token_endpoint,
      redirectUri,
      returnUrl: returnUrl ?? "/",
    });

    const cookieStore = await cookies();
    cookieStore.set("mcp_oauth_session", sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    if (authServer.scopes_supported?.length) {
      params.set("scope", authServer.scopes_supported.join(" "));
    }

    const authUrl = `${authServer.authorization_endpoint}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[MCP OAuth Start]", message);
    return NextResponse.json(
      { error: `OAuth discovery failed: ${message}` },
      { status: 502 },
    );
  }
}

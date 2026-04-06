import { NextRequest, NextResponse } from "next/server";

/**
 * MCP Client ID Metadata Document (CIMD) — per the Nov 2025 MCP spec.
 *
 * The client_id for our OAuth flow is the URL to this endpoint.
 * Authorization servers can fetch this to learn about our client.
 * This is a stateless alternative to Dynamic Client Registration.
 */
export async function GET(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  const metadata = {
    client_id: `${origin}/api/mcp/oauth/client-metadata`,
    client_name: "AI Matrx",
    redirect_uris: [`${origin}/api/mcp/oauth/callback`],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    client_uri: origin,
    logo_uri: `${origin}/logo.png`,
    contacts: ["support@aimatrx.com"],
  };

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const UPSTREAM = `${SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`;

/**
 * Proxy the OAuth 2.0 Authorization Server Metadata document (RFC 8414),
 * rewriting all Supabase URLs to our own domain.
 *
 * MCP clients and other OAuth 2.1 clients discover endpoints via:
 *   https://www.aimatrx.com/.well-known/oauth-authorization-server/auth/v1
 */
export async function GET(req: NextRequest) {
  const upstream = await fetch(UPSTREAM, {
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 3600 },
  });

  if (!upstream.ok) {
    return new NextResponse("Failed to fetch OAuth server metadata", {
      status: 502,
    });
  }

  const json = (await upstream.json()) as Record<string, unknown>;
  const site = getSiteUrl(req);

  const rewritten = rewriteUrls(json, SUPABASE_URL, site);

  return NextResponse.json(rewritten, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
    },
  });
}

function getSiteUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "www.aimatrx.com";
  return `${proto}://${host}`;
}

function rewriteUrls(
  value: unknown,
  supabaseBase: string,
  siteBase: string,
): unknown {
  if (typeof value === "string") {
    if (!value.startsWith(supabaseBase)) return value;

    const path = value.slice(supabaseBase.length);
    const mapped = mapPath(path);
    return `${siteBase}${mapped}`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteUrls(item, supabaseBase, siteBase));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = rewriteUrls(v, supabaseBase, siteBase);
    }
    return result;
  }

  return value;
}

function mapPath(supabasePath: string): string {
  const MAP: [string, string][] = [
    ["/auth/v1/oauth/authorize", "/api/oauth/authorize"],
    ["/auth/v1/oauth/token", "/api/oauth/token"],
    ["/auth/v1/oauth/userinfo", "/api/oauth/userinfo"],
    ["/auth/v1/.well-known/jwks.json", "/api/oauth/jwks"],
    ["/auth/v1/oauth/clients/register", "/api/oauth/clients/register"],
    ["/.well-known/openid-configuration", "/.well-known/openid-configuration"],
    [
      "/.well-known/oauth-authorization-server/auth/v1",
      "/.well-known/oauth-authorization-server/auth/v1",
    ],
  ];

  for (const [from, to] of MAP) {
    if (supabasePath === from || supabasePath.startsWith(`${from}?`)) {
      return supabasePath.replace(from, to);
    }
  }

  return supabasePath.replace("/auth/v1", "/api/oauth");
}

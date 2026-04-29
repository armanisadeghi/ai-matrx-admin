/**
 * app/api/share/[token]/file/route.ts
 *
 * Public direct-file resolver. Resolves a share token via the Python
 * backend, then 302-redirects the caller to the signed S3 URL so the file
 * itself is served — `<img src="/api/share/<token>/file">` works for
 * images, `<video>` for video, etc.
 *
 * Distinct from `/share/[token]` (the pretty landing page with metadata +
 * download button). This route is the embeddable / hot-linkable URL.
 *
 * Security: the token IS the auth — anyone with it gets the bytes, exactly
 * as the user intended when they clicked "Create link". Token revocation,
 * expiry, and max-uses are all enforced server-side by the Python backend
 * inside `GET /share/:token`.
 *
 * Caching: we set `Cache-Control: no-store` because the signed URL the
 * Python backend generates has a short TTL (1h by default) and we don't
 * want CDNs holding onto stale redirects past the token's window.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ShareLinkResolveResponse } from "@/features/files/types";

interface RouteContext {
  params: Promise<{ token: string }>;
}

function resolveBackendBaseUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL_PROD ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL_DEV ||
    null
  );
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;
  const baseUrl = resolveBackendBaseUrl();
  if (!baseUrl) {
    return new NextResponse("Backend not configured", { status: 503 });
  }

  // Resolve the token. Python returns the file row + a fresh signed URL.
  // Same endpoint the pretty share page uses — single source of truth so
  // expiry / max-uses / revocation behaviors stay aligned.
  let resolved: ShareLinkResolveResponse | null = null;
  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/share/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return new NextResponse("Share link not found, expired, or revoked.", {
        status: res.status === 404 ? 404 : 410,
      });
    }
    resolved = (await res.json()) as ShareLinkResolveResponse;
  } catch {
    return new NextResponse("Failed to resolve share link.", { status: 502 });
  }

  if (!resolved?.url) {
    return new NextResponse("Share link has no signed URL available.", {
      status: 410,
    });
  }

  // 302 to the signed URL. Browsers follow the redirect and fetch the
  // bytes directly from S3 — `<img>`, `<video>`, `<audio>`, and plain
  // navigation all work. The Content-Type / Content-Disposition come from
  // the S3 object so behavior matches what the file actually is.
  const response = NextResponse.redirect(resolved.url, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

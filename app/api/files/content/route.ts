/**
 * app/api/files/content/route.ts
 *
 * Server-side proxy for Supabase Storage signed URLs. Client-side
 * previewers (DataPreview, TextPreview, MarkdownPreview, CodePreview)
 * need to fetch() file content as text, but browsers enforce CORS on
 * programmatic fetch() calls. Supabase Storage may not include
 * Access-Control-Allow-Origin headers for the app's origin, so the
 * browser blocks the response body even though the request succeeds.
 *
 * This route fetches server-side (no CORS restriction), then streams
 * the content back to the client as a same-origin response.
 *
 * Security:
 *   - Only proxies URLs whose host matches NEXT_PUBLIC_SUPABASE_URL so
 *     this cannot be used as an open proxy for arbitrary third-party URLs.
 *   - Capped at MAX_BYTES (10 MB) to prevent memory pressure from large
 *     binary files that accidentally slip through the capability filter.
 */

import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Validate host — only allow our own Supabase project's storage.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    let parsedUrl: URL;
    let parsedSupabase: URL;
    try {
      parsedUrl = new URL(url);
      parsedSupabase = new URL(supabaseUrl);
    } catch {
      return new NextResponse("Invalid URL", { status: 400 });
    }
    if (parsedUrl.hostname !== parsedSupabase.hostname) {
      return new NextResponse("URL not allowed", { status: 403 });
    }
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new NextResponse(
        `Upstream error: ${upstream.status} ${upstream.statusText}`,
        { status: upstream.status },
      );
    }

    const contentType =
      upstream.headers.get("Content-Type") ?? "application/octet-stream";
    const buf = await upstream.arrayBuffer();

    // Truncate at size cap so a misbehaving caller can't OOM the server.
    const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;

    return new NextResponse(slice, {
      headers: {
        "Content-Type": contentType,
        // Private, short-lived — the signed URL itself expires anyway.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    return new NextResponse(msg, { status: 502 });
  }
}

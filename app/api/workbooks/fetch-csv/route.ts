// app/api/workbooks/fetch-csv/route.ts
//
// Sheets → Data → Data connectors → "CSV from a link". A browser cannot read most other sites' files
// (CORS), so the signed-in person's editor asks this route to fetch one public CSV / TSV / text file.
// It is the image proxy's hardened fetch (utils/net/ssrf-guard.ts: http/https only, connect-time address
// guard, every redirect hop re-checked by hand) with three differences: the caller must be signed in,
// the body must be text, and the cap is 5 MB.

import { NextRequest, NextResponse } from "next/server";
import { Agent, request as undiciRequest } from "undici";
import { getClaimsUser } from "@ai-matrx/auth";

import { createClient } from "@/utils/supabase/server";
import { BlockedAddressError, guardedLookup, isUrlSafeToFetch } from "@/utils/net/ssrf-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

const guardedAgent = new Agent({
  connect: { lookup: guardedLookup, timeout: TIMEOUT_MS },
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
});

const UPSTREAM_HEADERS = {
  accept: "text/csv,text/tab-separated-values,text/plain;q=0.9,*/*;q=0.5",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await getClaimsUser(supabase);
  if (userError || !user) return fail(401, "auth_required");

  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return fail(400, "Missing link");
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return fail(400, "That is not a web address");
  }
  if (!isUrlSafeToFetch(target)) return fail(403, "That address cannot be fetched");

  try {
    let current = target;
    let upstream = await undiciRequest(current, { dispatcher: guardedAgent, method: "GET", headers: UPSTREAM_HEADERS });
    for (let hop = 0; hop < MAX_REDIRECTS; hop += 1) {
      const status = upstream.statusCode;
      if (status < 300 || status > 399) break;
      const location = upstream.headers["location"];
      if (typeof location !== "string" || !location) break;
      upstream.body.dump().catch(() => {});
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return fail(502, "The link redirected somewhere that is not an address");
      }
      if (!isUrlSafeToFetch(next)) return fail(403, "That address cannot be fetched");
      current = next;
      upstream = await undiciRequest(current, { dispatcher: guardedAgent, method: "GET", headers: UPSTREAM_HEADERS });
    }
    if (upstream.statusCode >= 300 && upstream.statusCode <= 399) {
      upstream.body.dump().catch(() => {});
      return fail(502, "Too many redirects");
    }
    if (upstream.statusCode >= 400) {
      upstream.body.dump().catch(() => {});
      return fail(upstream.statusCode < 500 ? 404 : 502, upstream.statusCode < 500 ? "The link did not return a file" : "The other site did not answer");
    }
    const contentType = String(upstream.headers["content-type"] ?? "").toLowerCase();
    if (/^(image|video|audio)\//.test(contentType) || /octet-stream|zip|pdf/.test(contentType)) {
      upstream.body.dump().catch(() => {});
      return fail(415, "That link is not a CSV or text file");
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of upstream.body) {
      total += chunk.length;
      if (total > MAX_BYTES) {
        upstream.body.destroy();
        return fail(413, "That file is larger than 5 MB");
      }
      chunks.push(chunk);
    }
    return new NextResponse(Buffer.concat(chunks, total), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (error instanceof BlockedAddressError) return fail(403, "That address cannot be fetched");
    return fail(502, "The link could not be reached");
  }
}

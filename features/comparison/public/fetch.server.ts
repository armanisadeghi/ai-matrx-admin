import "server-only";

/**
 * Server-side reads of the public comparison doors (aidream `/comparison/public/*`). No identity is sent:
 * the slug is the whole address. Cached for a minute at the edge of the server (the page itself says when
 * the facts were fetched); the server keeps its own, longer, knob-set cache.
 */

import { cache } from "react";

import { resolveBaseUrl } from "@/lib/python-client";

import { parsePublicComparison, parsePublicPolicy, type PublicComparison, type PublicPolicy } from "./contract";

const REVALIDATE_SECONDS = 60;

async function read(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${resolveBaseUrl()}/comparison/public${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** One shared comparison by slug, deduped per request (the page, its metadata and its card share it). */
export const getSharedComparison = cache(async (slug: string): Promise<PublicComparison | null> => {
  if (!/^[a-z0-9][a-z0-9-]{4,79}$/.test(slug)) return null;
  return parsePublicComparison(await read(`/s/${encodeURIComponent(slug)}`));
});

/** The platform-level public policy. null = the server could not be reached (callers say so). */
export const getPublicPolicy = cache(async (): Promise<PublicPolicy | null> => {
  const raw = await read("/policy");
  return raw ? parsePublicPolicy(raw) : null;
});

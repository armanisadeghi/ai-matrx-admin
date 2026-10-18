// lib/custom-domains/lookup.ts — host → live domain routes, cached per server instance.
// One anonymous read of iam.org_domain_resolve (answers only LIVE domains). Hits are kept 60 s,
// misses 10 s, so an unknown host reaches the database at most once per 10 s per instance and a
// removed domain stops serving within 60 s. No supabase-js import: this runs inside proxy.ts.

import type { ResolvedDomain } from "./host-routing";

const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 10_000;
const LOOKUP_TIMEOUT_MS = 2_500;

const cache = new Map<string, { at: number; value: ResolvedDomain | null }>();

export class DomainLookupUnavailable extends Error {}

export async function lookupDomain(host: string): Promise<ResolvedDomain | null> {
  const hit = cache.get(host);
  const now = Date.now();
  if (hit && now - hit.at < (hit.value ? HIT_TTL_MS : MISS_TTL_MS)) return hit.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new DomainLookupUnavailable("Supabase URL or publishable key is not set");

  const response = await fetch(`${url}/rest/v1/rpc/org_domain_resolve`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json", "Content-Profile": "iam" },
    body: JSON.stringify({ p_host: host }),
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new DomainLookupUnavailable(`org_domain_resolve answered ${response.status}`);
  }
  const value = (await response.json()) as ResolvedDomain | null;
  cache.set(host, { at: now, value: value && value.organization_id ? value : null });
  return cache.get(host)!.value;
}

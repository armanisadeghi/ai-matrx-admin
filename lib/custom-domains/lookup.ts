// lib/custom-domains/lookup.ts — host → live domain routes, cached per server instance.
// One anonymous read of iam.org_domain_resolve (answers only LIVE domains). Hits are kept 60 s,
// misses 10 s, so an unknown host reaches the database at most once per 10 s per instance and a
// removed domain stops serving within 60 s. No supabase-js import: this runs inside proxy.ts.

import type { ResolvedDomain } from "./host-routing";

const HIT_TTL_MS = 60_000;
const MISS_TTL_MS = 10_000;
const LOOKUP_TIMEOUT_MS = 2_500;
/** Two tries of LOOKUP_TIMEOUT_MS stay well inside the proxy's 15 s budget. */
const LOOKUP_TRIES = 2;

/** Bounded: arbitrary Host headers must never grow this instance's memory. Oldest entry leaves first. */
const MAX_ENTRIES = 2_000;
const cache = new Map<string, { at: number; value: ResolvedDomain | null }>();

function remember(host: string, entry: { at: number; value: ResolvedDomain | null }): void {
  cache.delete(host);
  cache.set(host, entry);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** For tests: how many hosts this instance remembers. */
export function cachedHostCount(): number {
  return cache.size;
}

export class DomainLookupUnavailable extends Error {}

export async function lookupDomain(host: string): Promise<ResolvedDomain | null> {
  const hit = cache.get(host);
  const now = Date.now();
  if (hit && now - hit.at < (hit.value ? HIT_TTL_MS : MISS_TTL_MS)) return hit.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new DomainLookupUnavailable("Supabase URL or publishable key is not set");

  // A passing hiccup (a timed-out first try on a cold instance, a 5xx) is asked once more before the host is
  // called unavailable: live 2026-10-21 a business's first visitor met a 503 the very next visit did not.
  let response: Response | null = null;
  let failure: unknown = null;
  for (let attempt = 0; attempt < LOOKUP_TRIES; attempt += 1) {
    try {
      response = await fetch(`${url}/rest/v1/rpc/org_domain_resolve`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json", "Content-Profile": "iam" },
        body: JSON.stringify({ p_host: host }),
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (thrown) {
      response = null;
      failure = thrown;
      continue;
    }
    if (response.ok || response.status < 500) break;
    failure = new DomainLookupUnavailable(`org_domain_resolve answered ${response.status}`);
  }
  if (!response || !response.ok) {
    if (response && response.status < 500) {
      throw new DomainLookupUnavailable(`org_domain_resolve answered ${response.status}`);
    }
    throw failure instanceof DomainLookupUnavailable
      ? failure
      : new DomainLookupUnavailable(`org_domain_resolve did not answer: ${failure instanceof Error ? failure.message : String(failure)}`);
  }
  const value = (await response.json()) as ResolvedDomain | null;
  const entry = { at: now, value: value && value.organization_id ? value : null };
  remember(host, entry);
  return entry.value;
}

/** Drops one host from this instance's cache (after add/check/remove); other instances follow within 60 s. */
export function forgetDomain(host: string): void {
  cache.delete(host.trim().toLowerCase());
}

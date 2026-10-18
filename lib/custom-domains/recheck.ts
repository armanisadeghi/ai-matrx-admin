// lib/custom-domains/recheck.ts — re-checks a connected-but-waiting domain WITHOUT a schedule.
// Two moments cover every time someone cares: the Domains settings page is viewed (the page asks the
// domains route), and a visitor's request reaches the edge for a host that is not live yet (proxy.ts
// calls this). Throttled per host (RECHECK_MS) per server instance. No supabase-js: proxy.ts runs this.

import { checkDomain, isVercelConfigured } from "./vercel-api";
import { statusFor, type DomainStatus } from "./dns-records";
import { forgetDomain } from "./lookup";

export const RECHECK_MS = 120_000;
/** Bounded like the lookup cache: arbitrary Host headers must never grow memory. */
export const MAX_TRACKED_HOSTS = 2_000;
const lastRecheck = new Map<string, number>();

/** True at most once per RECHECK_MS per host; records the attempt. */
export function claimRecheck(host: string, now: number = Date.now()): boolean {
  const last = lastRecheck.get(host);
  if (last !== undefined && now - last < RECHECK_MS) return false;
  lastRecheck.delete(host);
  lastRecheck.set(host, now);
  if (lastRecheck.size > MAX_TRACKED_HOSTS) {
    // Expired entries go first; past that, the oldest (Map order is insertion order).
    for (const [key, at] of lastRecheck) {
      if (lastRecheck.size <= MAX_TRACKED_HOSTS) break;
      if (now - at >= RECHECK_MS) lastRecheck.delete(key);
    }
    while (lastRecheck.size > MAX_TRACKED_HOSTS) {
      const oldest = lastRecheck.keys().next().value;
      if (oldest === undefined) break;
      lastRecheck.delete(oldest);
    }
  }
  return true;
}

/** For tests: how many hosts the throttle remembers. */
export function trackedHostCount(): number {
  return lastRecheck.size;
}

interface WaitingRow {
  id: string;
  organization_id: string;
  created_by: string | null;
}

function rest(path: string, init: RequestInit & { profile: "iam" }): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase URL or secret key is not set");
  const { profile, headers, ...rest } = init;
  return fetch(`${url}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      "Accept-Profile": profile,
      "Content-Profile": profile,
      ...headers,
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
}

/**
 * When `host` is a connected domain still waiting for DNS, asks Vercel again and records the answer
 * (live → the next request serves it). Answers what happened; never throws.
 */
export async function recheckWaitingHost(host: string): Promise<"skipped" | "not_waiting" | "error" | DomainStatus> {
  if (!isVercelConfigured() || !claimRecheck(host)) return "skipped";
  try {
    const found = await rest(
      `org_domain?host=eq.${encodeURIComponent(host)}&status=in.(pending,verifying)&select=id,organization_id,created_by&limit=1`,
      { method: "GET", profile: "iam" },
    );
    if (!found.ok) throw new Error(`reading the domain answered ${found.status}`);
    const [row] = (await found.json()) as WaitingRow[];
    if (!row) return "not_waiting";
    const state = await checkDomain(host);
    const status = statusFor(state);
    const saved = await rest("rpc/org_domain_record", {
      method: "POST",
      profile: "iam",
      body: JSON.stringify({
        p_organization_id: row.organization_id,
        p_domain_id: row.id,
        p_host: host,
        p_status: status,
        p_verification: { records: state.records, vercel_verified: state.verified, misconfigured: state.misconfigured, on_project: state.onProject },
        p_error: state.onProject ? null : "Vercel no longer has this domain.",
        p_actor: row.created_by,
      }),
    });
    if (!saved.ok) throw new Error(`saving the check answered ${saved.status}`);
    forgetDomain(host);
    return status;
  } catch (error) {
    console.error(`[custom-domain] re-check of ${host} failed:`, error);
    return "error";
  }
}

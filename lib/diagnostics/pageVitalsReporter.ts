/**
 * pageVitalsReporter.ts — REAL-USER PAGE SPEED, ONE ROW PER PAGE LOAD.
 *
 * Loaded only after the page settles (pageVitals.ts registers it as the last idle task), so it
 * costs first paint nothing. It listens with `web-vitals` (TTFB, FCP, LCP, CLS, INP — the library
 * reads the browser's buffered entries, so starting late loses nothing that happened before) and
 * sends ONE row when the tab is first hidden (or after MAX_WAIT_MS, whichever comes first) through
 * the one write door `platform.record_page_vitals`. The route is folded to a pattern (every id
 * segment → {id}) so pages group the way the admin latency page groups them.
 *
 * Sampled by the knob `platform.page_vitals.sample_percent` (default 100), read once per tab at
 * send time. Never blocks, never retries, never throws: a lost row is a lost sample.
 * Read by: `platform.page_vitals_daily` (p50/p90 per day and route) → admin dashboard Latency ›
 * Page speed.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { createClient } from "@/utils/supabase/client";
import { getActiveOrgId } from "@/lib/organizations/activeOrg";
import { APP_VERSION_META } from "@/lib/config-attestation/meta";

const MAX_WAIT_MS = 5 * 60_000;
const SAMPLE_CACHE_KEY = "matrx:page-vitals-sample";
const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|[0-9a-f]{16,}|[A-Za-z0-9_-]{22,})$/i;

/** `/chat/2f1c…/x` → `/chat/{id}/x` (same folding as the admin latency page's `pattern`). */
export function routePattern(pathname: string): string {
  return (
    pathname
      .split("/")
      .map((segment) => (segment && ID_SEGMENT.test(segment) ? "{id}" : segment))
      .join("/") || "/"
  );
}

function stage(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return "local";
  if (host === "aimatrx.com" || host.endsWith(".aimatrx.com")) return "production";
  return "preview";
}

async function samplePercent(): Promise<number> {
  try {
    const cached = window.sessionStorage.getItem(SAMPLE_CACHE_KEY);
    if (cached !== null) return Number(cached);
  } catch {
    /* storage blocked */
  }
  const { data } = await createClient()
    .schema("platform")
    .from("feature_knob")
    .select("value")
    .eq("feature", "platform.page_vitals")
    .eq("key", "sample_percent")
    .maybeSingle();
  const percent = typeof data?.value === "number" ? data.value : 100;
  try {
    window.sessionStorage.setItem(SAMPLE_CACHE_KEY, String(percent));
  } catch {
    /* storage blocked */
  }
  return percent;
}

let started = false;

export function startPageVitals(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  performance.mark("load:lazy:page vitals reporter"); // LOAD MARKER (lazy) — page-load trace, no import
  const route = routePattern(window.location.pathname);
  const values: Record<string, number> = {};
  let navType: string | null = null;
  let sent = false;
  const take = (metric: Metric) => {
    values[metric.name] = metric.value;
    if (metric.name === "TTFB") navType = metric.navigationType;
  };
  onTTFB(take);
  onFCP(take);
  onLCP(take);
  onCLS(take);
  onINP(take);

  const send = async () => {
    if (sent) return;
    sent = true;
    window.removeEventListener("visibilitychange", onHidden, true);
    window.removeEventListener("pagehide", onHidden, true);
    try {
      if (values.FCP === undefined && values.TTFB === undefined) return;
      const organizationId = getActiveOrgId();
      if (!organizationId) return;
      const client = createClient();
      const { data } = await client.auth.getSession();
      if (!data.session) return;
      if (Math.random() * 100 >= (await samplePercent())) return;
      const round = (n: number | undefined) => (n === undefined ? null : Math.round(n));
      await client.schema("platform").rpc("record_page_vitals" as never, {
        p_organization_id: organizationId,
        p_rows: [
          {
            route_pattern: route,
            nav_type: navType,
            stage: stage(),
            device: window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop",
            app_version: document.querySelector<HTMLMetaElement>(`meta[name="${APP_VERSION_META}"]`)?.content ?? null,
            ttfb_ms: round(values.TTFB),
            fcp_ms: round(values.FCP),
            lcp_ms: round(values.LCP),
            inp_ms: round(values.INP),
            cls: values.CLS === undefined ? null : Number(values.CLS.toFixed(4)),
          },
        ],
      } as never);
    } catch {
      /* a lost row is a lost sample — never surface it */
    }
  };
  // web-vitals reports the final LCP/CLS/INP on the hidden transition; let its listeners run first.
  const onHidden = () => {
    if (document.visibilityState === "hidden") window.setTimeout(() => void send(), 0);
  };
  window.addEventListener("visibilitychange", onHidden, true);
  window.addEventListener("pagehide", onHidden, true);
  window.setTimeout(() => void send(), MAX_WAIT_MS);
}

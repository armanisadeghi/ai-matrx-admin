"use client";

/**
 * "Under the hood" — what really ran for one data fetch (owner, 2026-10-22: "you need to have something that shows
 * for me as an admin so that I can see exactly what is running under the hood here ... I need to know that because it
 * impacts the speed"). The SAME run screen, plus this block, for an admin with the platform's admin debug mode on
 * (the opt-in admin view, `useAdminDebugView`); a member never sees it, not even a gap. Dollars only inside the
 * visible "Admin only" tag (points-and-money law). Read from the super-admin door `scraper.data_fetch_under_the_hood`.
 *
 * Shared by the Data library run results and each comparison facet (`facetLabel`).
 */

import { PropertyRow, RegionSkeleton } from "@ai-matrx/design-system/controls";

import { AdminCost } from "@/components/cost/AdminCost";
import { AdminOnlyTag } from "@/components/cost/AdminOnlyTag";
import { useAdminDebugView } from "@/hooks/useAdminDebugView";

import { durationWords, stageTimeline, useSourceMethods, useUnderTheHood, type UnderTheHoodRun } from "./runTiming";

/** The vendor's real name (admin only). */
export function providerName(slug: string | null | undefined): string {
  if (!slug) return "Not recorded";
  const names: Record<string, string> = { brightdata: "Bright Data", serpapi: "SerpAPI", serper: "Serper", dataforseo: "DataForSEO" };
  return names[slug] ?? slug;
}

const usd = (v: number | string | null | undefined): number | null => (v == null || v === "" ? null : Number(v));

const json = (v: unknown): string => (v == null ? "" : JSON.stringify(v, null, 2));

type UnderTheHoodProps = { jobId: string | null | undefined; open?: boolean; facetLabel?: string };

/** Nothing for a member (no read, no gap); the admin block only in the opt-in admin view. */
export function UnderTheHood(props: UnderTheHoodProps) {
  const admin = useAdminDebugView();
  if (!admin || !props.jobId) return null;
  return <UnderTheHoodBlock {...props} />;
}

function UnderTheHoodBlock({ jobId, open = false, facetLabel }: UnderTheHoodProps) {
  const q = useUnderTheHood(jobId, true, open);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3" data-under-the-hood={jobId} aria-label="Under the hood">
      <div className="flex items-center gap-2">
        <h3 className="type-label text-foreground">{facetLabel ? `Under the hood · ${facetLabel}` : "Under the hood"}</h3>
        <AdminOnlyTag />
      </div>
      {q.isLoading ? <RegionSkeleton shape="rows" count={4} aria-label="Loading what ran" /> : null}
      {q.error ? <p className="type-meta text-destructive">{(q.error as Error).message}</p> : null}
      {q.data ? <RunFacts run={q.data} /> : null}
    </section>
  );
}

function RunFacts({ run }: { run: UnderTheHoodRun }) {
  const timeline = stageTimeline(run.stages);
  const r = run.records;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <PropertyRow label="Provider" value={providerName(run.provider)} />
        <PropertyRow label="Method" value={run.method_words} />
        <PropertyRow label="Vendor job" value={run.vendor_job_id ?? "None"} mono />
        <PropertyRow label="Dataset" value={run.dataset_id ?? "None"} mono />
        <PropertyRow label="Records" value={`${r.requested} asked · ${r.delivered ?? "?"} delivered · ${r.matched ?? "?"} matched · ${r.billed} billed`} />
        <PropertyRow label="Saved" value={`${r.saved_new} new · ${r.saved_updated} updated`} />
        <PropertyRow label="Retries" value={String(run.retries)} />
        <PropertyRow label="Total" value={run.duration_ms != null ? durationWords(run.duration_ms) : "Running"} />
        <PropertyRow label="Vendor cost" value={<AdminCost usd={usd(run.vendor_cost_usd)} unknown="Not recorded" />} />
        <PropertyRow label="Charged" value={<span>{<AdminCost usd={usd(run.charged_usd)} unknown="Not recorded" />}{run.points != null ? ` · ${run.points} points` : ""}</span>} />
      </div>
      {timeline.length > 0 ? (
        <ol className="flex flex-col" aria-label="Stages" data-stage-timeline="">
          {timeline.map((s) => (
            <li key={s.stage} className="grid grid-cols-[8rem_1fr_auto] gap-2 border-t border-border py-1 first:border-t-0">
              <span className="type-meta text-foreground">{s.label}</span>
              <span className="type-meta text-muted-foreground">{new Date(s.at).toLocaleTimeString()}</span>
              <span className="type-meta text-foreground">{s.tookMs != null ? `+${durationWords(s.tookMs)}` : ""}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {run.attempts.length > 0 ? (
        <ol className="flex flex-col" aria-label="Attempts">
          {run.attempts.map((a) => (
            <li key={a.seq} className="type-meta text-muted-foreground">
              {`#${a.seq} ${providerName(a.provider)} · ${a.outcome ?? "open"}${a.error_class ? ` · ${a.error_class}` : ""}${a.http_status ? ` · HTTP ${a.http_status}` : ""}${a.latency_ms != null ? ` · ${durationWords(a.latency_ms)}` : ""}`}
            </li>
          ))}
        </ol>
      ) : null}
      {run.error ? <PropertyRow label="Error" value={`${run.error_code ?? ""} ${run.error}`.trim()} /> : null}
      {run.empty_reason ? <PropertyRow label="Provider said" value={run.empty_reason} /> : null}
      {run.request ? <PropertyRow label="Request sent" value={json(run.request)} mono /> : null}
    </div>
  );
}

/** Admin view: how a source gets its records, on its card ("Live scrape"). Nothing for a member. */
export function SourceMethodTag({ sourceKey }: { sourceKey: string }) {
  return useAdminDebugView() ? <SourceMethodTagAdmin sourceKey={sourceKey} /> : null;
}

function SourceMethodTagAdmin({ sourceKey }: { sourceKey: string }) {
  const methods = useSourceMethods(true);
  const m = methods.data?.[sourceKey];
  if (!m) return null;
  const short = m.method === "live_scrape" ? "Live scrape" : m.method === "dataset" ? "Pre-collected" : m.method === "api" ? "API" : "Not recorded";
  return (
    <span className="type-meta inline-flex items-center gap-1 text-muted-foreground" title={`${providerName(m.provider)}: ${m.method_words}`} data-source-method={m.method ?? ""}>
      <AdminOnlyTag />
      {`${short} · ${providerName(m.provider)}`}
    </span>
  );
}

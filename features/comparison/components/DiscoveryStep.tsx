"use client";

/**
 * Branch A / C — "Here's what we found" for a concept. The bones are a map search's result list
 * (Google Maps / Yelp: the source's own order, a photo, the name, stars with their count, the address
 * or price, one extra fact) and a reviewer's "How we picked" (Wirecutter: one line up top saying how
 * the list was made, the reasons one tap away). Every candidate can be dropped, the top few start
 * ticked, "Add your own" is always there, and the quote shows before anything paid runs.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, Plus, Star } from "lucide-react";
import { Badge, Button, FieldHelp } from "@ai-matrx/design-system/controls";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { formatPoints } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { cn } from "@/lib/utils";

import type { ComparisonKindInfo, LookupMatch } from "../contract";
import type { DiscoverResult } from "../discovery";
import { quoteComparison } from "../server";
import { ItemLogo } from "./ItemLogo";

export interface DiscoveryRow {
  key: string;
  match: LookupMatch;
  /** The source's own position (1-based); `null` = added by the person. */
  rank: number | null;
  note: string;
  picked: boolean;
}

/** The found list as rows, the source's preselection kept. */
export function rowsOf(result: DiscoverResult, key: (i: number) => string): DiscoveryRow[] {
  return result.items.map((i, n) => ({ key: key(n), match: i.match, rank: i.rank, note: i.note, picked: i.preselected }));
}

const SOON_ID: Record<string, string> = { products: "compare.products", social_accounts: "compare.social-accounts" };

export function DiscoveryStep({
  kind, result, rows, organizationId, seesDollars, adding, onRows, onAdd, onBack, onCompare,
}: {
  kind: ComparisonKindInfo;
  result: DiscoverResult;
  rows: DiscoveryRow[];
  organizationId: string;
  seesDollars: boolean;
  adding: boolean;
  onRows: (rows: DiscoveryRow[]) => void;
  onAdd: (text: string) => void;
  onBack: () => void;
  onCompare: (matches: LookupMatch[]) => void;
}) {
  const [addText, setAddText] = useState("");
  const picked = rows.filter((r) => r.picked).map((r) => r.match);
  const live = kind.status === "live";
  const photo = kind.key === "local_business" || kind.key === "products";

  const quote = useQuery({
    queryKey: ["comparison", "quote", kind.key, organizationId, JSON.stringify(picked.map((m) => m.item))],
    queryFn: ({ signal }) => quoteComparison(kind.key, picked.map((m) => m.item), { organizationId, signal }),
    enabled: live && picked.length >= 2,
    staleTime: 60_000,
  });

  const toggle = (key: string) => onRows(rows.map((r) => (r.key === key ? { ...r, picked: !r.picked } : r)));

  return (
    <section className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Here&apos;s what we found</h2>
          <Button variant="quiet" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>Edit</Button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {result.guessed ? <Badge tone="warning">Our guess</Badge> : null}
          <span className="type-secondary min-w-0 truncate text-muted-foreground" title={result.disclosure}>
            {result.disclosure}
          </span>
          {result.how.length ? (
            <FieldHelp label="How we picked" triggerLabel="How we picked">
              <ul className="space-y-1">
                {result.how.map((h) => <li key={h}>{h}</li>)}
              </ul>
            </FieldHelp>
          ) : null}
        </div>
      </div>

      {rows.length && result.notes.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {result.notes.map((n) => <span key={n} className="type-secondary text-warning-ink">{n}</span>)}
        </div>
      ) : null}

      {rows.length ? (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((row) => {
            const m = row.match;
            return (
              <li key={row.key} className="flex items-stretch">
                <button type="button" data-clickable="" aria-pressed={row.picked} onClick={() => toggle(row.key)}
                  className="flex min-w-0 flex-1 items-start gap-3 p-3 text-left sm:gap-4 sm:p-4">
                  <span className="type-meta w-5 shrink-0 pt-0.5 text-right tabular-nums text-muted-foreground">
                    {row.rank ?? "+"}
                  </span>
                  <ItemLogo name={m.name} logoUrl={m.logo_url} website={m.website} size={56} fill={photo} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-base font-semibold",
                      row.picked ? "text-foreground" : "text-muted-foreground")} title={m.name}>
                      {m.name}
                    </span>
                    {m.rating !== null || m.reviews_count !== null ? (
                      <span className="type-meta mt-0.5 flex items-center gap-1 text-muted-foreground">
                        {m.rating !== null ? (
                          <><Star className="h-3 w-3 fill-current text-warning" aria-hidden />
                            <span className="tabular-nums text-foreground">{m.rating.toFixed(1)}</span></>
                        ) : null}
                        {m.reviews_count !== null ? <span className="tabular-nums">({m.reviews_count.toLocaleString()})</span> : null}
                        <span>{kind.key === "local_business" ? "on the map" : kind.key === "companies_reviews" ? "on its review page" : "at the source"}</span>
                      </span>
                    ) : null}
                    {m.detail ? <span className="type-secondary block truncate text-muted-foreground" title={m.detail}>{m.detail}</span> : null}
                    {row.note && row.note !== m.detail ? <span className="type-meta block truncate text-muted-foreground">{row.note}</span> : null}
                  </span>
                  <span aria-hidden className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    row.picked ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent")}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
                {m.url ? (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.name}`}
                    className="flex w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : <span className="w-11 shrink-0" />}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="type-secondary text-muted-foreground">{result.notes[0] ?? "Nothing came back. Add your own."}</p>
      )}

      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (addText.trim()) { onAdd(addText.trim()); setAddText(""); } }}>
        <ProInput value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="Add your own"
          aria-label="Add your own" wrapperClassName="max-w-sm flex-1" />
        <Button type="submit" variant="outline" icon={<Plus className="h-4 w-4" />} disabled={!addText.trim() || adding}>
          {adding ? "Adding" : "Add"}
        </Button>
      </form>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="type-secondary min-h-5 text-muted-foreground">
          {picked.length < 2 ? "Pick at least two" : !live ? `${kind.label} comparisons are coming soon` : quote.data ? (
            <>
              Compare {picked.length} · <span className="font-medium text-foreground tabular-nums">{formatPoints(quote.data.total_points)}</span>
              {seesDollars && quote.data.total_usd_display ? <span className="tabular-nums"> · {quote.data.total_usd_display}</span> : null}
              {result.points > 0 ? <span className="tabular-nums"> · finding used {formatPoints(result.points, { short: true })}</span> : null}
            </>
          ) : quote.isError ? (
            <span className="inline-flex items-center gap-2">
              Price unavailable
              <Button variant="quiet" onClick={() => void quote.refetch()} disabled={quote.isFetching}>Try again</Button>
            </span>
          ) : <span className="inline-block h-4 w-40 animate-pulse rounded bg-muted align-middle" />}
        </div>
        <Button variant="primary" hero disabled={picked.length < 2}
          meta={live ? undefined : "Soon"}
          onClick={() => (live ? onCompare(picked) : void announceComingSoon(SOON_ID[kind.key] ?? kind.key))}>
          {`Compare ${picked.length || ""}`.trim()}
        </Button>
      </div>
    </section>
  );
}

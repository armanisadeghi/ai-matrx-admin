"use client";

import Link from "next/link";
import { ExternalLink, Trophy } from "lucide-react";
import { formatPoints } from "@ai-matrx/kit/format";

import { cn } from "@/lib/utils";
import type { ComparisonResult } from "@/features/comparison/contract";
import { ItemLogo } from "@/features/comparison/components/ItemLogo";
import { barFraction, comparedItems, headlineOf, isNumeric, verdictOf } from "@/features/comparison/verdict";

const FIELDS_SHOWN = 3;

/**
 * The finished comparison, chat-sized: the leader's headline, the first few numeric fields as bars
 * (primary first), the points it cost, and the way to the full page. Built from the SAME pure readers
 * the full `ComparisonView` uses (`verdict.ts`, `ItemLogo`) — that view is a page-sized flagship
 * (64 px verdict, ranked card grid, field-by-field grid) with no compact mode, so the card wraps its
 * readers, not the view.
 */
export function CompactResult({ result, runId, seesDollars }: { result: ComparisonResult; runId: string; seesDollars: boolean }) {
  const verdict = verdictOf(result);
  const headline = headlineOf(result);
  const items = comparedItems(result);
  const photo = result.kind === "local_business";
  const fields = [...result.fields.filter(isNumeric)]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .slice(0, FIELDS_SHOWN);
  const leader = verdict.leader;

  return (
    <div className="space-y-3 px-3 py-3" data-compare-result="">
      <div className="flex items-center gap-2.5">
        {leader ? <ItemLogo name={leader.name} logoUrl={leader.logo_url} website={leader.website} size={32} fill={photo} /> : null}
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-semibold leading-snug text-foreground">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">
              {leader
                ? verdict.tie ? "A tie at the top"
                  : headline ? <>{headline.lead} <span className="font-normal text-muted-foreground">{headline.rest}</span></>
                  : leader.name
                : "Nothing to compare yet"}
            </span>
          </div>
        </div>
      </div>

      {items.length > 0 && fields.length > 0 ? (
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <div className="type-label mb-1">{f.label}</div>
              <ul className="space-y-1.5">
                {items.map((it) => {
                  const v = it.values[f.key];
                  const frac = barFraction(f, v?.value, result);
                  return (
                    <li key={it.item_id} className="grid grid-cols-[1rem_minmax(0,7rem)_1fr_auto] items-center gap-2">
                      <ItemLogo name={it.name} logoUrl={it.logo_url} website={it.website} size={16} fill={photo} />
                      <span className="type-secondary truncate text-foreground" title={it.name}>{it.name}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                        {frac !== null ? (
                          <span className={cn("block h-full rounded-full", v?.is_best ? "bg-primary" : "bg-primary/35")}
                            style={{ width: `${Math.max(frac * 100, 2)}%` }} />
                        ) : null}
                      </span>
                      <span className={cn("min-w-12 text-right text-xs tabular-nums", v?.is_best ? "font-semibold text-foreground" : "text-foreground",
                        (!v || v.display === "—") && "text-muted-foreground")} title={v?.basis || undefined}>
                        {v?.display ?? "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <span className="type-meta text-muted-foreground">
          Cost <span className="tabular-nums text-foreground">{formatPoints(result.total_points)}</span>
          {seesDollars && result.total_cost_display ? <span className="tabular-nums"> · {result.total_cost_display}</span> : null}
        </span>
        <Link href={`/compare?run=${encodeURIComponent(runId)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" data-compare-open="">
          Open full comparison <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

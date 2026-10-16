"use client";

/**
 * "Here's what we found": every typed item as the real thing we matched — logo, name, web address or
 * street address, its rating when the search showed one — with the other candidates one click away
 * when it was not clear, add and remove, and the points quote. Nothing paid runs until Compare.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Plus, Star, X } from "lucide-react";
import { Button, Tile } from "@ai-matrx/design-system/controls";
import { formatPoints } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { cn } from "@/lib/utils";

import type { ComparisonKindInfo, LookupItem, LookupMatch } from "../contract";
import { quoteComparison } from "../server";
import { ItemLogo } from "./ItemLogo";

export interface FoundRow extends LookupItem {
  key: string;
  /** The candidate list is open (to change a found match). */
  open?: boolean;
}

export function FoundStep({
  kind, rows, organizationId, seesDollars, lookupPoints, adding, onRows, onAdd, onBack, onCompare, starting,
}: {
  kind: ComparisonKindInfo;
  rows: FoundRow[];
  organizationId: string;
  seesDollars: boolean;
  /** Points the lookup itself spent. */
  lookupPoints: number;
  adding: boolean;
  onRows: (rows: FoundRow[]) => void;
  onAdd: (text: string) => void;
  onBack: () => void;
  onCompare: (matches: LookupMatch[]) => void;
  starting: boolean;
}) {
  const [addText, setAddText] = useState("");
  const chosen = rows.filter((r) => r.status === "found" && r.match).map((r) => r.match as LookupMatch);
  const waiting = rows.filter((r) => r.status === "choose").length;
  const canCompare = chosen.length >= 2 && !starting;
  const photo = kind.key === "local_business";

  const quote = useQuery({
    queryKey: ["comparison", "quote", kind.key, organizationId, JSON.stringify(chosen.map((m) => m.item))],
    queryFn: ({ signal }) => quoteComparison(kind.key, chosen.map((m) => m.item), { organizationId, signal }),
    enabled: chosen.length >= 2,
    staleTime: 60_000,
  });

  const update = (key: string, patch: Partial<FoundRow>) => onRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Here&apos;s what we found
        </h2>
        <Button variant="quiet" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>Edit</Button>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const m = row.match;
          const others = row.candidates.length > 1;
          return (
            <li key={row.key}
              className={cn("rounded-xl border bg-card p-4",
                row.status === "found" ? "border-border" : row.status === "choose" ? "border-warning" : "border-destructive")}>
              <div className="flex items-start gap-3">
                {m ? <ItemLogo name={m.name} logoUrl={m.logo_url} website={m.website} size={44} fill={photo} />
                  : <ItemLogo name={row.query} size={44} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-foreground" title={m?.name ?? row.query}>
                    {m?.name ?? row.query}
                  </div>
                  <div className="type-secondary truncate text-muted-foreground" title={m?.detail || undefined}>
                    {m ? m.detail : row.status === "choose" ? "Which one?" : row.message}
                  </div>
                  {m && (m.rating !== null || m.reviews_count !== null) ? (
                    <div className="type-meta mt-1 flex items-center gap-1 text-muted-foreground">
                      {m.rating !== null ? <><Star className="h-3 w-3 fill-current text-warning" aria-hidden /><span className="tabular-nums text-foreground">{m.rating.toFixed(1)}</span></> : null}
                      {m.reviews_count !== null ? <span className="tabular-nums">{m.rating !== null ? "· " : ""}{m.reviews_count.toLocaleString()} reviews</span> : null}
                    </div>
                  ) : null}
                </div>
                <Button variant="quiet" removes aria-label={`Remove ${m?.name ?? row.query}`} icon={<X className="h-4 w-4" />}
                  onClick={() => onRows(rows.filter((r) => r.key !== row.key))} />
              </div>

              {row.status === "found" && others ? (
                <Button variant="quiet" className="mt-2" onClick={() => update(row.key, { open: !row.open })}
                  iconEnd={<ChevronDown className={cn("h-4 w-4 transition-transform", row.open && "rotate-180")} />}>
                  Not this one?
                </Button>
              ) : null}

              {row.status === "choose" || row.open ? (
                <div className="mt-3 space-y-1.5">
                  {row.candidates.map((c, i) => {
                    const selected = m !== null && c.name === m.name && c.detail === m.detail;
                    return (
                      <Tile key={`${c.url ?? c.name}-${i}`} selected={selected}
                        onClick={() => update(row.key, { status: "found", match: c, open: false })}
                        icon={<ItemLogo name={c.name} logoUrl={c.logo_url} website={c.website} size={24} fill={photo} />}
                        title={c.name} line={c.detail}
                        end={selected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null} />
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (addText.trim()) { onAdd(addText.trim()); setAddText(""); } }}>
        <ProInput value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="Add another"
          aria-label="Add another" wrapperClassName="max-w-sm flex-1" />
        <Button type="submit" variant="outline" icon={<Plus className="h-4 w-4" />} disabled={!addText.trim() || adding}>
          Add
        </Button>
      </form>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="type-secondary min-h-5 text-muted-foreground">
          {chosen.length < 2 ? (
            waiting ? "Pick one for each item" : "Add at least two"
          ) : quote.data ? (
            <>
              Compare {chosen.length} · <span className="font-medium text-foreground tabular-nums">{formatPoints(quote.data.total_points)}</span>
              {seesDollars && quote.data.total_usd_display ? <span className="tabular-nums"> · {quote.data.total_usd_display}</span> : null}
              {lookupPoints > 0 ? <span className="tabular-nums"> · finding used {formatPoints(lookupPoints, { short: true })}</span> : null}
            </>
          ) : quote.isError ? "Price unavailable" : <span className="inline-block h-4 w-40 animate-pulse rounded bg-muted align-middle" />}
        </div>
        <Button variant="primary" hero onClick={() => onCompare(chosen)} disabled={!canCompare || waiting > 0}>
          {starting ? "Starting" : `Compare ${chosen.length || ""}`.trim()}
        </Button>
      </div>
    </section>
  );
}

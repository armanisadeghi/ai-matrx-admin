"use client";

/**
 * The guaranteed path: one row per thing to compare (Google Flights' multi-city rows), each a name and
 * where it is. Find looks every row up against the real source (a map for places, review pages for
 * companies) and the row shows exactly what it matched — photo or logo, name, address, the map's
 * category, the rating with where it came from. A row that does not match exactly never dead-ends:
 * it lists the nearest real matches (Google Maps' "did you mean"), or says to fix the spelling or city.
 * Nothing is compared until at least two rows are matched and the quote shows.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, MapPin, Pencil, Plus, Search, Star, X } from "lucide-react";
import { Badge, Button, Chip, Tile } from "@ai-matrx/design-system/controls";
import { formatPoints } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { cn } from "@/lib/utils";

import type { ComparisonKindInfo, LookupMatch } from "../contract";
import { resolvePrice, resolveRow } from "../discovery";
import { lookupItems, quoteComparison } from "../server";
import {
  MAX_ROWS, applyNear, editRow, foundMatches, needsSearch, newRow, pickCandidate, withLookup, withResolve,
  type CompareRow,
} from "../rows";
import { ItemLogo } from "./ItemLogo";

export function CompareRows({
  kind, rows, onRows, near, onNear, organizationId, seesDollars, onCompare,
}: {
  kind: ComparisonKindInfo;
  rows: CompareRow[];
  onRows: (update: (rows: CompareRow[]) => CompareRow[]) => void;
  near: string;
  onNear: (near: string) => void;
  organizationId: string;
  seesDollars: boolean;
  onCompare: (matches: LookupMatch[]) => void;
}) {
  const places = kind.key === "local_business";
  const [searching, setSearching] = useState(false);
  const toSearch = rows.filter(needsSearch);
  const matched = foundMatches(rows);

  const price = useQuery({
    queryKey: ["comparison", "resolve-price", organizationId],
    queryFn: ({ signal }) => resolvePrice({ organizationId, signal }),
    enabled: places,
    staleTime: 5 * 60_000,
  });
  const perRow = places ? price.data ?? null : kind.lookup_points;
  const findCost = perRow !== null ? perRow * toSearch.length : null;

  const quote = useQuery({
    queryKey: ["comparison", "quote", kind.key, organizationId, JSON.stringify(matched.map((m) => m.item))],
    queryFn: ({ signal }) => quoteComparison(kind.key, matched.map((m) => m.item), { organizationId, signal }),
    enabled: matched.length >= 2,
    staleTime: 60_000,
  });

  const patch = (key: string, f: (r: CompareRow) => CompareRow) => onRows((rs) => rs.map((r) => (r.key === key ? f(r) : r)));

  async function findOne(row: CompareRow) {
    patch(row.key, (r) => ({ ...r, state: "resolving", message: null }));
    try {
      if (places) {
        const res = await resolveRow({ name: row.name, city: row.city, website: row.website }, { organizationId });
        patch(row.key, (r) => withResolve(r, res));
      } else {
        const q = row.website.trim() || row.name.trim();
        const out = await lookupItems(kind.key, [{ label: q }], { organizationId });
        patch(row.key, (r) => withLookup(r, out.items[0]));
      }
    } catch (err) {
      const message = (err as { userMessage?: string })?.userMessage ?? "That search did not answer. Try again.";
      patch(row.key, (r) => ({ ...r, state: "error", message }));
    }
  }

  async function findAll() {
    setSearching(true);
    try {
      await Promise.all(rows.filter(needsSearch).map((r) => findOne(r)));
    } finally {
      setSearching(false);
    }
  }

  const canAdd = rows.length < MAX_ROWS;

  return (
    <section className="space-y-4" aria-label="Things to compare">
      {places ? (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <ProInput value={near} onChange={(e) => { onNear(e.target.value); onRows((rs) => applyNear(rs, e.target.value)); }}
            placeholder="Near, for all rows (e.g. Sherman Oaks, CA)" aria-label="Near" wrapperClassName="w-full max-w-sm" />
        </div>
      ) : null}

      <ol className="space-y-3">
        {rows.map((row, i) => (
          <li key={row.key} className={cn("rounded-2xl border bg-card p-3 sm:p-4",
            row.state === "found" ? "border-border" : row.state === "choose" ? "border-warning"
              : row.state === "not_found" || row.state === "error" ? "border-destructive" : "border-border")}>
            {row.state === "found" && row.match ? (
              <FoundRow index={i} row={row} match={row.match} photo={places}
                onChange={() => patch(row.key, (r) => editRow(r, {}))}
                onRemove={rows.length > 1 ? () => onRows((rs) => rs.filter((r) => r.key !== row.key)) : undefined} />
            ) : (
              <>
                <form className="flex items-start gap-2" onSubmit={(e) => { e.preventDefault(); if (needsSearch(row)) void findOne(row); }}>
                  <span className="type-meta mt-2 w-5 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className={cn("grid min-w-0 flex-1 gap-2", places ? "sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)]" : "sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>
                    <ProInput value={row.name} onChange={(e) => patch(row.key, (r) => editRow(r, { name: e.target.value }))}
                      placeholder={places ? "Business name" : "Company name"} aria-label={`Name ${i + 1}`} />
                    {places ? (
                      <ProInput value={row.city} onChange={(e) => patch(row.key, (r) => editRow(r, { city: e.target.value }))}
                        placeholder="City or area" aria-label={`City ${i + 1}`} />
                    ) : null}
                    <ProInput value={row.website} onChange={(e) => patch(row.key, (r) => editRow(r, { website: e.target.value }))}
                      placeholder="Website (optional)" aria-label={`Website ${i + 1}`} />
                  </div>
                  <button type="submit" hidden aria-hidden tabIndex={-1} />
                  {rows.length > 1 ? (
                    <Button variant="quiet" removes aria-label={`Remove row ${i + 1}`} icon={<X className="h-4 w-4" />}
                      onClick={() => onRows((rs) => rs.filter((r) => r.key !== row.key))} />
                  ) : null}
                </form>
                <RowAnswer row={row} photo={places} onPick={(c) => patch(row.key, (r) => pickCandidate(r, c))} />
              </>
            )}
          </li>
        ))}
      </ol>

      {canAdd ? (
        <Button variant="quiet" icon={<Plus className="h-4 w-4" />}
          onClick={() => onRows((rs) => [...rs, newRow(places && near.trim() ? { city: near.trim(), cityFromNear: true } : {})])}>
          Add another
        </Button>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="type-secondary min-h-5 text-muted-foreground">
          {toSearch.length > 0 ? (
            <>Find {toSearch.length} {toSearch.length === 1 ? "row" : "rows"}
              {findCost !== null ? <> · <span className="tabular-nums text-foreground">{formatPoints(findCost)}</span></> : null}</>
          ) : matched.length < 2 ? (
            "Fill at least two rows"
          ) : quote.data ? (
            <>Compare {matched.length} · <span className="font-medium tabular-nums text-foreground">{formatPoints(quote.data.total_points)}</span>
              {seesDollars && quote.data.total_usd_display ? <span className="tabular-nums"> · {quote.data.total_usd_display}</span> : null}</>
          ) : quote.isError ? (
            <span className="inline-flex items-center gap-2">Price unavailable
              <Button variant="quiet" onClick={() => void quote.refetch()} disabled={quote.isFetching}>Try again</Button></span>
          ) : <span className="inline-block h-4 w-40 animate-pulse rounded bg-muted align-middle" />}
        </div>
        {toSearch.length > 0 ? (
          <Button variant="primary" hero icon={<Search className="h-4 w-4" />} disabled={searching} onClick={() => void findAll()}>
            {searching ? "Finding" : "Find"}
          </Button>
        ) : (
          <Button variant="primary" hero disabled={matched.length < 2 || rows.some((r) => r.state === "resolving")}
            onClick={() => onCompare(matched)}>
            {`Compare ${matched.length || ""}`.trim()}
          </Button>
        )}
      </div>
    </section>
  );
}

function Rating({ match, source }: { match: LookupMatch; source: string }) {
  if (match.rating === null && match.reviews_count === null) return null;
  return (
    <span className="type-meta inline-flex items-center gap-1 text-muted-foreground">
      {match.rating !== null ? (<><Star className="h-3 w-3 fill-current text-warning" aria-hidden />
        <span className="tabular-nums text-foreground">{match.rating.toFixed(1)}</span></>) : null}
      {match.reviews_count !== null ? <span className="tabular-nums">({match.reviews_count.toLocaleString()})</span> : null}
      <span>{source}</span>
    </span>
  );
}

function FoundRow({ index, row, match, photo, onChange, onRemove }: {
  index: number; row: CompareRow; match: LookupMatch; photo: boolean; onChange: () => void; onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="type-meta mt-1 w-5 shrink-0 text-right tabular-nums text-muted-foreground">{index + 1}</span>
      <ItemLogo name={match.name} logoUrl={match.logo_url} website={match.website} size={48} fill={photo} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          {match.url ? (
            <a href={match.url} target="_blank" rel="noopener noreferrer" className="truncate text-base font-semibold text-foreground hover:underline" title={match.name}>
              {match.name}
            </a>
          ) : <span className="truncate text-base font-semibold text-foreground" title={match.name}>{match.name}</span>}
          <Check className="h-4 w-4 shrink-0 text-success" aria-label="Matched" />
        </div>
        {match.detail ? <div className="type-secondary truncate text-muted-foreground" title={match.detail}>{match.detail}</div> : null}
        <div className="flex flex-wrap items-center gap-2">
          {row.category ? <Chip label={row.category} tone="neutral" /> : null}
          <Rating match={match} source={photo ? "on the map" : "on its review page"} />
        </div>
      </div>
      <Button variant="quiet" icon={<Pencil className="h-4 w-4" />} onClick={onChange}>Change</Button>
      {onRemove ? <Button variant="quiet" removes aria-label={`Remove ${match.name}`} icon={<X className="h-4 w-4" />} onClick={onRemove} /> : null}
    </div>
  );
}

function RowAnswer({ row, photo, onPick }: { row: CompareRow; photo: boolean; onPick: (c: CompareRow["candidates"][number]) => void }) {
  if (row.state === "resolving") {
    return <div className="ml-7 mt-3 h-12 animate-pulse rounded-xl bg-muted" aria-label="Finding" />;
  }
  if (row.state === "choose") {
    return (
      <div className="ml-7 mt-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge tone="warning">Pick one</Badge>
          <span className="type-secondary truncate text-muted-foreground">{row.message}</span>
        </div>
        {row.candidates.map((c, n) => (
          <Tile key={`${c.match.url ?? c.match.name}-${n}`} onClick={() => onPick(c)}
            icon={<ItemLogo name={c.match.name} logoUrl={c.match.logo_url} website={c.match.website} size={28} fill={photo} />}
            title={c.match.name}
            line={[c.category, c.match.detail].filter(Boolean).join(" · ")}
            end={c.match.rating !== null ? <span className="type-meta inline-flex items-center gap-1 tabular-nums text-muted-foreground">
              <Star className="h-3 w-3 fill-current text-warning" aria-hidden />{c.match.rating.toFixed(1)}</span> : null} />
        ))}
      </div>
    );
  }
  if (row.state === "not_found" || row.state === "error") {
    return <p className="type-secondary ml-7 mt-2 text-destructive-ink">{row.message}</p>;
  }
  return null;
}

"use client";

/**
 * THE LINEUP — the guaranteed path, reimagined as the contenders themselves (Apple's "Compare models"
 * columns + Google Flights' explicit rows): one card per thing to compare, up to five. A card starts as
 * its own small form (a name and where it is, or a name and a website), and the moment focus leaves it,
 * it looks itself up and BECOMES the real thing — photo or logo, name, category, address, and the rating
 * with where it came from. Nothing is guessed: a near miss turns into the nearest real matches to pick,
 * nothing at all keeps the fields to fix. Only matched cards are compared; the price shows before Compare.
 */

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, MapPin, Pencil, Star, X } from "lucide-react";
import { AddTile, MediaOption } from "@ai-matrx/design-system";
import { Badge, Button, Chip } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/loaders/Spinner";

import type { ComparisonKindInfo, LookupMatch } from "../contract";
import { resolveRow, type ResolveCandidate } from "../discovery";
import { useFacetKeys } from "../facet-choice";
import type { KindKey } from "../parse-input";
import { lookupItems, quoteComparison } from "../server";
import { CostDoor } from "@/components/cost/CostDoor";
import {
  MAX_ROWS, applyNear, editRow, foundMatches, isEmptyRow, needsSearch, newRow, pickCandidate, rowItem, withLookup, withResolve,
  type CompareRow,
} from "../rows";
import { FacetOptions } from "./FacetOptions";
import { ItemLogo } from "./ItemLogo";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/** Where a matched thing's rating comes from, said on the card. */
export const RATING_SOURCE: Record<string, string> = {
  local_business: "map listing", companies_reviews: "review page", products: "store page", social_accounts: "profile",
  list_items: "its page",
};

const NAME_LABEL: Record<string, string> = {
  local_business: "Business name", companies_reviews: "Company name", products: "Product name or link",
  social_accounts: "@handle or profile link", list_items: "Name",
};

/** The way out of a pick list: what to change, said for the kind (a product has no city). */
const NOT_LISTED: Record<string, string> = {
  local_business: "Not listed — edit the name or city", list_items: "Not listed — edit the name or city",
  products: "Not listed — edit the name or paste its page", companies_reviews: "Not listed — edit the name or website",
  social_accounts: "Not listed — edit the handle",
};

/** How long typing must pause before a card looks itself up. */
const MATCH_PAUSE_MS = 400;

const rowSig = (r: CompareRow) => `${r.name.trim()}|${r.city.trim()}|${r.website.trim()}`.toLowerCase();

/** Enough typed to ask: a place needs its name and where (or a website); the rest a name or a web address. */
function readyToMatch(r: CompareRow, places: boolean): boolean {
  const name = r.name.trim().length >= 3;
  const site = r.website.trim().includes(".") && r.website.trim().length >= 4;
  return places ? (name && (r.city.trim().length >= 2 || site)) || (site && name) : name || site;
}

export function Lineup({
  kind, rows, onRows, near, onNear, organizationId, onCompare, dense = false, starting = false,
}: {
  kind: ComparisonKindInfo;
  rows: CompareRow[];
  onRows: (update: (rows: CompareRow[]) => CompareRow[]) => void;
  near: string;
  onNear: (near: string) => void;
  organizationId: string;
  onCompare: (matches: LookupMatch[]) => void;
  /** Inside a narrower host (a chat card): at most two cards a row, the action bar not floating. */
  dense?: boolean;
  /** The host is starting the run the person confirmed. */
  starting?: boolean;
}) {
  const places = kind.key === "local_business";
  const matched = foundMatches(rows);
  const busy = rows.some((r) => r.state === "resolving");
  // a card with something typed that has not matched (yet): the bar says why Compare waits
  const unsettled = rows.some((r) => !isEmptyRow(r) && r.state !== "found" && r.state !== "resolving");
  const facets = useFacetKeys(kind.key);

  const quote = useQuery({
    queryKey: ["comparison", "quote", kind.key, organizationId, facets, JSON.stringify(matched.map((m) => m.item))],
    queryFn: ({ signal }) => quoteComparison(kind.key, matched.map((m) => m.item), { organizationId, signal }),
    enabled: matched.length >= 2,
    staleTime: 60_000,
  });

  const patch = (key: string, f: (r: CompareRow) => CompareRow) => onRows((rs) => rs.map((r) => (r.key === key ? f(r) : r)));

  // One look-up in flight per row counts: an edit (or a newer look-up) makes an older answer stale.
  const tokens = useRef(new Map<string, number>());
  const searched = useRef(new Map<string, string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  async function find(row: CompareRow) {
    const mine = (tokens.current.get(row.key) ?? 0) + 1;
    tokens.current.set(row.key, mine);
    searched.current.set(row.key, rowSig(row));
    patch(row.key, (r) => ({ ...r, state: "resolving", message: null }));
    // the answer shows the moment it lands, whatever it is (a match, a pick list, "no match"): an
    // unclear answer is never held back until the person leaves the card
    const settle = (next: (r: CompareRow) => CompareRow) => {
      if (tokens.current.get(row.key) !== mine) return; // edited or re-asked since
      patch(row.key, (r) => (r.state === "resolving" ? next(r) : r));
    };
    try {
      if (places) {
        const res = await resolveRow({ name: row.name, city: row.city, website: row.website }, { organizationId });
        settle((r) => withResolve(r, res));
      } else {
        const out = await lookupItems(kind.key, [rowItem(kind.key as KindKey, row)], { organizationId });
        settle((r) => withLookup(r, out.items[0]));
      }
    } catch (err) {
      const message = (err as { userMessage?: string })?.userMessage ?? "That search did not answer. Try again.";
      settle((r) => ({ ...r, state: "error", message }));
    }
  }

  /** Leaving the card (or Enter): look it up now, without waiting out the pause. */
  function done(row: CompareRow) {
    window.clearTimeout(timers.current.get(row.key));
    if (row.state === "resolving") return; // its answer shows when it lands
    if (needsSearch(row)) void find(row);
  }

  // Typing pauses ~400 ms → the card matches itself (no blur needed). The timers live in a ref and are
  // cleared per row only when that row changes, so a neighbour's answer never cancels this row's pause.
  const pauseKey = rows.map((r) => `${r.key}:${r.state}:${rowSig(r)}`).join("|");
  useEffect(() => {
    for (const r of rows) {
      const t = timers.current.get(r.key);
      if (t) window.clearTimeout(t);
      timers.current.delete(r.key);
      if (r.state !== "idle" || r.autoFind || !readyToMatch(r, places) || searched.current.get(r.key) === rowSig(r)) continue;
      timers.current.set(r.key, setTimeout(() => void find(r), MATCH_PAUSE_MS));
    }
    // pauseKey is the trigger: every edit restarts the pause
  }, [pauseKey]);
  useEffect(() => () => { for (const t of timers.current.values()) window.clearTimeout(t); }, []);

  // A row filled from the one-line box (or a pick list's "Add") looks itself up without a click.
  const started = useRef(new Set<string>());
  useEffect(() => {
    for (const r of rows) {
      if (r.autoFind && needsSearch(r) && !started.current.has(r.key)) {
        started.current.add(r.key);
        patch(r.key, (x) => ({ ...x, autoFind: false }));
        void find(r);
      }
    }
    // rows is the trigger; find/patch are stable enough for a one-shot per row key
  }, [rows]);

  const remove = (key: string) => onRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newRow()]));
  const canAdd = rows.length < MAX_ROWS;

  return (
    <section className="space-y-4" aria-label="Things to compare">
      {places ? (
        <div className="flex max-w-md items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <ProInput value={near} aria-label="Near"
            placeholder="Near — fills every empty city"
            onChange={(e) => { onNear(e.target.value); onRows((rs) => applyNear(rs, e.target.value)); }}
            wrapperClassName="flex-1" />
        </div>
      ) : null}

      <ol className={cn("grid gap-3 sm:grid-cols-2", !dense && "lg:grid-cols-3")}>
        {rows.map((row, i) => (
          <SlotCard key={row.key} index={i} row={row} kind={kind}
            onEdit={(p) => { tokens.current.set(row.key, (tokens.current.get(row.key) ?? 0) + 1); patch(row.key, (r) => editRow(r, p)); }}
            onFind={() => done(row)}
            onPick={(c) => patch(row.key, (r) => pickCandidate(r, c))}
            onChange={() => patch(row.key, (r) => ({ ...editRow(r, {}), focus: true }))}
            onRemove={() => remove(row.key)} />
        ))}
        {canAdd ? (
          <li>
            <AddTile onClick={() => onRows((rs) => [...rs, newRow(places && near.trim() ? { city: near.trim(), cityFromNear: true, focus: true } : { focus: true })])}>
              Add another
            </AddTile>
          </li>
        ) : null}
      </ol>

      {kind.facets?.length ? <FacetOptions kind={kind} itemCount={matched.length} /> : null}

      <div className={cn("flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between sm:pl-5",
        dense ? "border border-border bg-card" : "border border-glass-edge sm:sticky sm:bottom-3 sm:z-10 bg-glass shadow-glass backdrop-blur-glass backdrop-saturate-glass")}>
        <div className="type-secondary min-h-5 text-muted-foreground" aria-live="polite">
          {matched.length < 2 ? (
            <><span className="tabular-nums text-foreground">{matched.length}</span> of 2 matched
              {busy ? <span className="ml-2 inline-flex items-center gap-1"><Spinner size="xs" variant="ghost" label="Matching" />Matching</span>
                : unsettled ? <span className="ml-2">· Finish the open card</span> : null}</>
          ) : quote.data ? (
            <><span className="tabular-nums text-foreground">{matched.length}</span> matched · <CostDoor rows={[{ label: "Total", points: quote.data.total_points, usd: quote.data.total_usd }]} className="ml-1" /></>
          ) : quote.isError ? (
            <span className="inline-flex items-center gap-2">Price unavailable
              <Button variant="quiet" onClick={() => void quote.refetch()} disabled={quote.isFetching}>Try again</Button></span>
          ) : <span className="inline-block h-4 w-40 animate-pulse rounded bg-muted align-middle" aria-label="Pricing" />}
        </div>
        {/* Compare never waits on a card still matching: only the matched cards are sent. A click answers at
            once (the button shows "starting"), and a price still loading says so instead of sitting dead. */}
        <Button variant="primary" hero={!dense} disabled={matched.length < 2 || starting || !quote.data}
          aria-busy={starting || (matched.length >= 2 && !quote.data && !quote.isError)}
          data-compare-confirm-button="" onClick={() => onCompare(matched)}>
          {starting ? "Starting…" : matched.length >= 2 ? `Compare ${matched.length}` : "Compare"}
        </Button>
      </div>
    </section>
  );
}

function SlotCard({ index, row, kind, onEdit, onFind, onPick, onChange, onRemove }: {
  index: number;
  row: CompareRow;
  kind: ComparisonKindInfo;
  onEdit: (p: Partial<Pick<CompareRow, "name" | "city" | "website">>) => void;
  onFind: () => void;
  onPick: (c: ResolveCandidate) => void;
  onChange: () => void;
  onRemove: () => void;
}) {
  const places = kind.key === "local_business";
  const companies = kind.key === "companies_reviews";
  const photo = places || kind.key === "products";
  const found = row.state === "found" && row.match;

  // Focus leaving the card (not moving between its own fields) is "I'm done with this one".
  function onBlur(e: React.FocusEvent<HTMLFormElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    onFind();
  }

  return (
    <li className={cn("relative flex min-h-40 flex-col rounded-2xl border bg-card p-4 transition-colors",
      found ? "border-border" : row.state === "choose" ? "border-warning"
        : row.state === "error" ? "border-destructive" : "border-border")}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full type-meta font-semibold tabular-nums",
          found ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</span>
        {found ? <span className="type-meta inline-flex items-center gap-1 text-success-ink"><Check className="h-3.5 w-3.5" aria-hidden />Matched</span>
          : row.state === "resolving" ? <span className="type-meta inline-flex items-center gap-1 text-muted-foreground" aria-label="Looking it up">
            <Spinner size="xs" variant="ghost" label="Matching" />Matching</span>
          : row.state === "choose" ? <Badge tone="warning">{row.candidates.length > 1 ? "Pick one" : "Is this it?"}</Badge>
          : row.state === "not_found" ? <Badge tone="neutral">No match</Badge> : null}
        <span className="flex-1" />
        {found ? <Button variant="quiet" icon={<Pencil className="h-4 w-4" />} aria-label={`Change ${row.match?.name ?? "this one"}`} onClick={onChange} /> : null}
        <Button variant="quiet" removes aria-label={`Remove ${index + 1}`} icon={<X className="h-4 w-4" />} onClick={onRemove} />
      </div>

      {found && row.match ? (
        <MatchBody match={row.match} category={row.category} photo={photo} source={RATING_SOURCE[kind.key] ?? "source"} />
      ) : (
        <form className="flex flex-1 flex-col gap-2" onBlur={onBlur}
          onSubmit={(e) => { e.preventDefault(); onFind(); }}>
          <ProInput value={row.name} autoFocus={row.focus} aria-label={`${NAME_LABEL[kind.key] ?? "Name"} ${index + 1}`}
            placeholder={NAME_LABEL[kind.key] ?? "Name"} onChange={(e) => onEdit({ name: e.target.value })} />
          {places || kind.key === "list_items" ? (
            <ProInput value={row.city} aria-label={`City ${index + 1}`} placeholder={places ? "City or area" : "City (optional)"}
              onChange={(e) => onEdit({ city: e.target.value })} />
          ) : null}
          {places || companies ? (
            <ProInput value={row.website} aria-label={`Website ${index + 1}`} placeholder="Website (optional)"
              onChange={(e) => onEdit({ website: e.target.value })} />
          ) : null}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
          <SlotAnswer row={row} photo={photo} places={places} kind={kind} onPick={onPick} />
        </form>
      )}
    </li>
  );
}

function RatingLine({ match, source }: { match: LookupMatch; source: string }) {
  if (match.rating === null && match.reviews_count === null) return null;
  return (
    <span className="type-meta inline-flex items-center gap-1 text-muted-foreground">
      {match.rating !== null ? (<><Star className="h-3 w-3 fill-current text-warning" aria-hidden />
        <span className="font-medium tabular-nums text-foreground">{match.rating.toFixed(1)}</span></>) : null}
      {match.reviews_count !== null ? <span className="tabular-nums">({formatCount(match.reviews_count)})</span> : null}
      <span>· {source}</span>
    </span>
  );
}

function MatchBody({ match, category, photo, source }: { match: LookupMatch; category: string; photo: boolean; source: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <ItemLogo name={match.name} logoUrl={match.logo_url} website={match.website} size={64} fill={photo} />
      <div className="min-w-0 space-y-1">
        {match.url ? (
          <OutboundLink href={match.url}
            className="group inline-flex max-w-full items-start gap-1 text-base font-semibold text-foreground hover:underline" title={match.name}>
            <span className="line-clamp-2">{match.name}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden />
          </OutboundLink>
        ) : <span className="line-clamp-2 text-base font-semibold text-foreground" title={match.name}>{match.name}</span>}
        {category ? <Chip label={category.split(",")[0]} tone="neutral" /> : null}
        {match.detail && !category.startsWith(match.detail) ? <div className="type-secondary truncate text-muted-foreground" title={match.detail}>{match.detail}</div> : null}
        <RatingLine match={match} source={source} />
      </div>
    </div>
  );
}

function SlotAnswer({ row, photo, places, kind, onPick }: { row: CompareRow; photo: boolean; places: boolean; kind: ComparisonKindInfo; onPick: (c: ResolveCandidate) => void }) {
  if (row.state === "choose") {
    return (
      <div className="mt-1 space-y-1.5">
        <p className="type-secondary text-muted-foreground">{row.message ?? "Is it one of these?"}</p>
        <ul className="space-y-1">
          {row.candidates.slice(0, 5).map((c, n) => (
            <li key={`${c.match.item.url ?? c.match.url ?? c.match.name}-${n}`}>
              <MediaOption onClick={() => onPick(c)} size={48}
                media={<ItemLogo name={c.match.name} logoUrl={c.match.logo_url} website={c.match.website} size={48} fill={photo} />}
                title={c.match.name}
                lines={[c.category?.split(",")[0], c.match.detail && !(c.category ?? "").startsWith(c.match.detail) ? c.match.detail : null]}
                facts={c.match.rating !== null ? (
                  <><Star className="h-3 w-3 fill-current text-warning" aria-hidden />
                    <span className="font-medium tabular-nums text-foreground">{c.match.rating.toFixed(1)}</span>
                    {c.match.reviews_count !== null ? <span className="tabular-nums">({formatCount(c.match.reviews_count)})</span> : null}</>
                ) : undefined} />
            </li>
          ))}
        </ul>
        <p className="type-meta text-muted-foreground">{NOT_LISTED[kind.key] ?? "Not listed — edit the name"}</p>
      </div>
    );
  }
  // These states keep one reserved line, so a pause-triggered look-up never moves the fields.
  if (row.state === "not_found") {
    // "No match" is an answer, not a failure: plain words and the way out (the fields above are the edit)
    return <div className="min-h-10"><p className="type-secondary text-muted-foreground">{row.message ?? "No match. Check the spelling, or add its website."}</p></div>;
  }
  if (row.state === "error") {
    return <div className="min-h-10"><p className="type-secondary text-destructive-ink">{row.message}</p></div>;
  }
  return <div className="min-h-10" aria-hidden />;
}

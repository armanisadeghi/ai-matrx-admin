"use client";

/**
 * THE comparison result stage. Renders from a `ComparisonResult` alone — no fetching, no page state —
 * so the signed-in page and a later public page (from a saved run id) render the same component.
 *
 * Champions: Versus.com (every number on its own scale, with bars), G2 Compare (leader marked per
 * row), Google's comparison cards (logos, one-line verdict), Wirecutter (a verdict you can read in
 * one breath). We add what they lack: the source of every number on hover, each item's own facts one
 * click away, and honest gaps ("—" with the reason) instead of a confident zero.
 */

import { tookWords } from "@/features/data-sources/library/runTiming";
import { UnderTheHood } from "@/features/data-sources/library/UnderTheHood";
import type { ReactNode } from "react";
import { ExternalLink, Table2, Trophy } from "lucide-react";
import { Badge, Tile } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

import { CopyButtons } from "@/components/agent-copy/CopyButtons";

import { cn } from "@/lib/utils";

import type { CompareField, ComparedItem, ComparisonResult } from "../contract";
import { comparisonCopyProps } from "../copy";
import { barFraction, comparedItems, fieldGroups, isNumeric, headlineOf, leadsPhrase, verdictOf, whyLine } from "../verdict";
import { hasSideBySide, isCardOnly, isRich } from "../place-facts";
import { ItemLogo } from "./ItemLogo";
import { ClosedFlag, ReviewsDisclosure, RichField } from "./PlaceFacts";
import { ConfirmFacetLine, isUnconfirmed, type FacetConfirm } from "./ConfirmFacetLine";

export interface ComparisonViewProps {
  result: ComparisonResult;
  /** Where an item's raw facts open (a new tab); null hides the door (a public page). */
  factsHref?: (item: ComparedItem) => string | null;
  /** Actions on the right of the verdict (new comparison, share later). */
  actions?: ReactNode;
  /** An item that needs a pick: what to do with the chosen candidate. */
  onPick?: (item: ComparedItem, pick: string) => void;
  /** Answers "Is this them?" for a facet page that only resembles the company; absent = the line is read-only. */
  onConfirm?: FacetConfirm;
  /** The way out when nothing could be compared (another kind, edit the names); absent = none offered. */
  wayOut?: ReactNode;
}

/** Kinds whose picture is a photo (a place, a product, an avatar) and fills its square. */
const isPhoto = (kind: string) => kind === "local_business" || kind === "products" || kind === "social_accounts";

/** The title when no one leads: compared side by side (no rating to rank by), or honestly nothing found. */
export function noLeaderTitle(result: ComparisonResult): string {
  if (comparedItems(result).length > 0) return "Side by side";
  if (result.kind === "companies_reviews" && result.items.length > 0 && result.items.every((i) => i.error)) {
    return "We couldn't find public data for these companies";
  }
  return "Nothing to compare yet";
}

export function ComparisonView({ result, factsHref, actions, onPick, onConfirm, wayOut }: ComparisonViewProps) {
  const verdict = verdictOf(result);
  const compared = comparedItems(result);
  const primary = result.fields.find((f) => f.is_primary) ?? null;
  const groups = fieldGroups(result.fields);
  const leader = verdict.leader;
  const headline = headlineOf(result);
  const title = !leader ? noLeaderTitle(result)
    : verdict.tie ? "A tie at the top"
    : (headline?.lead ?? leader.name);
  const reading = !leader ? ""
    : verdict.tie ? `${compared.filter((i) => i.rank === 1).map((i) => i.name).join(" and ")} are level`
    : (headline?.rest ?? leadsPhrase(verdict));

  return (
    <div className="space-y-8">
      {/* ── the verdict: a media object, the picture spans the whole text block ── */}
      <section className={cn("grid items-start gap-y-0.5", leader ? "grid-cols-[auto_minmax(0,1fr)] gap-x-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_auto]")}>
        {leader ? (
          <div className="col-start-1 row-span-3 row-start-1 h-full min-h-20 w-28 self-stretch overflow-hidden rounded-xl border border-border sm:w-44">
            <ItemLogo name={leader.name} logoUrl={leader.logo_url} website={leader.website} size={56}
              fill={isPhoto(result.kind)} cover />
          </div>
        ) : null}
        <div className={cn("type-label flex items-center gap-1.5", leader && "col-start-2")}>
          <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden />
          {result.kind_label}
        </div>
        <h1 className={cn("text-balance break-words text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl", leader && "col-start-2")} title={title}>
          {title}
        </h1>
        {reading ? (
          <p className={cn("type-secondary line-clamp-2 text-muted-foreground", leader && "col-start-2")} title={reading}>{reading}</p>
        ) : null}
        <div className="col-span-full row-start-4 mt-3 flex flex-wrap items-center gap-2 sm:col-span-1 sm:col-start-[-2] sm:row-start-2 sm:mt-0 sm:justify-end sm:self-center">
          {compared.length > 0 ? <CopyButtons size="sm" {...comparisonCopyProps(result)} /> : null}
          {actions}
        </div>
      </section>

      {compared.length === 0 && wayOut ? <div className="flex flex-wrap gap-2">{wayOut}</div> : null}

      {/* ── the contenders ────────────────────────────────────── */}
      <section
        className="-mx-[var(--matrx-page-gutter,1rem)] flex snap-x gap-3 overflow-x-auto px-[var(--matrx-page-gutter,1rem)] pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0"
        style={{ gridTemplateColumns: `repeat(${Math.min(result.items.length, 4)}, minmax(0, 1fr))` }}
        aria-label="Ranked"
      >
        {result.items.map((item) => (
          <ContenderCard key={item.item_id} item={item} primary={primary} kind={result.kind} result={result}
            factsHref={factsHref} onPick={onPick} />
        ))}
      </section>

      {/* ── field by field, grouped by source (a company's facets each get their own group) ── */}
      {compared.length > 0 ? groups.map((g) => {
        const numeric = g.fields.filter(isNumeric);
        const rich = g.fields.filter((f) => isRich(f) && hasSideBySide(f, result));
        const text = g.fields.filter((f) => !isNumeric(f) && !isRich(f) && !isCardOnly(f));
        return (
          <div key={g.key || "own"} className="space-y-3">
            {g.label ? <FacetHeading result={result} facetKey={g.key} label={g.label} confirm={onConfirm} /> : null}
            {numeric.length > 0 ? (
              <section className="grid gap-3 md:grid-cols-2" aria-label={g.label || "Field by field"}>
                {numeric.map((f) => <FieldCard key={f.key} field={f} result={result} />)}
              </section>
            ) : null}
            {rich.length > 0 ? (
              <section className="grid gap-3 md:grid-cols-2" aria-label={`${g.label || "Place"} facts`}>
                {rich.map((f) => <RichField key={f.key} field={f} result={result} />)}
              </section>
            ) : null}
            {text.length > 0 ? <DetailsTable fields={text} items={compared} label={g.label || "Details"} /> : null}
          </div>
        );
      }) : null}

      {/* ── when it was made ─────────────────────────────────────── */}
      <section className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4">
        {result.generated_at ? (
          <span className="type-meta text-muted-foreground">{new Date(result.generated_at).toLocaleString()}</span>
        ) : null}
        <HiddenNote result={result} />
      </section>
    </div>
  );
}

/** A facet group's title and, when it could not be read for some items, which ones and why. */
function FacetHeading({ result, facetKey, label, confirm }: {
  result: ComparisonResult; facetKey: string; label: string; confirm?: FacetConfirm;
}) {
  const rows = comparedItems(result).map((i) => ({ item: i, f: i.facets?.find((x) => x.key === facetKey) }));
  const failed = rows.filter((r) => r.f?.status === "failed" && !isUnconfirmed(r.f));
  const asking = rows.filter((r) => r.f && isUnconfirmed(r.f));
  // The facet's items read side by side: it took as long as its slowest read.
  const secs = rows.map((r) => r.f?.seconds).filter((v): v is number => typeof v === "number");
  const took = secs.length ? Math.max(...secs) * 1000 : null;
  return (
    <div className="space-y-1.5 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="type-title text-foreground">{label}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {took != null ? <span className="type-meta text-muted-foreground" data-facet-took={facetKey}>{tookWords(took)}</span> : null}
          {failed.map(({ item, f }) => (
            <span key={item.item_id} className="type-meta text-muted-foreground" title={f?.error ?? undefined}>
              Not found for {item.name}
            </span>
          ))}
        </div>
      </div>
      {asking.map(({ item, f }) => (
        <ConfirmFacetLine key={item.item_id} item={item} facet={f as NonNullable<typeof f>} confirm={confirm} />
      ))}
      {rows.filter((r) => r.f?.job_id).map(({ item, f }) => (
        <UnderTheHood key={item.item_id} jobId={f?.job_id} facetLabel={`${label} · ${item.name}`} />
      ))}
    </div>
  );
}

function DetailsTable({ fields, items, label }: { fields: CompareField[]; items: ComparedItem[]; label: string }) {
  return (
    <section className="rounded-xl border border-border bg-card" aria-label={label}>
      {fields.map((f, i) => (
        <div key={f.key} data-assist-row="" className={cn("grid gap-3 px-4 py-3 sm:grid-cols-[9rem_1fr]", i > 0 && "border-t border-border")}>
          <div className="type-label pt-0.5" title={f.help}>{f.label}</div>
          <div className="grid gap-x-6 gap-y-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(12rem, 1fr))` }}>
            {items.map((it) => {
              const v = it.values[f.key];
              return (
                <div key={it.item_id} className="min-w-0">
                  <div className="type-meta truncate text-muted-foreground">{it.name}</div>
                  <div className="flex items-start gap-1">
                    <div className="type-body line-clamp-3 min-w-0 text-foreground">
                      {v && v.display !== "—" ? v.display : <span className="text-muted-foreground">—</span>}
                    </div>
                  </div>
                  {v?.basis ? <SourceLine basis={v.basis} /> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Fields left out because every item shares them — named once, so nothing is silently dropped. */
function HiddenNote({ result }: { result: ComparisonResult }) {
  const same = (result.hidden_fields ?? []).filter((h) => h.reason === "constant");
  if (!same.length) return null;
  const all = same.map((h) => h.label).join(", ");
  return <span className="type-meta truncate text-muted-foreground" title={all}>Same for all · {all}</span>;
}

/** Where a value came from, printed on the cell itself — never hover-only. */
function SourceLine({ basis, className }: { basis: string; className?: string }) {
  return <span className={cn("type-meta block truncate text-muted-foreground", className)} title={basis}>{basis}</span>;
}

function ContenderCard({ item, primary, kind, result, factsHref, onPick }: {
  item: ComparedItem; primary: CompareField | null; kind: string; result: ComparisonResult;
  factsHref?: (item: ComparedItem) => string | null; onPick?: (item: ComparedItem, pick: string) => void;
}) {
  const failed = Boolean(item.error);
  const choosing = item.needs_choice;
  const lead = item.rank === 1 && !failed && !choosing;
  const pv = primary ? item.values[primary.key] : undefined;
  const facts = factsHref?.(item) ?? null;

  return (
    <article
      className={cn(
        "relative flex min-w-[15rem] snap-start flex-col overflow-hidden rounded-xl border bg-card sm:min-w-0",
        lead ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        <ItemLogo name={item.name} logoUrl={item.logo_url} website={item.website} size={72} fill={isPhoto(kind)} cover />
        {!failed && !choosing && item.rank > 0 ? (
          <Badge tone={lead ? "primary" : "neutral"} className="absolute left-2 top-2" aria-label={`Rank ${item.rank}`}>{item.rank}</Badge>
        ) : null}
        {item.source_label ? <Badge className="absolute right-2 top-2">{item.source_label}</Badge> : null}
        <ClosedFlag item={item} />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-foreground" title={item.name}>{item.name}</div>
        {item.website ? (
          <OutboundLink href={`https://${item.website}`} className="type-secondary truncate text-muted-foreground hover:text-foreground hover:underline">
            {item.website}
          </OutboundLink>
        ) : <div className="type-secondary text-muted-foreground">&nbsp;</div>}
      </div>

      {failed ? (
        <ErrorNotice size="inline" message={item.error} />
      ) : choosing ? (
        <div className="space-y-1.5">
          <div className="type-label">Which one?</div>
          {item.candidates.slice(0, 4).map((c) => (
            <Tile key={c.pick} onClick={() => onPick?.(item, c.pick)} title={c.name} line={c.address} />
          ))}
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5" title={pv?.basis || undefined}>
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{pv?.display ?? "—"}</span>
          {primary ? <span className="type-secondary text-muted-foreground">{primary.label.toLowerCase()}</span> : null}
        </div>
      )}
      {!failed && !choosing && pv?.basis ? <SourceLine basis={pv.basis} /> : null}
      {!failed && !choosing && item.source_error && item.source_error !== pv?.basis ? <SourceLine basis={item.source_error} /> : null}
      {!failed && !choosing && item.thin_sample ? <div><Badge tone="warning">{item.thin_sample}</Badge></div> : null}

      {!failed && !choosing ? <ReviewsDisclosure item={item} /> : null}

      <div className="mt-auto flex items-center gap-3 pt-1">
        {facts ? (
          <OutboundLink href={facts} className="type-secondary inline-flex items-center gap-1 text-primary hover:underline">
            <Table2 className="h-3.5 w-3.5" aria-hidden /> Facts
          </OutboundLink>
        ) : null}
        {item.source_url ? (
          <OutboundLink href={item.source_url} className="type-secondary inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Source
          </OutboundLink>
        ) : null}
        {!failed && !choosing ? <CopyButtons size="xs" className="ml-auto" {...comparisonCopyProps(result, item.item_id)} /> : null}
      </div>
      </div>
    </article>
  );
}

function FieldCard({ field, result }: { field: CompareField; result: ComparisonResult }) {
  const items = comparedItems(result);
  const why = whyLine(field, result);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="type-title text-foreground" title={field.help || undefined}>{field.label}</h2>
        {field.is_primary ? <Badge tone="primary">Ranks by</Badge> : null}
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => {
          const v = it.values[field.key];
          const frac = barFraction(field, v?.value, result);
          return (
            <li key={it.item_id} className="grid grid-cols-[1.75rem_minmax(0,6rem)_minmax(2rem,1fr)_auto] items-center gap-2.5 sm:grid-cols-[1.75rem_minmax(0,9rem)_1fr_auto]">
              <ItemLogo name={it.name} logoUrl={it.logo_url} website={it.website} size={28} fill={isPhoto(result.kind)} />
              <span className="type-body truncate text-foreground" title={it.name}>{it.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted" title={v?.basis || undefined}>
                {frac !== null ? (
                  <span className={cn("block h-full rounded-full transition-[width] duration-700 ease-out",
                    v?.is_best ? "bg-primary" : "bg-primary/35")} style={{ width: `${Math.max(frac * 100, 2)}%` }} />
                ) : null}
              </span>
              <span className={cn("min-w-14 whitespace-nowrap text-right tabular-nums", v?.is_best ? "font-semibold text-foreground" : "text-foreground",
                (!v || v.display === "—") && "text-muted-foreground")} title={v?.basis || undefined}>
                {v?.display ?? "—"}
              </span>
              {v?.basis ? <SourceLine basis={v.basis} className="col-span-2 col-start-2 sm:col-span-3" /> : null}
            </li>
          );
        })}
      </ul>
      <p className="type-secondary mt-3 truncate text-muted-foreground" title={why}>{why}</p>
    </div>
  );
}

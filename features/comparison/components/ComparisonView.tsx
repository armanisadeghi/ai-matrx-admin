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

import type { ReactNode } from "react";
import { ExternalLink, Table2, Trophy } from "lucide-react";
import { Badge, Tile } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatPoints } from "@ai-matrx/kit/format";

import { cn } from "@/lib/utils";

import type { CompareField, ComparedItem, ComparisonResult } from "../contract";
import { barFraction, comparedItems, fieldGroups, isNumeric, headlineOf, verdictOf, whyLine } from "../verdict";
import { ItemLogo } from "./ItemLogo";

export interface ComparisonViewProps {
  result: ComparisonResult;
  /** A dollar-seat viewer also sees dollars, to the cent. Points are always shown. */
  seesDollars?: boolean;
  /** Where an item's raw facts open (a new tab); null hides the door (a public page). */
  factsHref?: (item: ComparedItem) => string | null;
  /** Actions on the right of the verdict (new comparison, share later). */
  actions?: ReactNode;
  /** An item that needs a pick: what to do with the chosen candidate. */
  onPick?: (item: ComparedItem, pick: string) => void;
}

/** Kinds whose picture is a photo (a place, a product, an avatar) and fills its square. */
const isPhoto = (kind: string) => kind === "local_business" || kind === "products" || kind === "social_accounts";

export function ComparisonView({ result, seesDollars = false, factsHref, actions, onPick }: ComparisonViewProps) {
  const verdict = verdictOf(result);
  const compared = comparedItems(result);
  const primary = result.fields.find((f) => f.is_primary) ?? null;
  const groups = fieldGroups(result.fields);
  const leader = verdict.leader;
  const headline = headlineOf(result);

  return (
    <div className="space-y-8">
      {/* ── the verdict ───────────────────────────────────────── */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {leader ? (
            <ItemLogo name={leader.name} logoUrl={leader.logo_url} website={leader.website} size={64}
              fill={isPhoto(result.kind)} />
          ) : null}
          <div className="min-w-0">
            <div className="type-label mb-1 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden />
              {result.kind_label}
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
              {leader ? (
                verdict.tie ? <>A tie at the top</>
                  : headline ? <>{headline.lead} <span className="text-muted-foreground">{headline.rest}</span></>
                  : <>{leader.name} <span className="text-muted-foreground">leads on {verdict.leads} of {verdict.total}</span></>
              ) : (
                <>Nothing to compare yet</>
              )}
            </h1>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </section>

      {/* ── the contenders ────────────────────────────────────── */}
      <section
        className="-mx-[var(--matrx-page-gutter,1rem)] flex snap-x gap-3 overflow-x-auto px-[var(--matrx-page-gutter,1rem)] pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0"
        style={{ gridTemplateColumns: `repeat(${Math.min(result.items.length, 4)}, minmax(0, 1fr))` }}
        aria-label="Ranked"
      >
        {result.items.map((item) => (
          <ContenderCard key={item.item_id} item={item} primary={primary} kind={result.kind}
            factsHref={factsHref} onPick={onPick} />
        ))}
      </section>

      {/* ── field by field, grouped by source (a company's facets each get their own group) ── */}
      {compared.length > 0 ? groups.map((g) => {
        const numeric = g.fields.filter(isNumeric);
        const text = g.fields.filter((f) => !isNumeric(f));
        return (
          <div key={g.key || "own"} className="space-y-3">
            {g.label ? <FacetHeading result={result} facetKey={g.key} label={g.label} /> : null}
            {numeric.length > 0 ? (
              <section className="grid gap-3 md:grid-cols-2" aria-label={g.label || "Field by field"}>
                {numeric.map((f) => <FieldCard key={f.key} field={f} result={result} />)}
              </section>
            ) : null}
            {text.length > 0 ? <DetailsTable fields={text} items={compared} label={g.label || "Details"} /> : null}
          </div>
        );
      }) : null}

      {/* ── what it cost ──────────────────────────────────────── */}
      <section className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4">
        <span className="type-secondary text-muted-foreground">
          Cost <span className="font-medium text-foreground tabular-nums">{formatPoints(result.total_points)}</span>
          {seesDollars && result.total_cost_display ? <span className="tabular-nums"> · {result.total_cost_display}</span> : null}
        </span>
        {result.generated_at ? (
          <span className="type-meta text-muted-foreground">{new Date(result.generated_at).toLocaleString()}</span>
        ) : null}
        <HiddenNote result={result} />
      </section>
    </div>
  );
}

/** A facet group's title and, when it could not be read for some items, which ones and why. */
function FacetHeading({ result, facetKey, label }: { result: ComparisonResult; facetKey: string; label: string }) {
  const rows = comparedItems(result).map((i) => ({ item: i, f: i.facets?.find((x) => x.key === facetKey) }));
  const failed = rows.filter((r) => r.f?.status === "failed");
  const slowest = Math.max(0, ...rows.map((r) => r.f?.seconds ?? 0));
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2">
      <h2 className="type-title text-foreground">{label}</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {failed.map(({ item, f }) => (
          <span key={item.item_id} className="type-meta text-muted-foreground" title={f?.error ?? undefined}>
            Not found for {item.name}
          </span>
        ))}
        {slowest >= 1 ? <span className="type-meta tabular-nums text-muted-foreground">{Math.round(slowest)} s</span> : null}
      </div>
    </div>
  );
}

function DetailsTable({ fields, items, label }: { fields: CompareField[]; items: ComparedItem[]; label: string }) {
  return (
    <section className="rounded-xl border border-border bg-card" aria-label={label}>
      {fields.map((f, i) => (
        <div key={f.key} className={cn("grid gap-3 px-4 py-3 sm:grid-cols-[9rem_1fr]", i > 0 && "border-t border-border")}>
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

function ContenderCard({ item, primary, kind, factsHref, onPick }: {
  item: ComparedItem; primary: CompareField | null; kind: string;
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
        "relative flex min-w-[15rem] snap-start flex-col gap-3 rounded-xl border bg-card p-4 sm:min-w-0",
        lead ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ItemLogo name={item.name} logoUrl={item.logo_url} website={item.website} size={44} fill={isPhoto(kind)} />
        <div className="flex items-center gap-1.5">
        {item.source_label ? <Badge>{item.source_label}</Badge> : null}
        {!failed && !choosing && item.rank > 0 ? (
          <span className={cn("flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums",
            lead ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground")}
          aria-label={`Rank ${item.rank}`}>
            {item.rank}
          </span>
        ) : null}
        </div>
      </div>

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

      <div className="mt-auto flex items-center gap-3 pt-1">
        {facts ? (
          <a href={facts} target="_blank" rel="noopener" className="type-secondary inline-flex items-center gap-1 text-primary hover:underline">
            <Table2 className="h-3.5 w-3.5" aria-hidden /> Facts
          </a>
        ) : null}
        {item.source_url ? (
          <OutboundLink href={item.source_url} className="type-secondary inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Source
          </OutboundLink>
        ) : null}
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
            <li key={it.item_id} className="grid grid-cols-[1.25rem_minmax(0,6rem)_minmax(2rem,1fr)_auto] items-center gap-2.5 sm:grid-cols-[1.25rem_minmax(0,9rem)_1fr_auto]">
              <ItemLogo name={it.name} logoUrl={it.logo_url} website={it.website} size={20} fill={isPhoto(result.kind)} />
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

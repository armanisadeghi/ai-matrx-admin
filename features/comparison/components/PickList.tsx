"use client";

/**
 * What a concept found — REAL entities only, in the source's own order (a map search's list: photo, name,
 * the map's category, address, stars with their count), with one honest line on how the list was made
 * and the reasons one tap away (Wirecutter's "How we picked"). Nothing is preselected into the lineup:
 * the person adds the ones they mean, one tap each; "Add top N" is there when the search ranked them.
 */

import { formatCount } from "@ai-matrx/kit/format";
import { ExternalLink, Plus, Check, Star, X } from "lucide-react";
import { Badge, Button, Chip, FieldHelp } from "@ai-matrx/design-system/controls";

import type { LookupMatch } from "../contract";
import type { DiscoverResult } from "../discovery";
import { inLineup, MAX_ROWS, type CompareRow } from "../rows";
import { ItemLogo } from "./ItemLogo";
import { RATING_SOURCE } from "./Lineup";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export function PickList({ result, rows, onAdd, onClose }: {
  result: DiscoverResult;
  rows: CompareRow[];
  onAdd: (matches: { match: LookupMatch; category: string }[]) => void;
  onClose: () => void;
}) {
  const places = result.kind === "local_business";
  const photo = places || result.kind === "products";
  const filled = rows.filter((r) => r.state === "found").length;
  const room = MAX_ROWS - filled;
  const top = result.items.filter((i) => i.preselected && !inLineup(rows, i.match));
  const wanted = result.reading.wanted;
  // a place's note is its map category; other kinds' notes are a fact line
  const categoryOf = (note: string) => (places ? note : "");

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-label="Found">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 break-words text-lg font-semibold tracking-tight text-foreground">{result.reading.summary || "Found"}</h2>
            {wanted ? <Badge tone="primary">{`Pick ${wanted}`}</Badge> : null}
            {result.guessed ? <Badge tone="warning">Our guess</Badge> : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="type-secondary min-w-0 break-words text-muted-foreground">{result.disclosure}</span>
            {result.how.length ? (
              <FieldHelp label="How we picked" triggerLabel="How we picked">
                <ul className="space-y-1">{result.how.map((h) => <li key={h}>{h}</li>)}</ul>
              </FieldHelp>
            ) : null}
          </div>
          {result.notes.filter((n) => !/^Pick \d/.test(n)).map((n) => (
            <p key={n} className="type-secondary text-warning-ink">{n}</p>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
        {top.length > 1 && room >= 2 ? (
          <Button variant="outline" icon={<Plus className="h-4 w-4" />}
            onClick={() => onAdd(top.slice(0, room).map((i) => ({ match: i.match, category: categoryOf(i.note) })))}>
            {`Add top ${Math.min(top.length, room)}`}
          </Button>
        ) : null}
        <Button variant="quiet" aria-label="Close the found list" icon={<X className="h-4 w-4" />} onClick={onClose} />
        </div>
      </div>

      {result.items.length ? (
        <ol className="max-h-[28rem] divide-y divide-border overflow-y-auto scrollbar-thin">
          {result.items.map((it) => {
            const m = it.match;
            const added = inLineup(rows, m);
            const category = categoryOf(it.note);
            return (
              <li key={`${it.rank}-${m.item.url ?? m.name}`} className="flex items-center gap-3 px-4 py-3">
                <span className="type-meta w-5 shrink-0 text-right tabular-nums text-muted-foreground">{it.rank}</span>
                <ItemLogo name={m.name} logoUrl={m.logo_url} website={m.website} size={48} fill={photo} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="line-clamp-2 min-w-0 break-words text-base font-semibold text-foreground" title={m.name}>{m.name}</span>
                    {m.url ? (
                      <OutboundLink href={m.url} aria-label={`Open ${m.name}`}
                        className="shrink-0 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></OutboundLink>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    {category ? <Chip label={category.split(",")[0]} tone="neutral" /> : null}
                    {m.rating !== null ? (
                      <span className="type-meta inline-flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3 w-3 fill-current text-warning" aria-hidden />
                        <span className="font-medium tabular-nums text-foreground">{m.rating.toFixed(1)}</span>
                        {m.reviews_count !== null ? <span className="tabular-nums">({formatCount(m.reviews_count)})</span> : null}
                        <span>· {RATING_SOURCE[result.kind] ?? "source"}</span>
                      </span>
                    ) : null}
                  </div>
                  {m.detail ? <div className="type-secondary line-clamp-2 break-words text-muted-foreground" title={m.detail}>{m.detail}</div> : null}
                </div>
                <Button variant={added ? "quiet" : "outline"} disabled={added || room <= 0}
                  icon={added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  onClick={() => onAdd([{ match: m, category }])}>
                  {added ? "Added" : "Add"}
                </Button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="type-secondary p-4 text-muted-foreground">{result.notes[0] ?? "Nothing came back. Type the names below."}</p>
      )}
    </section>
  );
}

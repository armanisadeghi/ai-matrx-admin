"use client";

/**
 * Smart Add — the "On the web" step: the top web results from every engine, merged and deduped,
 * one row each (the site's own icon, title, the exact address, the snippet, Open, which engines and
 * at what rank), and ONE question per row: what is this to us? The answers are the shared
 * vocabulary `web.brand_relation_kind` (the social rows answer from the same table). A rule-based
 * suggestion (webKinds.suggestKind, no AI) is offered as the highlighted option with its reason in a
 * tooltip; it is never set for the person. Answered rows group by their answer.
 */

import { useState } from "react";
import { ExternalLink, Lightbulb, X } from "lucide-react";
import { Button, SegmentedControl, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import type { EvidenceItem } from "./evidence";
import { webRow } from "./evidence";
import { outboundHref } from "./SmartAddExtras";
import {
  engineRanks,
  groupByKind,
  STANCE_LABEL,
  STANCE_ORDER,
  suggestKind,
  type Sentiment,
  type SuggestContext,
  type WebChoice,
} from "./webKinds";

/** Rows shown before "Show more". */
const TOP = 10;

const SENTIMENTS: { value: Sentiment; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

function orderedKinds(kinds: BrandRelationKind[]): BrandRelationKind[] {
  return [...kinds].sort(
    (a, b) => STANCE_ORDER.indexOf(a.stance) - STANCE_ORDER.indexOf(b.stance) || Number(b.isKnown) - Number(a.isKnown),
  );
}

function WebResultRow({
  item,
  kinds,
  choice,
  ctx,
  onChoose,
}: {
  item: EvidenceItem;
  kinds: BrandRelationKind[];
  choice: WebChoice | undefined;
  ctx: SuggestContext;
  onChoose: (choice: WebChoice | null) => void;
}) {
  const [iconOk, setIconOk] = useState(true);
  const url = item.url ?? item.value;
  const suggestion = suggestKind(item, kinds, ctx);
  const suggested = suggestion ? kinds.find((k) => k.key === suggestion.kind) : undefined;
  const chosen = choice ? kinds.find((k) => k.key === choice.kind) : undefined;
  const options: SelectOption<string>[] = [
    { value: "", label: "What is it?" },
    ...orderedKinds(kinds).map((k) => ({ value: k.key, label: k.label, meta: STANCE_LABEL[k.stance] })),
  ];
  const pick = (key: string) => (key ? onChoose({ kind: key, sentiment: null }) : onChoose(null));
  const ranks = engineRanks(item);
  return (
    <li
      className="flex items-start gap-2.5 py-2"
      data-testid="smart-add-web-item"
      data-field={item.field}
      data-key={item.key}
      data-choice={choice?.kind ?? ""}
      data-suggested={suggestion?.kind ?? ""}
    >
      {item.image_url && iconOk ? (
        <img
          src={item.image_url}
          alt=""
          className="mt-0.5 size-5 shrink-0 rounded object-contain"
          loading="lazy"
          onError={() => setIconOk(false)}
        />
      ) : (
        <span className="mt-0.5 size-5 shrink-0 rounded bg-muted" aria-hidden />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 text-sm font-medium break-words">{item.label ?? item.handle ?? url}</span>
          {ranks ? (
            <span className="text-[11px] text-muted-foreground" data-testid="smart-add-web-ranks">
              {ranks}
            </span>
          ) : null}
        </div>
        <span className="text-xs break-all text-muted-foreground" data-testid="smart-add-web-url">
          {url}
        </span>
        {item.snippet ? <p className="line-clamp-2 text-xs text-foreground/80">{item.snippet}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {suggested && !choice ? (
            <Button
              variant="outline"
              icon={<Lightbulb aria-hidden />}
              title={suggestion?.reason}
              onClick={() => pick(suggested.key)}
              data-testid="smart-add-web-suggestion"
            >
              {suggested.label}
            </Button>
          ) : null}
          <Select
            aria-label="What is it?"
            value={choice?.kind ?? ""}
            options={options}
            onValueChange={pick}
            className="min-w-40"
          />
          {chosen?.hasSentiment ? (
            <SegmentedControl
              aria-label="Sentiment"
              value={choice?.sentiment ?? null}
              data={SENTIMENTS}
              onValueChange={(s) => onChoose({ kind: chosen.key, sentiment: s })}
            />
          ) : null}
          {choice ? (
            <Button variant="quiet" icon={<X aria-hidden />} aria-label="Clear" title="Clear" onClick={() => onChoose(null)} />
          ) : null}
        </div>
      </div>
      <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
        <OutboundLink href={outboundHref(url)} />
      </Button>
    </li>
  );
}

export function SmartAddWebRow({
  items,
  kinds,
  choices,
  ctx,
  onChoose,
}: {
  items: EvidenceItem[];
  kinds: BrandRelationKind[];
  choices: Record<string, WebChoice>;
  ctx: SuggestContext;
  onChoose: (item: EvidenceItem, choice: WebChoice | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const row = webRow(items);
  if (!row.length) return null;
  const open = row.filter((i) => !choices[i.key]);
  const shown = showAll ? open : open.slice(0, TOP);
  const groups = groupByKind(row, choices, kinds);
  const rowFor = (i: EvidenceItem) => (
    <WebResultRow key={i.key} item={i} kinds={kinds} choice={choices[i.key]} ctx={ctx} onChoose={(c) => onChoose(i, c)} />
  );
  return (
    <section className="flex flex-col gap-1 rounded-lg border border-border/70 px-3 py-2" data-testid="smart-add-web-row">
      <header className="flex items-baseline gap-2 text-xs font-medium text-foreground/80">
        On the web
        <span className="text-[11px] font-normal text-muted-foreground">{row.length}</span>
      </header>
      {shown.length ? <ul className="flex flex-col divide-y divide-border/60">{shown.map(rowFor)}</ul> : null}
      {open.length > TOP ? (
        <Button variant="quiet" onClick={() => setShowAll((v) => !v)} className="self-start" data-testid="smart-add-web-more">
          {showAll ? "Show fewer" : `Show ${open.length - TOP} more`}
        </Button>
      ) : null}
      {groups.map((g) => (
        <div key={g.kind.key} className="flex flex-col pt-1" data-testid="smart-add-web-group" data-kind={g.kind.key}>
          <span className="text-[11px] font-medium text-muted-foreground" title={g.kind.description ?? undefined}>
            {[g.kind.label === STANCE_LABEL[g.stance] ? null : STANCE_LABEL[g.stance], g.kind.label, g.items.length]
              .filter((x) => x !== null)
              .join(" · ")}
          </span>
          <ul className="flex flex-col divide-y divide-border/60">{g.items.map(rowFor)}</ul>
        </div>
      ))}
    </section>
  );
}

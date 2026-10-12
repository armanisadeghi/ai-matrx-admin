"use client";

/**
 * Smart Add — the web tier, kept secondary to the social findings:
 *  - which web step is running / waiting for a confirmation / done (the tiers fire in order:
 *    the web search on a typed website, then news/videos/images once the name is confirmed,
 *    then local listings once a location is confirmed too);
 *  - ONE compact "On the web" row: review/listing pages first, then news/video/image results,
 *    each with its site icon as served, the exact address, its certainty and an Open button.
 * Web-found social profiles are not here: they join their platform's row like any account.
 */

import { ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import type { Certainty, EvidenceItem } from "./evidence";
import { webRow } from "./evidence";
import { outboundHref } from "./SmartAddExtras";
import type { RoundView } from "./SmartAddRound";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const TIERS: { step: string; label: string; waits: string }[] = [
  { step: "web", label: "Web", waits: "Needs a website" },
  { step: "deep", label: "News · Videos · Images", waits: "After the name is confirmed" },
  { step: "local", label: "Local", waits: "After a location is confirmed" },
];

export const CERTAINTY_LABEL: Record<Certainty, string> = { certain: "Certain", likely: "Likely", possible: "Possible" };

export function CertaintyChip({ certainty, reasons }: { certainty: Certainty; reasons?: string[] }) {
  const tone =
    certainty === "certain"
      ? "border-primary/40 text-primary"
      : certainty === "likely"
        ? "border-foreground/25 text-foreground/80"
        : "border-border text-muted-foreground";
  return (
    <span
      className={`shrink-0 rounded-full border px-1.5 py-px text-[10px] leading-4 font-medium ${tone}`}
      title={reasons?.length ? reasons.join(" · ") : undefined}
      data-testid="smart-add-certainty"
      data-certainty={certainty}
    >
      {CERTAINTY_LABEL[certainty]}
    </span>
  );
}

function tierState(views: RoundView[], step: string): "running" | "done" | "waiting" {
  const all = views.flatMap((v) => v.steps.filter((s) => s.step === step));
  if (all.some((s) => s.phase === "running" || s.phase === "retrying")) return "running";
  if (all.some((s) => !s.skipped && (s.phase === "completed" || s.phase === "failed"))) return "done";
  return "waiting";
}

export function SmartAddWebRow({ items, views }: { items: EvidenceItem[]; views: RoundView[] }) {
  const row = webRow(items);
  const states = TIERS.map((t) => ({ ...t, state: tierState(views, t.step) }));
  if (!row.length && states.every((t) => t.state === "waiting")) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border/70 px-3 py-2" data-testid="smart-add-web-row">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">On the web</span>
        {states.map((t) => (
          <span key={t.step} className="flex items-center gap-1" data-testid="smart-add-web-tier" data-tier={t.step} data-state={t.state}>
            <span
              className={`size-1.5 rounded-full ${
                t.state === "running" ? "animate-pulse bg-primary" : t.state === "done" ? "bg-primary/60" : "bg-muted-foreground/30"
              }`}
            />
            <span title={t.state === "waiting" ? t.waits : undefined}>{t.label}</span>
          </span>
        ))}
      </header>
      {row.length ? (
        <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {row.map((i) => (
            <li
              key={i.key}
              className="flex w-64 shrink-0 snap-start items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
              data-testid="smart-add-web-item"
              data-field={i.field}
            >
              {i.image_url ? (
                <img src={i.image_url} alt="" className="size-5 shrink-0 rounded object-contain" loading="lazy" />
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="truncate">{i.field === "listing" ? i.label : (i.label ?? i.handle)}</span>
                  {i.certainty ? <CertaintyChip certainty={i.certainty} reasons={i.certainty_reasons} /> : null}
                </span>
                <span className="truncate text-[11px] text-muted-foreground" title={i.url ?? i.value}>
                  {i.url ?? i.value}
                </span>
              </span>
              <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
                <OutboundLink href={outboundHref(i.url ?? i.value)} />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

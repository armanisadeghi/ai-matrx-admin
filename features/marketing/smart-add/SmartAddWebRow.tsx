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
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

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

export function SmartAddWebRow({ items }: { items: EvidenceItem[] }) {
  const row = webRow(items);
  if (!row.length) return null;
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border/70 px-3 py-2" data-testid="smart-add-web-row">
      <header className="text-xs font-medium text-foreground/80">On the web</header>
      <ul className="flex snap-x items-start gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {row.map((i) => (
          <li
            key={i.key}
            className="flex w-72 shrink-0 snap-start flex-col gap-1 rounded-md border border-border bg-card px-2 py-1.5"
            data-testid="smart-add-web-item"
            data-field={i.field}
          >
            <div className="flex items-center gap-2">
              {i.image_url ? (
                <img src={i.image_url} alt="" className="size-5 shrink-0 rounded object-contain" loading="lazy" />
              ) : null}
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium">
                <span className="truncate">{i.field === "listing" ? i.label : (i.label ?? i.handle)}</span>
                {i.certainty ? <CertaintyChip certainty={i.certainty} reasons={i.certainty_reasons} /> : null}
              </span>
              <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
                <OutboundLink href={outboundHref(i.url ?? i.value)} />
              </Button>
            </div>
            <span className="break-all text-[11px] leading-snug text-muted-foreground" data-testid="smart-add-web-url">
              {i.url ?? i.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

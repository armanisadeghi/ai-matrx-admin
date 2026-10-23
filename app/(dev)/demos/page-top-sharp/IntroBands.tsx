"use client";

// The page-top bake-off (ui-sharp): THE INTRO BAND and THE NUMBERS BAND.
// Reference: Stripe's customer page — one quiet band of identity facts under the title (never the
// title again: the path row already names the record), then a single row of numbers where every
// number opens the set it counts. On a phone the numbers become one sideways strip that snaps,
// instead of a nine-screen stack of tiles.
import type { ReactNode } from "react";
import { Globe2 } from "lucide-react";
import { SiteIcon } from "@ai-matrx/design-system";
import { cn } from "@ai-matrx/design-system/cn";
import { KpiTile } from "@ai-matrx/design-system/controls";

export interface IntroFact {
  id: string;
  node: ReactNode;
}

export function IntroBand({
  phone,
  site,
  iconUrl,
  description,
  facts,
  primary,
}: {
  phone: boolean;
  site: string | null;
  iconUrl: string | null;
  description: string | null;
  facts: readonly IntroFact[];
  primary: ReactNode;
}) {
  return (
    <section
      data-page-top="intro"
      aria-label="About"
      className={cn("flex gap-3 bg-card", phone ? "flex-col px-3 pb-3 pt-3" : "items-start px-4 pb-4 pt-4")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
          <SiteIcon site={site} iconUrl={iconUrl} size={24} fallback={Globe2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {description ? <p className="type-body line-clamp-2 text-foreground">{description}</p> : null}
          <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {facts.map((f) => (
              <li key={f.id} className="type-secondary flex min-w-0 items-center text-muted-foreground">
                {f.node}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={cn("flex shrink-0 items-center gap-1", phone && "w-full [&>*]:flex-1")}>{primary}</div>
    </section>
  );
}

export interface SummaryNumber {
  id: string;
  label: string;
  value: number | null;
  hint?: string;
  href?: string;
  title?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}

export function NumbersBand({ phone, numbers, loading }: { phone: boolean; numbers: readonly SummaryNumber[]; loading: boolean }) {
  return (
    <section
      data-page-top="numbers"
      aria-label="At a glance"
      className={cn(
        "bg-card",
        phone
          ? "scrollbar-hide flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3"
          : "grid gap-2 px-4 pb-4",
      )}
      style={phone ? undefined : { gridTemplateColumns: `repeat(${numbers.length}, minmax(0, 1fr))` }}
    >
      {numbers.map((n) => (
        <KpiTile
          key={n.id}
          label={n.label}
          value={n.value}
          hint={n.hint}
          href={n.href}
          title={n.title}
          tone={n.tone}
          loading={loading}
          className={phone ? "w-36 shrink-0 snap-start" : undefined}
        />
      ))}
    </section>
  );
}


"use client";

// THE INTRO BAND and THE SUMMARY BAND.
//
// Intro (GitHub's repository header): the record's mark, its name as the page's ONE h1, one line of
// facts as badges, and at most two actions on the right. No sentence under the title (in-app text
// is layout). Phone: the actions drop under the facts at full width.
//
// Summary: one clean row of KPI tiles — four across on desktop, two by two on a phone, never 3 + 1.
// Every number that names a set opens it; a number that could not be read shows "—", never 0.
import type { ReactNode } from "react";
import { KpiTile, type KpiTone } from "@/components/official/kpi/KpiTile";
import { cn } from "@ai-matrx/design-system/cn";

export interface IntroBandProps {
  mark: ReactNode;
  title: string;
  facts?: ReactNode;
  actions?: ReactNode;
  phone: boolean;
}

export function IntroBand({ mark, title, facts, actions, phone }: IntroBandProps) {
  return (
    <section data-page-top="intro" className={cn("pb-3", phone ? "px-4 pt-3" : "px-6 pt-5")}>
      <div className={cn("flex gap-3", phone ? "flex-col" : "items-center")}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground">
            {mark}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="type-heading truncate">{title}</h1>
            {facts ? <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">{facts}</div> : null}
          </div>
        </div>
        {actions ? <div className={cn("flex shrink-0 items-center gap-2", phone && "[&>*]:flex-1")}>{actions}</div> : null}
      </div>
    </section>
  );
}

export interface SummaryNumber {
  id: string;
  label: string;
  value: number | null;
  hint?: string;
  title?: string;
  tone?: KpiTone;
  href?: string;
}

export function SummaryBand({ numbers, loading, phone }: { numbers: readonly SummaryNumber[]; loading?: boolean; phone: boolean }) {
  return (
    <section data-page-top="summary" aria-label="Summary" className={cn("pb-4", phone ? "px-4" : "px-6")}>
      <div className={cn("grid gap-2", phone ? "grid-cols-2" : "grid-cols-4")}>
        {numbers.map((n) => (
          <KpiTile
            key={n.id}
            label={n.label}
            value={n.value == null ? null : n.value.toLocaleString()}
            hint={n.hint}
            title={n.title}
            tone={n.tone}
            href={n.href}
            loading={loading}
          />
        ))}
      </div>
    </section>
  );
}

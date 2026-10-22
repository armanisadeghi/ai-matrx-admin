// components/official/kpi/KpiTile.tsx
//
// THE KPI TILE — one number, its label, an optional one-line hint, and an
// optional drill-in. The shared primitive for KPI pages (Spend's TotalsStrip
// tile is the model it was lifted from). A tile with `href` is a link: every
// number that names a set of records opens that set.
//
// A number that could not be measured is never shown as 0: pass
// `value={null}` and the tile renders "—" with the hint saying why. A number
// read from the database takes that read's outcome — `read={{ status, error }}`
// (a table's `read=` value fits): a failed read renders "—" with an
// "unavailable" label for screen readers, an in-flight read renders loading.
//
// `title` is the number's one-sentence definition. It renders through
// `InfoHint` from `@ai-matrx/design-system/controls` — an info icon right after the label that
// opens on hover, keyboard focus, and tap — never as a native `title=` on the
// tile, which phones and keyboard users can't reach.
//
// `trend` draws a small history line beside the number (oldest first). Pass it
// only when real history exists — never a flat stand-in; `period` names the
// span ("28 days") for screen readers and the hover label.

"use client";

import Link from "@/components/navigation/AppLink";
import type { ReactNode } from "react";

import { InfoHint } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import {
  countReadState,
  unavailableCountLabel,
  type CountRead,
} from "@ai-matrx/design-system";

export type KpiTone = "neutral" | "good" | "warn" | "bad";

const TONE_VALUE: Record<KpiTone, string> = {
  neutral: "text-foreground",
  good: "text-emerald-700 dark:text-emerald-400",
  warn: "text-amber-700 dark:text-amber-400",
  bad: "text-rose-700 dark:text-rose-400",
};

const TONE_DOT: Record<KpiTone, string | null> = {
  neutral: null,
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
};

export interface KpiTileProps {
  label: string;
  /** `null` = not measured; renders "—", never 0. */
  value: ReactNode | null;
  hint?: ReactNode;
  tone?: KpiTone;
  /** Drill-in destination. The whole tile becomes the link. */
  href?: string;
  /** Definition — what the number counts, in one sentence (≤ 140 chars). Renders as an InfoHint after the label. */
  title?: string;
  loading?: boolean;
  /** The read behind `value`. Failed → "—" (never 0); loading → the loading bar. */
  read?: CountRead | null;
  /** Real history behind the number, oldest first (≥ 2 points), and the span it covers. */
  trend?: KpiTrend | null;
  className?: string;
}

export interface KpiTrend {
  values: readonly number[];
  /** The span the line covers ("28 days", "12 weeks"). */
  period: string;
  /** What the line counts when it is not the tile's number ("Posts per week"). */
  label?: string;
}

const SPARK_W = 64;
const SPARK_H = 20;

/** The tile's history line: a filled area under the line (none when flat), scaled from its low point. */
function KpiSparkline({ trend, label }: { trend: KpiTrend; label: string }) {
  const n = trend.values.length;
  if (n < 2) return null;
  const min = Math.min(...trend.values);
  const max = Math.max(...trend.values);
  // A floor of 10% of the peak: a change of 11 on 3,700 stays a near-flat line, never a cliff.
  const range = Math.max(max - min, Math.abs(max) * 0.1) || 1;
  // A level line sits at mid-height: drawn on the floor it would read as zero.
  const y = (v: number) => (max === min ? SPARK_H / 2 : SPARK_H - 2 - ((v - min) / range) * (SPARK_H - 4));
  const pts = trend.values
    .map((v, i) => `${((i / (n - 1)) * SPARK_W).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${trend.label ?? label}, last ${trend.period}`}
      className="h-5 w-16 shrink-0 text-primary"
    >
      <title>{`${trend.label ?? label}, last ${trend.period}`}</title>
      {/* A flat series is a line only: an area under it would read as a filled bar, not "no change". */}
      {max === min ? null : <polygon points={`0,${SPARK_H} ${pts} ${SPARK_W},${SPARK_H}`} fill="currentColor" fillOpacity={0.15} />}
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
  href,
  title,
  loading: loadingProp = false,
  read,
  trend,
  className,
}: KpiTileProps) {
  const readState = countReadState({ read });
  const loading = loadingProp || readState === "loading";
  const failed = readState === "failed";
  const shown = failed ? null : value;
  const dot = TONE_DOT[tone];
  const body = (
    <>
      {/* A label wraps to a second line rather than being cut ("NO DEFAULT
          MANDA…" on a phone, punch list 2026-09-26) — a KPI whose name is
          unreadable is a number without a meaning. */}
      <div className="flex min-w-0 items-start gap-1.5 type-meta font-medium uppercase tracking-wide text-muted-foreground">
        {dot ? (
          <span aria-hidden className={cn("mt-1 inline-block h-2 w-2 shrink-0 rounded-sm", dot)} />
        ) : null}
        <span className="line-clamp-2 break-words">
          {label}
          {title ? (
            <>
              {" "}
              <InfoHint text={title} label={`What ${label} means`} />
            </>
          ) : null}
        </span>
      </div>
      {loading ? (
        <div className="my-0.5 h-6 w-12 animate-pulse rounded bg-muted" aria-hidden />
      ) : (
        <div className="flex min-w-0 items-end justify-between gap-2">
          <div
            className={cn(
              "truncate text-lg font-semibold leading-tight tabular-nums",
              shown === null ? "text-muted-foreground" : TONE_VALUE[tone],
            )}
            aria-label={failed ? unavailableCountLabel(label) : undefined}
            title={failed ? "Couldn't be read" : undefined}
          >
            {shown === null ? "—" : shown}
          </div>
          {trend && shown !== null ? <KpiSparkline trend={trend} label={label} /> : null}
        </div>
      )}
      {hint ? (
        <div className="truncate type-meta text-muted-foreground">{hint}</div>
      ) : null}
    </>
  );

  const shell = cn(
    "flex min-w-0 flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2",
    className,
  );

  if (href && !loading && shown !== null) {
    return (
      <Link
        href={href}
        data-look-surface="card"
        className={cn(
          shell,
          "transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {body}
      </Link>
    );
  }
  return (
    <div className={shell} data-look-surface="card" aria-busy={loading || undefined}>
      {body}
    </div>
  );
}

/** The standard responsive tile row. */
export function KpiGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

"use client";

import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "../../lib/formulas";
import type {
  StatelessRatingResponse,
  WcImpairmentDefinitionRead,
} from "../../api/types";
import type { LiveRatingState } from "../../state/useLiveRating";

interface ResultPanelProps {
  liveState: LiveRatingState;
  className?: string;
}

const SIDE_LABELS: Record<string, string> = {
  left: "Left",
  right: "Right",
  default: "Bilateral",
};

export function ResultPanel({ liveState, className }: ResultPanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border",
        "bg-gradient-to-br from-primary/[0.04] via-card to-secondary/[0.04]",
        "dark:from-primary/[0.08] dark:via-card dark:to-secondary/[0.08]",
        "p-6 sm:p-7 shadow-sm",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-secondary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <ResultBody liveState={liveState} />
      </div>
    </section>
  );
}

function ResultBody({ liveState }: { liveState: LiveRatingState }) {
  if (liveState.status === "incomplete") {
    return (
      <EmptyState
        icon={Sparkles}
        title="Your rating will appear here"
        description={
          liveState.reason ?? "Fill in the claim and add at least one injury."
        }
      />
    );
  }

  if (liveState.status === "error") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't compute the rating"
        description={
          liveState.error?.message ??
          "Something went wrong. Adjust your inputs and try again."
        }
        tone="destructive"
      />
    );
  }

  if (liveState.status === "calculating" && !liveState.result) {
    return (
      <EmptyState
        icon={Loader2}
        title="Calculating…"
        description="Crunching the numbers"
        spinning
      />
    );
  }

  if (!liveState.result) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Your rating will appear here"
        description="Fill in the claim and add at least one injury."
      />
    );
  }

  return (
    <ResolvedResult
      result={liveState.result}
      isStale={liveState.status === "calculating"}
    />
  );
}

function ResolvedResult({
  result,
  isStale,
}: {
  result: StatelessRatingResponse;
  isStale: boolean;
}) {
  const combined = result.result?.combined_rating;
  const compensation = result.result?.compensation;
  const finalRating = combined?.final_rating;

  return (
    <div className={cn("space-y-6", isStale && "opacity-70 transition-opacity")}>
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Final PD rating
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono tracking-tight tabular-nums text-foreground text-5xl sm:text-6xl font-semibold">
            {finalRating != null ? `${formatNumber(finalRating, 0)}%` : "—"}
          </span>
          {isStale && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
        <Metric
          label="Compensation"
          value={
            compensation?.compensation != null
              ? formatCurrency(compensation.compensation)
              : "—"
          }
        />
        <Metric
          label="Weeks"
          value={
            compensation?.weeks != null
              ? formatNumber(compensation.weeks, 2)
              : "—"
          }
        />
        <Metric
          label="Days"
          value={
            compensation?.days != null
              ? formatNumber(compensation.days, 0)
              : "—"
          }
        />
      </div>

      {combined?.ratings && Object.keys(combined.ratings).length > 0 && (
        <div className="pt-4 border-t border-border/60">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2.5">
            Per-side breakdown
          </p>
          <div className="space-y-2">
            {Object.entries(combined.ratings).map(([side, sideData]) => (
              <SideRow
                key={side}
                label={SIDE_LABELS[side] ?? side}
                total={sideData.total}
              />
            ))}
          </div>
        </div>
      )}

      {result.injuries.length > 0 && (
        <div className="pt-4 border-t border-border/60">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2.5">
            Per-injury detail
          </p>
          <div className="space-y-2">
            {result.injuries.map((inj, idx) => (
              <InjuryRow
                key={idx}
                index={idx}
                impairment={inj.impairment_definition}
                side={
                  (inj.injury_attributes as { side?: string } | null)?.side ??
                  "default"
                }
                warnings={inj.warnings}
              />
            ))}
          </div>
        </div>
      )}

      {combined?.warnings && combined.warnings.length > 0 && (
        <div className="pt-4 border-t border-border/60">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {combined.warnings.map((w, idx) => (
              <li key={idx}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-foreground truncate">
        {value}
      </p>
    </div>
  );
}

function SideRow({ label, total }: { label: string; total: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums font-medium text-foreground">
        {formatNumber(total, 0)}%
      </span>
    </div>
  );
}

function InjuryRow({
  index,
  impairment,
  side,
  warnings,
}: {
  index: number;
  impairment: WcImpairmentDefinitionRead;
  side: string;
  warnings: string[];
}) {
  return (
    <div className="text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {index + 1}. {impairment.name}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {impairment.impairment_number} · {SIDE_LABELS[side] ?? side}
          </p>
        </div>
      </div>
      {warnings.length > 0 && (
        <ul className="mt-1 ml-4 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
          {warnings.map((w, idx) => (
            <li key={idx}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  tone = "neutral",
  spinning = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone?: "neutral" | "destructive";
  spinning?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[260px] py-8">
      <div
        className={cn(
          "rounded-full p-3 mb-4 ring-1",
          tone === "destructive"
            ? "bg-destructive/10 text-destructive ring-destructive/20"
            : "bg-primary/10 text-primary ring-primary/15",
        )}
      >
        <Icon className={cn("h-5 w-5", spinning && "animate-spin")} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

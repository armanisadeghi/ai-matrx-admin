"use client";

// features/launchpad/widgets/bodies/KpisWidget.tsx — the app-wide counts strip: several dashboard counts at
// once (read-only reuse of `useDashboardMetrics` + `METRIC_CARDS`). Each tile opens its feature; a zero
// shows the tile's own nudge. Which counts: config `keys` (comma-separated METRIC_CARDS keys).
import Link from "next/link";
import { METRIC_CARDS, type MetricCardConfig } from "@/features/dashboard/constants/metricCards";
import { useDashboardMetrics } from "@/features/dashboard/hooks/useDashboardMetrics";
import ShellIcon from "@/features/shell/components/ShellIcon";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { DEFAULT_KPI_KEYS, startMetricHref } from "../catalog";

/** The configured cards, in configured order; unknown keys are skipped. */
export function kpiCards(keys: string | undefined): MetricCardConfig[] {
  return (keys || DEFAULT_KPI_KEYS)
    .split(",")
    .map((k) => k.trim())
    .flatMap((k) => METRIC_CARDS.filter((c) => c.key === k));
}

export function KpisWidget({ config }: LaunchpadWidgetBodyProps) {
  const { metrics, isLoading, isError } = useDashboardMetrics();
  const cards = kpiCards(configText(config, "keys"));
  return (
    // The grid's phone layout (its container under 40rem, the same test the grid canvas draws by): two tiles a
    // row at KPI_TILE_PX, KPI_GAP_PX apart — the height `kpiPhoneBodyPx` reserves before this body draws.
    // Wider: one row. Classes are literal for Tailwind; the guard test ties them to the constants.
    <ul
      data-launchpad-kpis
      className="grid h-full grid-cols-2 auto-rows-[52px] gap-1 @min-[40rem]/matrx-grid-canvas:auto-rows-auto @min-[40rem]/matrx-grid-canvas:grid-flow-col @min-[40rem]/matrx-grid-canvas:auto-cols-[minmax(8rem,1fr)] @min-[40rem]/matrx-grid-canvas:grid-cols-none"
    >
      {cards.map((card) => {
        const value = metrics[card.key];
        return (
          <li key={card.key} className="min-w-0">
            <Link href={startMetricHref(card)} data-clickable className="flex h-full items-center gap-2 rounded px-2 hover:bg-muted">
              <ShellIcon name={card.iconName} className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                {isLoading ? (
                  <span aria-busy="true" className="block h-6 w-10 animate-pulse rounded bg-muted" />
                ) : (
                  <span className="block h-6 text-xl font-semibold leading-6 tabular-nums">
                    {isError ? "—" : value.toLocaleString()}
                  </span>
                )}
                <span className="block truncate text-xs text-muted-foreground" title={card.label}>
                  {!isLoading && !isError && value === 0 ? card.emptyHint : card.label}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

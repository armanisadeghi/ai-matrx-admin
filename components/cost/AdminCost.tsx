"use client";

/**
 * components/cost/AdminCost.tsx — admin costs as elements that SUBSCRIBE to the points rate (lane
 * DRILL-CLOSE, VERIFY-DRILL-FINAL L-b): for table cells and column definitions written outside a
 * component, where a hook cannot be called. A cell drawn before the `billing.points_per_usd` knob
 * snapshot lands fills in its points when it does, never stuck on "—".
 */

import { formatAdminPoints, formatAdminUsd } from "./formatAdminCost";
import { usePointsRate } from "./pointsRate.client";
import { useAdminCost } from "./useAdminCost";
import { useSeesDollars } from "./useCostDisplay";

/**
 * "$0.02 · 408 points" — dollars at the surrounding size, the points half smaller and muted
 * (Arman, 2026-10-10: "the text for the points needs to be smaller"). Admins read dollars; points
 * ride along as the secondary figure. A viewer who does not see dollars gets the points alone, at
 * full size, because points are then the only figure.
 */
export function AdminCost({ usd, unknown }: { usd: number | null | undefined; unknown?: string }) {
  const sees = useSeesDollars();
  const rate = usePointsRate();
  const format = useAdminCost();
  if (!sees || usd === null || usd === undefined || !Number.isFinite(usd)) {
    return <>{format(usd, { unknown })}</>;
  }
  return (
    <span>
      <span className="whitespace-nowrap">{formatAdminUsd(usd)}</span>
      {" "}
      <span className="whitespace-nowrap text-[0.7em] font-normal text-muted-foreground">
        · {formatAdminPoints(usd, rate)}
      </span>
    </span>
  );
}

/** "408 points". */
export function AdminPoints({ usd, bare }: { usd: number | null | undefined; bare?: boolean }) {
  const rate = usePointsRate();
  const text = formatAdminPoints(usd, rate);
  // `bare` drops the unit word for a table column whose header already says points.
  return <>{bare ? text.replace(/\s*points?$/i, "") : text}</>;
}

/** "$0.0204" — the USD half of an admin cost, for a labeled figure or tile. */
export function AdminUsd({ usd }: { usd: number | null | undefined }) {
  const sees = useSeesDollars();
  return sees ? <>{formatAdminUsd(usd)}</> : null;
}

/**
 * Children (a dollar label or tile) rendered for a system admin on the admin site only; users see
 * points alone. Off the admin site, wrap an admin-only dollar block in `<AdminOnly>` (AdminOnlyTag.tsx).
 */
export function UsdOnly({ children }: { children: React.ReactNode }) {
  return useSeesDollars() ? <>{children}</> : null;
}

/**
 * A toolbar line of labeled money figures, dollars and points apart (owner, 2026-10-08:
 * never "$x · y points" in one value). Each item becomes "<label> $" and "<pointsLabel>".
 */
export function CostFigures({ items }: { items: { usdLabel: string; pointsLabel: string; usd: number | null | undefined }[] }) {
  const sees = useSeesDollars();
  return (
    // Wraps figure by figure in a narrow toolbar; each figure stays whole (at 390 px the old
    // one-line nowrap row drew the figures over each other — live walk 2026-10-18).
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      {items.map((it) => (
        <span key={it.usdLabel} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          {sees && (
            <span className="whitespace-nowrap">
              {it.usdLabel} <span className="font-medium tabular-nums text-foreground"><AdminUsd usd={it.usd} /></span>
            </span>
          )}
          <span className="whitespace-nowrap">
            {it.pointsLabel} <span className="font-medium tabular-nums text-foreground"><AdminPoints usd={it.usd} /></span>
          </span>
        </span>
      ))}
    </span>
  );
}

"use client";

/**
 * components/cost/Cost.tsx
 *
 * HOW a cost reaches the screen — once you know it belongs there. First ask:
 * is the person deciding or investigating (a battle, a picker, an info or
 * details page, a history table, a bulk/repeating confirm step, a schedule's
 * setup, billing/usage, admin)? Then a price may show. Are they doing their
 * work (chat, a result, a receipt, a toast, a button)? Then it never does —
 * the number stays in the data. Arman, 2026-10-18;
 * common-docs/policies/points-and-money-in-the-ui.md; enforced by
 * `pnpm check:cost-display` (P1, ALLOWED_PLACES).
 *
 * Pass the USD figure the server gave you; administration sees dollars and
 * points; other pages follow the viewer's selected unit. An unmeasured cost
 * (`null`) renders "—", never a confident zero.
 *
 * `<CostBadge>` belongs only on a confirm step for bulk/heavy/repeating work
 * or inside a picker; `useCostDisplay().format` where only a string fits.
 */

import { cn } from "@/lib/utils";
import { AdminOnlyTag } from "./AdminOnlyTag";
import { formatAdminPoints, formatSpendUsd } from "./formatAdminCost";
import { useCostDisplay, useOnAdminSurface } from "./useCostDisplay";

export interface CostProps {
  /** The cost in USD, exactly as the server reported it. */
  usd: number | null | undefined;
  className?: string;
  /** `"1,234 pts"` instead of `"1,234 points"` (dense tables, chips). */
  short?: boolean;
  /** Prefix such as `"~"` for an estimate. */
  prefix?: string;
  /** Dim the value (a zero / not-applicable row) without hiding it. */
  muted?: boolean;
  /** Replaces the "—" shown for an unmeasured cost. */
  unknown?: string;
}

export function Cost({
  usd,
  className,
  short,
  prefix,
  muted,
  unknown,
}: CostProps) {
  const { unit, canToggle, format, rate } = useCostDisplay();
  const onAdminSite = useOnAdminSurface();
  const known = typeof usd === "number" && Number.isFinite(usd);
  // A system admin who switched to dollars sees them off the admin site too — under the visible
  // "Admin only" tag (owner ruling 2026-10-22), never as a bare figure.
  if (canToggle && unit === "usd" && !onAdminSite && known) {
    return (
      <span className={cn("inline-flex items-center gap-1 tabular-nums", muted && "opacity-50", className)}>
        <AdminOnlyTag />
        {prefix}
        {formatSpendUsd(usd)}
      </span>
    );
  }
  const text = format(usd, { short, unknown });
  // The other unit as a hover title, on the admin site only (a tooltip carries no "Admin only" tag).
  const title =
    canToggle && known && onAdminSite
      ? unit === "usd"
        ? formatAdminPoints(usd, rate)
        : formatSpendUsd(usd)
      : undefined;
  return (
    <span
      className={cn("tabular-nums", muted && "opacity-50", className)}
      title={title}
    >
      {known && prefix ? prefix : null}
      {text}
    </span>
  );
}

"use client";

/**
 * components/cost/useCostDisplay.ts
 *
 * THE single decision point for HOW a cost is shown to the person looking.
 * Administration pages show the stored USD cost together with the points
 * equivalent; the single-unit preference still applies on other pages.
 *
 * WHERE comes first (Arman, 2026-10-18 — law 14,
 * common-docs/policies/points-and-money-in-the-ui.md): is the person deciding
 * or investigating, or doing? Points only where they are deciding or
 * investigating — a battle, a model or option picker, an info card or details
 * page, a run-history table, the confirm step before bulk/heavy/repeating
 * work, a schedule's setup, billing/usage/budgets, admin. Never where they are
 * doing — chat, result blocks, generated media, tool results, receipts,
 * toasts, notifications, a live run's header, a button or action menu, the
 * word "Free". `pnpm check:cost-display` (P1) fails a price outside its
 * ALLOWED_PLACES list. The 2026-09-27 ruling below governs the UNIT only.
 *
 * Arman, 2026-09-27: "No one talks cost to a normal user, only api users. For
 * normal users, they use points or credits … Everyone should see
 * credits/points except for system admins who should always be able to toggle
 * to see $." So:
 *   - every viewer sees POINTS, at the `billing.points_per_usd` knob's rate for
 *     the active organization (`pointsRate.ts`), converted by `@ai-matrx/kit/format`;
 *   - a system admin (ADMIN IDENTITY, `selectIsAdminPerson`, any
 *     `admins.level`) who flipped the "Show costs in dollars" switch in the
 *     header menu's Admin group sees $ — on every page, because the ruling says
 *     "always"; until he flips it he sees exactly what everyone sees. Named in
 *     `scripts/check-admin-lane.ts` IDENTITY_ALLOWED for that reason;
 *   - the switch is persisted per person (`userPreferences.system.showCostInUsd`,
 *     synced like every other preference) and is IGNORED for anyone who is not
 *     an admin, so a stale or hand-edited preference can never show a member
 *     money.
 *
 * The number itself is never computed here — `formatCost` / `usdToPoints` in
 * `@ai-matrx/kit/format` are the one conversion, shared with the server's
 * `ai_points.py` and Workflow Studio. Where a price belongs (see above), render
 * it with `<Cost usd={…}/>`; reach for this hook only where a plain string is
 * required on such a surface (a picker option's label, a confirm step's
 * sentence). `pnpm check:cost-display` fails any UI file that formats a cost
 * in dollars outside this module, and any price outside an allowed place.
 */

import { useContext, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ReactReduxContext } from "react-redux";
import {
  formatCost,
  usdToPoints,
  type CostUnit,
} from "@ai-matrx/kit/format";
import type { RootState } from "@/lib/redux/store";
import { AdminOnlyBlockContext } from "./AdminOnlyTag";
import { isAdminSurfacePath, selectCanToggleCostUnit, selectCostUnit } from "./costUnit";
import { formatAdminCost, formatSpendUsd } from "./formatAdminCost";
import { usePointsRate } from "./pointsRate.client";

export { currentCostUnit, isAdminSurfacePath, selectCostUnit, selectShowCostInUsdPreference } from "./costUnit";
export { currentPointsRate, POINTS_RATE_KNOB } from "./pointsRate";
export { usePointsRate } from "./pointsRate.client";

export interface CostDisplay {
  /**
   * The unit for TEXT this viewer may read here: `"points"` for everyone; `"usd"` only for a system
   * admin who flipped the switch AND is on the admin site (plain text cannot carry the "Admin only"
   * tag — owner ruling 2026-10-22). Pass it on to any formatter that takes a unit.
   */
  unit: CostUnit;
  /** The admin's switch itself, wherever they are — only `<Cost>` reads it, to draw tagged dollars. */
  preferredUnit: CostUnit;
  /** True when the viewer may flip the switch at all (system admins). */
  canToggle: boolean;
  /**
   * Points per dollar for this viewer's organization (the `billing.points_per_usd`
   * knob), or `null` until the knob snapshot answers — costs read "—" meanwhile.
   */
  rate: number | null;
  /** A USD cost → the viewer's string: `"1,234 points"` or `"$0.0617"`. */
  format: (
    usd: number | null | undefined,
    /** `price` — a rate someone compares (a model's per-token price): exact dollars, not cents. */
    options?: { short?: boolean; unknown?: string; price?: boolean },
  ) => string;
  /** A USD cost → whole points (for math, tiers, sorting). */
  toPoints: (usd: number | null | undefined) => number | null;
}

const noopSubscribe = () => () => {};

/**
 * Reads the store WITHOUT requiring a Provider: a cost rendered in an embed,
 * a portal outside the app shell, or a unit test with no store shows points —
 * the unit every viewer gets — instead of crashing the surface.
 */
function useCostState(): { unit: CostUnit; canToggle: boolean } {
  const ctx = useContext(ReactReduxContext);
  const store = ctx?.store ?? null;
  const unit = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    () => (store ? selectCostUnit(store.getState() as RootState) : "points"),
    () => "points" as CostUnit,
  );
  const canToggle = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    () => (store ? selectCanToggleCostUnit(store.getState() as RootState) : false),
    () => false,
  );
  return { unit, canToggle };
}

/**
 * Is this viewer a system admin (the seat that may see dollars at all)? Arman, 2026-10-08: "20,000 is
 * correct and should be that for admins to see everywhere and nothing else. Users should never see that
 * number or any conversion." Organization admins are users. Use it to decide whether a LABELLED admin
 * block renders (`<CostDoor>`'s admin rows, `<AdminOnly>`); never to print a bare dollar figure.
 */
export function useIsCostAdmin(): boolean {
  return useCostState().canToggle;
}

/** True on the admin site (`/administration/**`), where the site itself is the "Admin only" label. */
export function useOnAdminSurface(): boolean {
  return isAdminSurfacePath(usePathname());
}

/**
 * May this viewer read a BARE dollar figure (and the rate) HERE? A system admin, on the admin site
 * only (owner ruling 2026-10-22: "Dollar costs for services should never ever ever be shown to a
 * user… unless this is some sort of an admin feature and in that case, it should make it clear to me
 * that it's admin only data"). Everywhere else every string helper (`useAdminCost`, `AdminUsd`,
 * `CostFigures`, a feature's price text) answers points alone, and dollars live only inside a
 * labelled element (`<CostDoor>`, `<AdminOnly>`, `<Cost>`'s tagged dollar mode) — inside an
 * `<AdminOnly>` block this answers true for a system admin, because the block wears the tag.
 */
export function useSeesDollars(): boolean {
  const admin = useCostState().canToggle;
  const onAdminSite = useOnAdminSurface();
  const inLabelledBlock = useContext(AdminOnlyBlockContext);
  return admin && (onAdminSite || inLabelledBlock);
}

export function useCostDisplay(): CostDisplay {
  const { unit, canToggle } = useCostState();
  // Subscribes: the moment the knob snapshot lands (or an organization's rate
  // changes), every cost on screen re-renders at the real rate.
  const rate = usePointsRate();
  const onAdminSite = isAdminSurfacePath(usePathname());
  const showBoth = canToggle && onAdminSite;
  // A plain string cannot carry the "Admin only" tag, so off the admin site it is points
  // (ruling 2026-10-22); `<Cost>` carries the tag and honours the dollars switch there itself.
  const textUnit: CostUnit = onAdminSite ? unit : "points";
  return {
    unit: textUnit,
    preferredUnit: unit,
    canToggle,
    rate,
    format: (usd, { price, ...options } = {}) =>
      showBoth
        ? formatAdminCost(usd, { ...options, rate, usdDigits: price ? "price" : undefined })
        : textUnit === "usd" && !price
          ? formatSpendUsd(usd, options.unknown)
          : formatCost(usd, { ...options, unit: textUnit, rate }),
    toPoints: (usd) => usdToPoints(usd, { rate }),
  };
}

/**
 * components/cost/costUnit.ts
 *
 * The cost-unit decision as plain selectors, plus `currentCostUnit()` for code
 * that runs OUTSIDE render — a copy payload, a toast, a confirm dialog's text,
 * a spend gate. Those read the unit at the moment they run, so an admin who
 * flipped "Show costs in dollars" gets dollars and everyone else gets points.
 *
 * Render code uses `useCostDisplay()` / `<Cost/>` instead: they subscribe, so
 * the screen flips the moment the switch does. A text helper that takes a
 * `unit` must default it to `currentCostUnit()`, never to a literal
 * `"points"` — a literal default silently ignores the admin's switch
 * (`pnpm check:cost-display` rule R5).
 *
 * Deliberately NOT "use client" and free of React: server code may import a
 * helper that imports this; with no store it answers "points", the unit every
 * viewer sees.
 */

import type { CostUnit } from "@ai-matrx/kit/format";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import type { RootState } from "@/lib/redux/store";

/** Admin identity, tolerant of a store without the auth slice (embeds, tests). */
export const selectCanToggleCostUnit = (state: RootState): boolean =>
  state.userAuth != null && selectIsAdminPerson(state);

/** The raw preference, whatever the viewer's role (admin-only in effect). */
export const selectShowCostInUsdPreference = (state: RootState): boolean =>
  state.userPreferences?.system?.showCostInUsd === true;

/** The unit THIS viewer sees: dollars only for an admin who asked for them. */
export const selectCostUnit = (state: RootState): CostUnit =>
  selectCanToggleCostUnit(state) && selectShowCostInUsdPreference(state)
    ? "usd"
    : "points";

/**
 * THE ADMIN SITE (owner ruling 2026-10-22): dollars appear without a per-figure "Admin only" tag
 * only on the admin site (`/administration/**`, manage.aimatrx.com), where the whole site is the
 * label. Everywhere else a dollar figure lives only inside a labelled element (`<AdminOnly>`,
 * `<CostDoor>`'s admin block, `<Cost>`'s tagged dollar mode). Pure.
 */
export function isAdminSurfacePath(pathname: string | null | undefined): boolean {
  return typeof pathname === "string" && (pathname === "/administration" || pathname.startsWith("/administration/"));
}

/** Is the code running on the admin site right now (outside render: a toast, a copy payload)? */
function onAdminSurfaceNow(): boolean {
  return typeof window !== "undefined" && isAdminSurfacePath(window.location?.pathname);
}

/**
 * The viewer's unit right now, read from the app store; `"points"` without one. Text built outside
 * render cannot carry the "Admin only" tag, so dollars come back only on the admin site.
 */
export function currentCostUnit(): CostUnit {
  const store = getStoreSingleton();
  if (!store || !onAdminSurfaceNow()) return "points";
  try {
    return selectCostUnit(store.getState() as RootState);
  } catch {
    return "points";
  }
}

/**
 * Does the viewer see dollars in plain text, read at the moment it runs? A system admin on the admin
 * site only; an organization admin is a user. For text built outside render (a flag's tooltip, a copy payload,
 * a toast). Render code uses `useSeesDollars()` in `useCostDisplay.ts`.
 */
export function currentSeesDollars(): boolean {
  const store = getStoreSingleton();
  // Plain text carries no "Admin only" tag: dollars in it only on the admin site (ruling 2026-10-22).
  if (!store || !onAdminSurfaceNow()) return false;
  try {
    return selectCanToggleCostUnit(store.getState() as RootState);
  } catch {
    return false;
  }
}

"use client";

/**
 * WHO MAY WATCH AI (Arman, 2026-10-13): "Only system admins for now; debug mode is
 * the switch." A registered admin feature on user pages (`ai.watch`,
 * utils/auth/adminFeaturesOnUserPages.ts) — never the debug-tooling selectors —
 * AND the admin debug switch on. Everyone else: no Watch AI button, no light,
 * and the window refuses to show a run.
 */

import { useAppSelector } from "@/lib/redux/hooks";
import { selectAdminFeature } from "@/lib/redux/selectors/userSelectors";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import type { RootState } from "@/lib/redux/store";

export const selectCanWatchAi = (state: RootState): boolean =>
  selectAdminFeature(state, "ai.watch") && Boolean(selectIsDebugMode(state));

export function useCanWatchAi(): boolean {
  return useAppSelector(selectCanWatchAi);
}

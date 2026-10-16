"use client";

/**
 * ENGINEERING DETAIL IS OPT-IN, EVEN FOR ADMINS (2026-10-15 review B4).
 *
 * The shape screens printed class and function names ("StreamBlockAccumulator",
 * "applyIrKindRoute", "variableDefinitionsToKindFields", "deferred to an RTL
 * harness") to every admin, because they were gated on `selectIsAdminDebugger`
 * alone — which is true on every page for any admin. Plain words are the
 * default for everyone; the engineering sentence shows only when an admin has
 * the debug switch on (the same pairing `useBuilderRecording` and the canvas
 * debug panel use).
 */

import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import type { RootState } from "@/lib/redux/store";

export const selectShowsEngineeringDetail = (state: RootState): boolean =>
  Boolean(selectIsAdminDebugger(state)) && Boolean(selectIsDebugMode(state));

export function useEngineeringDetail(): boolean {
  return useAppSelector(selectShowsEngineeringDetail);
}

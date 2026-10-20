"use client";

// features/shell/shell-layout/useResolvedShellLayout.ts — the shell renderers' ONE data source.
//
// Sidebar, the phone drawer, the Dock and the Header read the layout here instead of the nav-data arrays.
// Default (no layout, Standard view, guests, any route group but (core)) returns the nav-data arrays
// themselves, so an uncustomized render is byte-identical to the old one. Memoized on the slice and the
// viewer: a save re-renders the shell at once, everything else reuses the same trees.

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/rootReducer";
import { useAppSelector } from "@/lib/redux/hooks";
import { resolveHeldShellLayout } from "./held";
import type { ResolvedShellLayout } from "./resolve";
import { holdsShellLayout, initialShellLayoutState, type ShellLayoutState } from "./shellLayoutSlice";

const selectShellLayoutSlice = (state: RootState): ShellLayoutState => state.shellLayout ?? initialShellLayoutState;
const selectViewerIsAdmin = (state: RootState): boolean => state.userAuth.isAdmin === true;
const selectViewerIsGuest = (state: RootState): boolean => !state.userAuth.id;

export const selectResolvedShellLayout = createSelector(
  [selectShellLayoutSlice, selectViewerIsAdmin, selectViewerIsGuest],
  (held, isAdmin, isGuest): ResolvedShellLayout => resolveHeldShellLayout(held, { isAdmin, isGuest }),
);

/** The server reserved the nav column and the layout is not known yet: draw the skeleton, not the default. */
export const selectShellNavReserved = createSelector(
  [selectShellLayoutSlice],
  (held) => held.enabled && held.reserved && held.status === "unknown",
);

/** The person (or her organization) has a stored layout — the Standard view switch shows only then. */
export const selectHoldsShellLayout = createSelector([selectShellLayoutSlice], (held) => held.enabled && holdsShellLayout(held));

/** The Look the shell wears (null = standard): the stamp on `.shell-root` and the tile attributes on rows. */
export const selectShellLook = createSelector([selectResolvedShellLayout], (layout) => layout.look);

export function useShellLook() {
  return useAppSelector(selectShellLook);
}

export const selectShellStandardView = createSelector([selectShellLayoutSlice], (held) => held.standardView);

export function useResolvedShellLayout(): ResolvedShellLayout {
  return useAppSelector(selectResolvedShellLayout);
}

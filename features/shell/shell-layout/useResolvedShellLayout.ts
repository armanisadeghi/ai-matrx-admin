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
import { layoutOffers, type LayoutOffers } from "./offers";
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

/** The accent color (null = the built-in primary): the stamp on `.shell-root` and on <html> for portals. */
export const selectShellAccent = createSelector([selectResolvedShellLayout], (layout) => layout.accent);

/** The winning body carries its own Dock: `.shell-root[data-show-dock]` shows it on phones. */
export const selectShellCustomDock = createSelector([selectResolvedShellLayout], (layout) => layout.customDock);

export const selectShellStandardView = createSelector([selectShellLayoutSlice], (held) => held.standardView);

/**
 * What's new — the ONE list every offer place reads (the Sidebar's slot, the launchpad band): new catalog
 * entries for her own Sidebar and "Your organization updated its menu". From the held layouts, so the server's
 * first frame and the client's agree (nothing is reserved when there is nothing to offer).
 */
export const selectShellLayoutOffers = createSelector(
  [selectShellLayoutSlice, selectViewerIsAdmin, selectViewerIsGuest],
  (held, isAdmin, isGuest): LayoutOffers => layoutOffers(held, { isAdmin, isGuest }),
);

export function useShellLayoutOffers(): LayoutOffers {
  return useAppSelector(selectShellLayoutOffers);
}

export function useResolvedShellLayout(): ResolvedShellLayout {
  return useAppSelector(selectResolvedShellLayout);
}

"use client";

// features/spaces/nav/crumb-path.ts — when a page's breadcrumb may draw (CD-PERF-02, CLOSE-PERF r4). Both Spaces
// breadcrumbs (the top bar's tiered one, and the Breadcrumb block inside a page) wait on this one rule, so neither
// paints a short trail that its ancestors then push sideways.

import { useEffect } from "react";

import type { SpaceSummary } from "../contract";
import { useSpaces } from "../state/SpacesProvider";

/**
 * True while a page's breadcrumb would still grow: its first crumb has a parent the tree has not read yet and the
 * page's reveal has not answered. A breadcrumb drawn then gains its ancestors after paint and slides sideways
 * (CD-PERF-02), so it keeps its slot invisible until the path is settled. A top-level page, a read-only screen
 * (no `pathSettled`) and a reveal that failed all draw at once.
 */
export function crumbPathPending(path: readonly Pick<SpaceSummary, "id" | "parentId">[], pathSettled: ((id: string) => boolean) | undefined): boolean {
  if (path.length === 0 || !pathSettled) return false;
  if (path[0].parentId == null) return false;
  return !pathSettled(path[path.length - 1].id);
}

/** Asks for the page's place in the tree (idempotent) and answers whether its breadcrumb must still wait. */
export function useCrumbPathPending(path: readonly SpaceSummary[]): boolean {
  const { reveal, pathSettled, ready } = useSpaces();
  const currentId = path.length ? path[path.length - 1].id : null;
  const pending = crumbPathPending(path, pathSettled);
  useEffect(() => {
    if (pending && currentId && ready) reveal(currentId);
  }, [pending, currentId, ready, reveal]);
  return pending;
}

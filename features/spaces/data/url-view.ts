// features/spaces/data/url-view.ts — "open this database with that view showing", from the address.
//
// The tiered breadcrumb's third tier links to `/spaces/<page>?view=<viewId>#block-<blockId>`: the page
// scrolls to the block (SpaceEditor's #block- deep link) and that block shows the named view. The view
// is this viewer's for now — nothing is written to the page — until she changes the database herself,
// which drops it.

import { useEffect, useState } from "react";

/** The view the address names for this block, or null. */
export function urlViewFor(blockId: string, location: { search: string; hash: string }): string | null {
  if (location.hash !== `#block-${blockId}`) return null;
  const view = new URLSearchParams(location.search).get("view");
  return view && view.trim() ? view : null;
}

/** The address's view for this block, kept until `drop()` (any edit of the database). */
export function useUrlView(blockId: string): { viewId: string | null; drop: () => void } {
  const [viewId, setViewId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setViewId(urlViewFor(blockId, window.location));
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, [blockId]);
  return { viewId, drop: () => setViewId(null) };
}

// features/shell/shell-layout/addPagesHref.ts — the "Add pages…" affordance's href (leaf module: the
// sidebar and phone drawer import it without pulling in the resolver).
//
// It is the add row of an empty group AND the empty group's own href: runs the `edit-sidebar` action; the
// anchor never navigates. A press on an empty group's label opens its menu ("Add pages…"), never a page
// (until 2026-10-22 it went to /launchpad — audit #7).

export const EDIT_SIDEBAR_HREF = "#shell.edit-sidebar";

/** A row whose href is the "Add pages…" affordance (an empty group, or its add row): never navigates. */
export function isAddPagesHref(href: string | undefined | null): boolean {
  return href === EDIT_SIDEBAR_HREF;
}

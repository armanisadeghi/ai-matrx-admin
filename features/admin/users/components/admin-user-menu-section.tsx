"use client";

/**
 * THE ADMIN USER ROW'S ACTIONS — shared by every Users & Access table whose
 * row names a user account (directly, or as the row's primary subject: a
 * per-user usage record, a per-user acquisition record, a per-user drift
 * record). Its items are THE registry's doors (`userDoors` in
 * `features/admin/users/record/userSurfaces.ts`) — the same list the name
 * chip's menu and the roster's Manage menu render, so they never drift apart.
 * Never declare a door here (`one-user-door-registry.test.ts`).
 *
 * Plain function, not a hook — same shape as `buildSiteMenuSection` /
 * `buildPageMenuSection`: the host keeps the clicked row in STATE and rebuilds
 * `extraSections` off it, e.g.
 * `extraSections={[buildAdminUserMenuSection(clickedRow)]}`.
 *
 * No entity ref here: Attach To / Copy-as act on the raw content only.
 *
 * 🚨 NO NEW WRITE PATH LIVES HERE, and nothing here promotes, revokes, or
 * edits an admin — "Admin level" only navigates to the existing admins page,
 * exactly like the dropdown door it mirrors.
 */

import { UserRound } from "lucide-react";

import type {
  ContextMenuExtraItem,
  ContextMenuExtraSection,
} from "@ai-matrx/context-menu/engine";
import {
  unavailableHere,
  withAvailability,
  type AvailabilityMap,
} from "@ai-matrx/context-menu/engine";
import { userDoors } from "../record/userSurfaces";

/** The one thing every Users & Access table can say about a right-clicked user. */
export interface AdminUserMenuRow {
  id: string;
  email?: string | null;
  displayName?: string | null;
}

/** Every door of the section marked unavailable for one reason (a row that names no account). */
export function adminUserMenuUnavailable(reason: string): AvailabilityMap {
  return Object.fromEntries(userDoors("").map((door) => [`admin-user-${door.id}`, unavailableHere(reason)]));
}

export function buildAdminUserMenuSection(
  row: AdminUserMenuRow | null,
  opts?: {
    label?: string;
    /** THE CONSISTENCY STEP — see `@ai-matrx/context-menu (src/engine/utils/availability.ts)`. */
    unavailable?: AvailabilityMap;
  },
): ContextMenuExtraSection {
  // With no row the menu still shows every door (disabled), so its shape never jumps.
  const items: ContextMenuExtraItem[] = userDoors(row?.id ?? "").map((door) => ({
    kind: "link",
    id: `admin-user-${door.id}`,
    label: door.label,
    icon: door.icon,
    href: row ? door.href : "#",
    disabled: !row,
  }));

  return withAvailability(
    {
      id: "admin-user-actions",
      label: opts?.label ?? (row?.displayName || row?.email || "This user"),
      icon: UserRound,
      anchor: "after-compare",
      items,
    },
    opts?.unavailable,
  );
}

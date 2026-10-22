"use client";

/**
 * Hooks over THE per-person hide — ONE store for the whole app: `@ai-matrx/sharing/access/react`'s.
 *
 * The "can't remove it" screen (the package's `cantRemoveDialog` render) hides through the package's
 * store, and the list shell (`lib/entity-list`) reads hidden ids here, so both must be the same store:
 * a hide refreshes it and every list of that kind re-renders at once. Its client comes from
 * `configureAccess` (features/access-gate/accessEnv.ts, run at boot by providers/SharingHost.tsx).
 *
 * `useHiddenByMe(token)`   — the person's hidden ids for one record type.
 * `useHiddenItems(token)`  — the same, with the names they saw (for the panel).
 * `useHideForMe(token)`    — hide / unhide; `onChanged` re-reads a list that narrows server-side.
 * `useRemovalRights(token, id)` — the pre-check run BEFORE an archive/delete confirm.
 */

export {
  refreshHiddenByMe,
  useHiddenByMe,
  useHiddenItems,
  useHideForMe,
  useRemovalRights,
} from "@ai-matrx/sharing/access/react";

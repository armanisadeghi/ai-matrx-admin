/**
 * Hidden by me — THE per-person hide for any record (2026-10-14).
 *
 * A person who can see a record but cannot archive or delete it (they reached
 * it through their organization or a share) can hide it for themselves. It
 * disappears from their lists and shows only in that list's "Hidden" view;
 * nobody else is affected and the record itself never changes.
 *
 * One table (`platform.hidden_item`, filed under the RECORD's own
 * organization, never the active one) behind four RPCs:
 *   record_removal_rights — may I archive/delete this? (mirrors the database's
 *                           own governance rule exactly: creator, full access,
 *                           or platform admin) + is it hidden for me?
 *   hide_for_me / unhide_for_me — caller-only writes.
 *   hidden_by_me          — the caller's hidden ids, per token.
 *
 * `token` is the platform entity token (`web_brand`, `web_site`, …) — the same
 * string `iam.has_access` and the access gate use.
 */
//
// The implementation is `@ai-matrx/data/access` (one copy for every app); this file only makes sure
// the app's client and sender are injected before it runs.

import * as access from "@ai-matrx/data/access";
import { ensureAccessEnv } from "@/features/access-gate/accessEnv";

export const fetchRemovalRights: typeof access.fetchRemovalRights = (
  ...args: Parameters<typeof access.fetchRemovalRights>
) => {
  ensureAccessEnv();
  return access.fetchRemovalRights(...args);
};
export const hideForMe: typeof access.hideForMe = (
  ...args: Parameters<typeof access.hideForMe>
) => {
  ensureAccessEnv();
  return access.hideForMe(...args);
};
export const listHiddenByMe: typeof access.listHiddenByMe = (
  ...args: Parameters<typeof access.listHiddenByMe>
) => {
  ensureAccessEnv();
  return access.listHiddenByMe(...args);
};
export const listHiddenItems: typeof access.listHiddenItems = (
  ...args: Parameters<typeof access.listHiddenItems>
) => {
  ensureAccessEnv();
  return access.listHiddenItems(...args);
};
export const unhideForMe: typeof access.unhideForMe = (
  ...args: Parameters<typeof access.unhideForMe>
) => {
  ensureAccessEnv();
  return access.unhideForMe(...args);
};

export { applyHiddenView } from "@ai-matrx/data/access";
export type {
  HiddenItem,
  HiddenView,
  RemovalRights,
} from "@ai-matrx/data/access";

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

import "@/features/access-gate/accessEnv";

export {
  applyHiddenView,
  fetchRemovalRights,
  hideForMe,
  listHiddenByMe,
  listHiddenItems,
  unhideForMe,
} from "@ai-matrx/data/access";
export type {
  HiddenItem,
  HiddenView,
  RemovalRights,
} from "@ai-matrx/data/access";

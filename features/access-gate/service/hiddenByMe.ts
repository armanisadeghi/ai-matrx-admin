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

import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";

export interface RemovalRights {
  /** The caller can see the record at all. */
  canView: boolean;
  /** The caller may archive/delete it (the database will allow the write). */
  canRemove: boolean;
  /** The caller has hidden it for themselves. */
  hidden: boolean;
}

function platformRpc() {
  return createClient().schema("platform");
}

export async function fetchRemovalRights(
  token: string,
  id: string,
): Promise<RemovalRights> {
  const { data, error } = await platformRpc().rpc("record_removal_rights", {
    p_type: token,
    p_id: id,
  });
  if (error) throw operationFailed("check what you can do with this item", error);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    canView: row.can_view === true,
    canRemove: row.can_remove === true,
    hidden: row.hidden === true,
  };
}

export async function hideForMe(token: string, id: string): Promise<void> {
  const { error } = await platformRpc().rpc("hide_for_me", {
    p_type: token,
    p_id: id,
  });
  if (error) throw operationFailed("hide this item", error);
}

export async function unhideForMe(token: string, id: string): Promise<void> {
  const { error } = await platformRpc().rpc("unhide_for_me", {
    p_type: token,
    p_id: id,
  });
  if (error) throw operationFailed("show this item again", error);
}

/** The caller's hidden record ids for one token (a person hides few things). */
export async function listHiddenByMe(token: string): Promise<string[]> {
  const { data, error } = await platformRpc().rpc("hidden_by_me", {
    p_type: token,
  });
  if (error) throw operationFailed("load your hidden items", error);
  return (data ?? []).map((row) => row.entity_id);
}

/** Which slice of a list to show with respect to the person's hidden items. */
export type HiddenView = "visible" | "hidden";

/**
 * Narrow a PostgREST list query by the person's hidden ids: `visible` drops
 * them, `hidden` shows only them. Applied server-side so paging and counts
 * stay true.
 */
export function applyHiddenView<
  Q extends {
    not(column: string, operator: string, value: unknown): Q;
    in(column: string, values: readonly string[]): Q;
  },
>(query: Q, hiddenIds: readonly string[], view: HiddenView, column = "id"): Q {
  if (view === "hidden") return query.in(column, hiddenIds.length ? hiddenIds : ["00000000-0000-0000-0000-000000000000"]);
  if (!hiddenIds.length) return query;
  return query.not(column, "in", `(${hiddenIds.join(",")})`);
}

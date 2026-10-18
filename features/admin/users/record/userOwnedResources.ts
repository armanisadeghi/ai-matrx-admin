// admin.user_owned_resources_shard(p_user, p_shard, p_shards) — everything one person owns, by
// registered resource type (migrations/20261018120000…122000). One call cannot finish the ~287
// registry types inside the 8 s statement timeout on the heaviest accounts (measured 2026-10-18:
// 6.7 s of counts alone for admin@admin.com), so the census runs as SHARDS parallel calls, the way
// aidream's user_inventory.py runs 8 concurrent counts. A failed shard never hides the others: its
// error is returned beside the rows that did answer.

import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import type { Json } from "@/types/database.types";
import type { OwnedResourceItem, OwnedResourceRow } from "@/features/organizations/admin/components/OwnedResourcesTable";

const SHARDS = 8;

export interface UserOwnedResources {
  /** Types with at least one live or archived row, or that could not be read. */
  rows: OwnedResourceRow[];
  /** Labels of the types this person owns none of. */
  none: string[];
  registered: number;
  /** Slowest shard's server time. */
  elapsedMs: number;
  shardErrors: string[];
}

function str(v: Json | undefined): string | null {
  return typeof v === "string" ? v : null;
}

function num(v: Json | undefined): number | null {
  return typeof v === "number" ? v : null;
}

function items(v: Json | undefined): OwnedResourceItem[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter(isJsonObject).map((i) => ({ id: String(i.id ?? ""), name: str(i.name), updated_at: str(i.updated_at) }));
}

export function rowFromType(t: Json): OwnedResourceRow | null {
  if (!isJsonObject(t)) return null;
  const ok = t.ok === true;
  return {
    resourceType: str(t.type) ?? "",
    displayLabel: str(t.label) ?? str(t.type) ?? "",
    schemaName: str(t.schema) ?? "",
    tableName: str(t.table) ?? "",
    count: ok ? (num(t.count) ?? 0) : null,
    exact: t.exact === false ? false : true,
    archived: num(t.archived) ?? 0,
    lastUpdatedAt: str(t.last_updated_at),
    urlTemplate: str(t.url_template),
    newest: items(t.newest),
    newestSkipped: str(t.newest_skipped),
    unread: ok ? null : (str(t.reason) ?? "error") + (str(t.error) ? `: ${str(t.error)}` : ""),
    isComponent: t.is_component === true,
  };
}

export async function fetchUserOwnedResources(userId: string): Promise<UserOwnedResources> {
  const supabase = createClient();
  const settled = await Promise.allSettled(
    Array.from({ length: SHARDS }, (_, shard) =>
      supabase.schema("admin").rpc("user_owned_resources_shard", { p_user: userId, p_shard: shard, p_shards: SHARDS }),
    ),
  );
  const rows: OwnedResourceRow[] = [];
  const none: string[] = [];
  const shardErrors: string[] = [];
  let registered = 0;
  let elapsedMs = 0;
  for (const [shard, s] of settled.entries()) {
    const failure = s.status === "rejected" ? s.reason : s.value.error;
    if (failure || s.status !== "fulfilled") {
      shardErrors.push(`Part ${shard + 1}: ${failure instanceof Error ? failure.message : String(failure?.message ?? failure)}`);
      continue;
    }
    const body = s.value.data;
    if (!isJsonObject(body) || !Array.isArray(body.types)) {
      shardErrors.push(`Part ${shard + 1}: unexpected answer`);
      continue;
    }
    registered += body.types.length;
    elapsedMs = Math.max(elapsedMs, num(body.elapsed_ms) ?? 0);
    for (const t of body.types) {
      const row = rowFromType(t);
      if (!row) continue;
      if (row.count === 0 && !row.archived) none.push(row.displayLabel);
      else rows.push(row);
    }
  }
  if (shardErrors.length === SHARDS) throw new Error(shardErrors[0]);
  // Things a person made first (as user_inventory.py ranks them), then the biggest holdings.
  rows.sort(
    (a, b) =>
      Number(a.count === null) - Number(b.count === null) ||
      Number(a.isComponent) - Number(b.isComponent) ||
      (b.count ?? 0) - (a.count ?? 0) ||
      a.displayLabel.localeCompare(b.displayLabel),
  );
  none.sort((a, b) => a.localeCompare(b));
  return { rows, none, registered, elapsedMs, shardErrors };
}

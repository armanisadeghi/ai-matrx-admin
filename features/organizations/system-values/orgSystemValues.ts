// features/organizations/system-values/orgSystemValues.ts — an organization's own value for a System
// context item (lane L3b). Reads go straight to the two tables (RLS decides what a person sees); the
// one write is the signed-in value door `custom.context_value_write` with `organization_id` and no
// `scope_id` (owner/admin only, curated items only; `clear: true` removes the organization's value).
// The scope doors package speaks the scope form of that door only, so this file is the named
// exception in `scripts/check-scopes-data-layer.mjs`.

import { lightDoorCall } from "@ai-matrx/records/door-call";

type Uuid = string;

interface ReadResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}
interface Filtered<T> extends PromiseLike<ReadResult<T>> {
  eq(column: string, value: unknown): Filtered<T>;
  is(column: string, value: null): Filtered<T>;
  order(column: string, opts?: { ascending?: boolean }): Filtered<T>;
}
/** The slice of the supabase client these reads need (so a test hands in a stand-in). */
export interface OrgValueClient {
  schema(name: string): {
    from(table: string): { select(columns: string): Filtered<Record<string, unknown>> };
  };
}

export interface OrgSystemValueRow {
  itemId: Uuid;
  key: string;
  displayName: string;
  valueType: string;
  /** The platform's value for the item. */
  defaultValue: unknown;
  /** This organization's own value; `undefined` when it has none. */
  orgValue: unknown;
}

export type OrgSystemValueResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

async function read(
  client: OrgValueClient,
  table: string,
  columns: string,
  narrow: (q: Filtered<Record<string, unknown>>) => Filtered<Record<string, unknown>>,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await narrow(client.schema("context").from(table).select(columns));
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** The curated System items, each with the platform value and this organization's own, if any. */
export async function loadOrgSystemValues(
  client: OrgValueClient,
  organizationId: Uuid,
): Promise<OrgSystemValueRow[]> {
  const [items, own] = await Promise.all([
    read(client, "system_context_item", "id, key, display_name, value_type, sort_order, value", (q) =>
      q.eq("item_class", "curated").eq("is_active", true).is("deleted_at", null).order("sort_order").order("display_name"),
    ),
    read(client, "system_context_item_org_value", "system_context_item_id, value", (q) =>
      q.eq("organization_id", organizationId).is("deleted_at", null),
    ),
  ]);
  const byItem = new Map(own.map((r) => [String(r.system_context_item_id), r.value]));
  return items.map((i) => ({
    itemId: String(i.id),
    key: String(i.key),
    displayName: String(i.display_name ?? i.key),
    valueType: String(i.value_type ?? "string"),
    defaultValue: i.value,
    orgValue: byItem.has(String(i.id)) ? byItem.get(String(i.id)) : undefined,
  }));
}

type DoorEnvelope = { ok?: boolean; error?: { code?: string; message?: string } };

async function callDoor(client: unknown, payload: Record<string, unknown>): Promise<OrgSystemValueResult> {
  const res = await lightDoorCall(client)<DoorEnvelope>("context_value_write", { p_payload: payload }, "orgSystemValue");
  if (!res.ok) return { ok: false, code: res.error.code, message: res.error.message };
  const env = res.data ?? {};
  if (!env.ok) {
    return { ok: false, code: env.error?.code ?? "internal", message: env.error?.message ?? "The value was not saved." };
  }
  return { ok: true };
}

/** Set this organization's own value for a System item. */
export function saveOrgSystemValue(
  client: unknown,
  args: { organizationId: Uuid; itemId: Uuid; value: unknown },
): Promise<OrgSystemValueResult> {
  return callDoor(client, {
    context_item_id: args.itemId,
    organization_id: args.organizationId,
    value: args.value,
    source_type: "manual",
  });
}

/** Remove this organization's own value, so its runs use the platform value again. */
export function clearOrgSystemValue(
  client: unknown,
  args: { organizationId: Uuid; itemId: Uuid },
): Promise<OrgSystemValueResult> {
  return callDoor(client, { context_item_id: args.itemId, organization_id: args.organizationId, clear: true });
}

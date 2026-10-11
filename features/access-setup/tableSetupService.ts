// features/access-setup/tableSetupService.ts
//
// THE TABLE SETUP DOORS (access-setup PLAN §12.1, migrations accesssetup_store_k/k2). All SECURITY DEFINER, declared in
// platform.client_callable_door; table admins write, never an agent:
//   custom.table_access_setup(table)                         the panel's read: setup, columns + parts, may_change, versions
//   custom.table_access_setup_preview(table, setup, moves)   who loses / gains sight per column before saving
//   custom.table_access_setup_set(table, setup, moves, why)  the write (check-gated, audited, admins notified on widening)
//   custom.table_access_setup_revert(table, audit_id)        one-click restore of an archived version
// Every wrapper returns AccessResult<T> and never throws.

import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";
import type { AccessResult } from "./service";

export type Reach = "all" | "own_rows" | "none";
export type CellLevel = "viewer" | "editor";

export interface StoreSeat {
  key: string;
  required?: boolean;
  fallback?: "org_owners_admins";
  resolver: {
    kind: "store";
    seat: Record<string, string>;
    fn: "custom.store_seat_holders(uuid,jsonb)";
    set_fn: "custom.store_seat_records(uuid,uuid,jsonb)";
    has_fn: "custom.store_seat_has(uuid,uuid,jsonb)";
  };
}

export interface TableSetup {
  admin_seats: string[];
  seats: StoreSeat[];
  grid: Record<string, Record<string, { level: CellLevel }>>;
}

export interface SetupColumn {
  id: string;
  key: string;
  label: string;
  part: string | null;
  partKey: string;
  word: string;
  person: boolean;
  workedOut: boolean;
}

export interface TableAccess {
  setup: TableSetup | null;
  mayChange: boolean;
  columns: SetupColumn[];
  versions: Array<{ auditId: string; at: string; note: string | null }>;
}

export interface PreviewPerson {
  userId: string;
  name: string;
  email: string | null;
  columns: Record<string, { sees: Reach; seesNext: Reach; edits: Reach; editsNext: Reach }>;
}

export interface SetupPreview {
  problems: string[];
  people: PreviewPerson[];
  losesSight: number;
  losesEdit: number;
  gainsSight: number;
}

type Rec = Record<string, unknown>;
const SERVICE_MESSAGE = "Could not reach the server. Try again in a moment.";
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter((x): x is Rec => typeof x === "object" && x !== null) : []);
const reach = (v: unknown): Reach => (v === "all" || v === "own_rows" ? v : "none");
const asRec = (v: unknown): Rec | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : null);

/** The seat grammar every store seat carries (the three resolver forms the store check requires). */
export function storeSeat(key: string, seat: Record<string, string>, required = false): StoreSeat {
  return {
    key,
    ...(required ? { required: true, fallback: "org_owners_admins" as const } : {}),
    resolver: {
      kind: "store",
      seat,
      fn: "custom.store_seat_holders(uuid,jsonb)",
      set_fn: "custom.store_seat_records(uuid,uuid,jsonb)",
      has_fn: "custom.store_seat_has(uuid,uuid,jsonb)",
    },
  };
}

function parseSetup(v: unknown): TableSetup | null {
  const r = asRec(v);
  if (!r) return null;
  return {
    admin_seats: Array.isArray(r.admin_seats) ? r.admin_seats.filter((x): x is string => typeof x === "string") : [],
    seats: recs(r.seats).flatMap((x) => (typeof x.key === "string" && asRec(x.resolver) ? [x as unknown as StoreSeat] : [])),
    grid: (asRec(r.grid) ?? {}) as TableSetup["grid"],
  };
}

async function settle(
  door: string,
  run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<AccessResult<Rec>> {
  try {
    const { data, error } = await run();
    if (error) return { ok: false, reason: "refused", message: error.message || SERVICE_MESSAGE };
    const rec = asRec(data);
    if (!rec) return { ok: false, reason: "unreadable", message: "The answer could not be read. Reload and try again." };
    if (rec.ok !== true) {
      const reason = str(rec.reason) ?? "refused";
      const message = reason === "not_reachable" ? "You cannot change who sees this table." : "That could not be done.";
      return { ok: false, reason, message };
    }
    return { ok: true, data: rec };
  } catch (thrown) {
    console.error(`[access-setup] ${door} did not reach the server`, thrown);
    return { ok: false, reason: "transport", message: SERVICE_MESSAGE };
  }
}

const toJson = (v: TableSetup | Record<string, string | null> | null): Json => JSON.parse(JSON.stringify(v)) as Json;

export async function fetchTableAccess(tableId: string): Promise<AccessResult<TableAccess>> {
  const r = await settle("table_access_setup", () => supabase.schema("custom").rpc("table_access_setup", { p_table_id: tableId }));
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      setup: parseSetup(r.data.setup),
      mayChange: r.data.may_change === true,
      columns: recs(r.data.columns).map((c) => ({
        id: str(c.id) ?? "",
        key: str(c.key) ?? "",
        label: str(c.label) ?? "",
        part: str(c.part),
        partKey: str(c.part_key) ?? "columns",
        word: str(c.word) ?? "internal",
        person: c.person === true,
        workedOut: c.worked_out === true,
      })),
      versions: recs(r.data.versions).map((v) => ({ auditId: str(v.audit_id) ?? "", at: str(v.at) ?? "", note: str(v.note) })),
    },
  };
}

export async function previewTableSetup(tableId: string, setup: TableSetup, moves: Record<string, string | null>): Promise<AccessResult<SetupPreview>> {
  const r = await settle("table_access_setup_preview", () =>
    supabase.schema("custom").rpc("table_access_setup_preview", { p_table_id: tableId, p_setup: toJson(setup), p_moves: toJson(moves) }),
  );
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      problems: Array.isArray(r.data.problems) ? r.data.problems.filter((x): x is string => typeof x === "string") : [],
      people: recs(r.data.people).map((p) => ({
        userId: str(p.user_id) ?? "",
        name: str(p.name) ?? str(p.email) ?? "",
        email: str(p.email),
        columns: Object.fromEntries(
          Object.entries(asRec(p.columns) ?? {}).map(([k, v]) => {
            const c = asRec(v) ?? {};
            return [k, { sees: reach(c.sees), seesNext: reach(c.sees_next), edits: reach(c.edits), editsNext: reach(c.edits_next) }];
          }),
        ),
      })),
      losesSight: typeof r.data.loses_sight === "number" ? r.data.loses_sight : 0,
      losesEdit: typeof r.data.loses_edit === "number" ? r.data.loses_edit : 0,
      gainsSight: typeof r.data.gains_sight === "number" ? r.data.gains_sight : 0,
    },
  };
}

export async function saveTableSetup(tableId: string, setup: TableSetup | null, moves: Record<string, string | null>, reason: string): Promise<AccessResult<{ notified: number }>> {
  const r = await settle("table_access_setup_set", () =>
    supabase.schema("custom").rpc("table_access_setup_set", { p_table_id: tableId, p_setup: toJson(setup), p_moves: toJson(moves), p_reason: reason }),
  );
  if (!r.ok) return r;
  return { ok: true, data: { notified: typeof r.data.notified === "number" ? r.data.notified : 0 } };
}

export async function revertTableSetup(tableId: string, auditId: string): Promise<AccessResult<{ ok: true }>> {
  const r = await settle("table_access_setup_revert", () => supabase.schema("custom").rpc("table_access_setup_revert", { p_table_id: tableId, p_audit_id: auditId }));
  if (!r.ok) return r;
  return { ok: true, data: { ok: true } };
}

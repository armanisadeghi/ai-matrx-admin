// features/access-setup/columnAccessService.ts
//
// THE TWO DOORS OF A COLUMN'S "WHO CAN SEE AND EDIT" (access-setup PLAN §12, Store Tables, phase 1).
// Both SECURITY DEFINER and declared in platform.client_callable_door (accesssetup_store_d):
//   custom.field_access_setup(field, proposed?)   the panel's read; with {word, part} it also counts who loses sight
//   custom.field_access_set(field, part, word)    a table admin's save (never an agent); audited
// Every wrapper returns AccessResult<T> and never throws.

import { supabase } from "@/utils/supabase/client";
import type { AccessResult } from "./service";

export interface ColumnAccessPerson {
  userId: string;
  name: string;
  email: string | null;
  level: string | null;
  sees: boolean;
  edits: boolean;
  seesNext: boolean | null;
  editsNext: boolean | null;
}

export interface ColumnAccess {
  field: { id: string; key: string; label: string; part: string | null; word: string; namesEachRecord: boolean; workedOut: boolean };
  mayChange: boolean;
  whyNot: string | null;
  parts: string[];
  partColumns: string[];
  words: Array<{ word: string; readNeeds: string; editNeeds: string }>;
  people: ColumnAccessPerson[];
  proposed: { word: string; part: string | null; losesSight: number; losesEdit: number; gainsSight: number } | null;
}

type Rec = Record<string, unknown>;
const SERVICE_MESSAGE = "Could not reach the server. Try again in a moment.";
const REFUSALS: Record<string, string> = {
  no_caller: "Sign in again.",
  not_reachable: "You cannot open this column's table.",
  unknown_word: "That privacy is not one this organization uses.",
};

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const bool = (v: unknown): boolean => v === true;
const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter((x): x is Rec => typeof x === "object" && x !== null) : []);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function parse(r: Rec): ColumnAccess | null {
  const f = r.field;
  if (typeof f !== "object" || f === null) return null;
  const field = f as Rec;
  const proposed = typeof r.proposed === "object" && r.proposed !== null ? (r.proposed as Rec) : null;
  return {
    field: {
      id: str(field.id) ?? "",
      key: str(field.key) ?? "",
      label: str(field.label) ?? "",
      part: str(field.part),
      word: str(field.word) ?? "internal",
      namesEachRecord: bool(field.names_each_record),
      workedOut: bool(field.worked_out),
    },
    mayChange: bool(r.may_change),
    whyNot: str(r.why_not),
    parts: strs(r.parts),
    partColumns: strs(r.part_columns),
    words: recs(r.words).map((w) => ({ word: str(w.word) ?? "", readNeeds: str(w.read_needs) ?? "", editNeeds: str(w.edit_needs) ?? "" })),
    people: recs(r.people).map((p) => ({
      userId: str(p.user_id) ?? "",
      name: str(p.name) ?? str(p.email) ?? "",
      email: str(p.email),
      level: str(p.level),
      sees: bool(p.sees),
      edits: bool(p.edits),
      seesNext: boolOrNull(p.sees_next),
      editsNext: boolOrNull(p.edits_next),
    })),
    proposed: proposed
      ? { word: str(proposed.word) ?? "", part: str(proposed.part), losesSight: num(proposed.loses_sight), losesEdit: num(proposed.loses_edit), gainsSight: num(proposed.gains_sight) }
      : null,
  };
}

export async function fetchColumnAccess(
  fieldId: string,
  proposed: { word: string; part: string | null } | null,
): Promise<AccessResult<ColumnAccess>> {
  try {
    const { data, error } = await supabase
      .schema("custom")
      .rpc("field_access_setup", { p_field_id: fieldId, ...(proposed ? { p_proposed: proposed } : {}) });
    if (error) {
      console.error("[access-setup] field_access_setup failed", error);
      return { ok: false, reason: "transport", message: SERVICE_MESSAGE };
    }
    const rec = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Rec) : null;
    if (!rec) return { ok: false, reason: "unreadable", message: "The answer could not be read. Reload and try again." };
    if (rec.ok !== true) {
      const reason = str(rec.reason) ?? "refused";
      return { ok: false, reason, message: REFUSALS[reason] ?? "That could not be done." };
    }
    const view = parse(rec);
    return view ? { ok: true, data: view } : { ok: false, reason: "unreadable", message: "The answer could not be read. Reload and try again." };
  } catch (thrown) {
    console.error("[access-setup] field_access_setup did not reach the server", thrown);
    return { ok: false, reason: "transport", message: SERVICE_MESSAGE };
  }
}

export async function saveColumnAccess(fieldId: string, part: string | null, word: string): Promise<AccessResult<{ columns: number }>> {
  try {
    const { data, error } = await supabase
      .schema("custom")
      .rpc("field_access_set", { p_field_id: fieldId, p_part: part ?? "", p_word: word });
    if (error) {
      // The door refuses in words (an agent, a non-admin, the record-naming column, a worked-out column).
      return { ok: false, reason: "refused", message: error.message || SERVICE_MESSAGE };
    }
    const rec = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Rec) : null;
    if (!rec || rec.ok !== true) {
      const reason = str(rec?.reason) ?? "refused";
      return { ok: false, reason, message: REFUSALS[reason] ?? "That could not be done." };
    }
    return { ok: true, data: { columns: num(rec.columns) } };
  } catch (thrown) {
    console.error("[access-setup] field_access_set did not reach the server", thrown);
    return { ok: false, reason: "transport", message: SERVICE_MESSAGE };
  }
}

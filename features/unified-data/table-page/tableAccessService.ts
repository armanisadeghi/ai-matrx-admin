// features/unified-data/table-page/tableAccessService.ts — AT-SHARE: the two reads behind the table header's
// "Request edit access" and "Activity" controls.
//
//   level     `custom.my_level(p_organization_id, p_id, 'table')`   the level this person holds on the table
//   activity  `custom.base_activity(p_organization_id, p_subject_id, p_limit, p_before)`  who changed what, paged
//   ask       `public.access_request_create` through the platform's one request primitive (features/access-gate)
//
// Doors speak a sentence when they refuse; it is passed on as is.

import { storeDoors } from "@ai-matrx/records/core";

import { supabase } from "@/utils/supabase/client";

export type TableLevel = "viewer" | "commenter" | "editor" | "admin" | "owner";

/** A person may ask for Edit only when they hold less than it. */
export function canAskForEdit(level: string | null | undefined): boolean {
  return level === "viewer" || level === "commenter";
}

export type ActivityKind = "record" | "field" | "table" | "view" | "automation" | "share";

export interface ActivityEntry {
  id: number;
  occurredAt: string;
  kind: ActivityKind;
  verb: string;
  title: string | null;
  tableId: string | null;
  subjectId: string | null;
  actorName: string;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  /** Pass back to read older entries; null when the ledger has nothing older. */
  nextBefore: number | null;
}

const KIND_WORD: Record<ActivityKind, string> = {
  record: "a record",
  field: "a field",
  table: "the table",
  view: "a view",
  automation: "an automation",
  share: "",
};
const SHARE_VERB: Record<string, string> = { shared: "shared with", "stopped sharing": "stopped sharing with" };

/** "Maya edited a record — Order 12". Names the person, never an id. */
export function activitySentence(entry: ActivityEntry): string {
  if (entry.kind === "share") return `${entry.actorName} ${SHARE_VERB[entry.verb] ?? "changed access for"} ${entry.title ?? "someone"}`;
  const what = entry.kind === "table" && entry.title ? `the table ${entry.title}` : KIND_WORD[entry.kind];
  const tail = entry.title && entry.kind !== "table" ? ` — ${entry.title}` : "";
  return `${entry.actorName} ${entry.verb} ${what}${tail}`;
}

/** Reads the door's JSON into entries; anything not shaped like an entry is dropped, never guessed. */
export function parseActivity(data: unknown): ActivityPage {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const raw = Array.isArray(root.entries) ? root.entries : [];
  const entries: ActivityEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const actor = e.actor && typeof e.actor === "object" ? (e.actor as Record<string, unknown>) : {};
    if (typeof e.id !== "number" || typeof e.kind !== "string" || typeof e.verb !== "string") continue;
    entries.push({
      id: e.id,
      occurredAt: String(e.occurred_at ?? ""),
      kind: e.kind as ActivityKind,
      verb: e.verb,
      title: typeof e.title === "string" && e.title ? e.title : null,
      tableId: typeof e.table_id === "string" ? e.table_id : null,
      subjectId: typeof e.subject_id === "string" ? e.subject_id : null,
      actorName: typeof actor.name === "string" && actor.name ? actor.name : "Someone",
    });
  }
  return { entries, nextBefore: typeof root.next_before === "number" ? root.next_before : null };
}

export async function readMyTableLevel(organizationId: string, tableId: string): Promise<string | null> {
  const { data, error } = await storeDoors(supabase).rpc("my_level", { p_organization_id: organizationId, p_id: tableId, p_type: "table" });
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : null;
}

export async function readActivity(organizationId: string, subjectId: string, before: number | null = null, limit = 50): Promise<ActivityPage> {
  const { data, error } = await storeDoors(supabase).rpc("base_activity", {
    p_organization_id: organizationId,
    p_subject_id: subjectId,
    p_limit: limit,
    p_before: before,
  });
  if (error) throw new Error(error.message);
  return parseActivity(data);
}

/** The finder runs at the merge's own level: Edit or above. */
export function canFindDuplicates(level: string | null | undefined): boolean {
  return level === "editor" || level === "admin" || level === "owner";
}

export interface DuplicateGroup {
  members: { id: string; title: string }[];
}

export function parseDuplicates(data: unknown): DuplicateGroup[] {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const groups = Array.isArray(root.groups) ? root.groups : [];
  const out: DuplicateGroup[] = [];
  for (const g of groups) {
    const members = g && typeof g === "object" && Array.isArray((g as Record<string, unknown>).members) ? ((g as Record<string, unknown>).members as unknown[]) : [];
    const kept = members
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object" && typeof (m as Record<string, unknown>).id === "string")
      .map((m) => ({ id: m.id as string, title: typeof m.title === "string" && m.title ? m.title : "(untitled)" }));
    if (kept.length > 1) out.push({ members: kept });
  }
  return out;
}

export async function findDuplicates(organizationId: string, tableId: string, fields: string[]): Promise<DuplicateGroup[]> {
  const { data, error } = await storeDoors(supabase).rpc("find_duplicates", { p_organization_id: organizationId, p_table_id: tableId, p_fields: fields, p_limit: 50 });
  if (error) throw new Error(error.message);
  return parseDuplicates(data);
}

/**
 * The Sheets menu's own saved state, kept on the workbook itself in `udt_workbooks.metadata.sheet_extras`
 * (merged with `mergeJsonColumn`, like the page setup and the table links beside it): settings,
 * saved macros, filter views and data connectors. One key at a time, so two writers never undo each other.
 */
"use client";

import { mergeJsonColumn } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";

type WorkbookMetaRow = { id: string; version: number; metadata: unknown };

export type SheetExtraKey = "settings" | "macros" | "filter_views" | "connectors" | "prefs";

export type ExtrasResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** One key of the `sheet_extras` object, or `undefined` when nothing was saved. Pure. */
export function extraFromMetadata(metadata: unknown, key: SheetExtraKey): unknown {
  const extras = (metadata as { sheet_extras?: unknown } | null | undefined)?.sheet_extras;
  return extras && typeof extras === "object" ? (extras as Record<string, unknown>)[key] : undefined;
}

/** `metadata` with one extra replaced and every other extra (and every other metadata key) kept. Pure. */
export function withExtra(metadata: unknown, key: SheetExtraKey, value: unknown): Record<string, unknown> {
  const current = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const extras = current.sheet_extras && typeof current.sheet_extras === "object" ? (current.sheet_extras as Record<string, unknown>) : {};
  return { ...current, sheet_extras: { ...extras, [key]: value } };
}

export async function readSheetExtra(workbookId: string, key: SheetExtraKey): Promise<ExtrasResult<unknown>> {
  const { data, error } = await supabase.schema("workbench").from("udt_workbooks").select("metadata").eq("id", workbookId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: extraFromMetadata(data?.metadata, key) };
}

export async function writeSheetExtra(workbookId: string, key: SheetExtraKey, value: unknown): Promise<ExtrasResult<unknown>> {
  const result = await mergeJsonColumn<WorkbookMetaRow>({
    fetchCurrent: () => supabase.schema("workbench").from("udt_workbooks").select("id, version, metadata").eq("id", workbookId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => withExtra(current, key, value),
    applyUpdate: ({ value: next, expectedVersion, nextVersion }) =>
      supabase
        .schema("workbench")
        .from("udt_workbooks")
        .update({ metadata: next as never, version: nextVersion })
        .eq("id", workbookId)
        .eq("version", expectedVersion)
        .select("id, version, metadata")
        .maybeSingle(),
  });
  if (result.status === "saved") return { ok: true, data: extraFromMetadata(result.row.metadata, key) };
  if (result.status === "not_found") return { ok: false, error: "This workbook could not be found" };
  if (result.status === "conflict") return { ok: false, error: "The workbook changed while saving; try again" };
  const reason: unknown = result.error;
  return { ok: false, error: reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Something went wrong" };
}

/** Every saved extra at once (one read when the editor opens). */
export async function readAllSheetExtras(workbookId: string): Promise<ExtrasResult<Record<SheetExtraKey, unknown>>> {
  const { data, error } = await supabase.schema("workbench").from("udt_workbooks").select("metadata").eq("id", workbookId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  const keys: SheetExtraKey[] = ["settings", "macros", "filter_views", "connectors", "prefs"];
  return { ok: true, data: Object.fromEntries(keys.map((k) => [k, extraFromMetadata(data?.metadata, k)])) as Record<SheetExtraKey, unknown> };
}

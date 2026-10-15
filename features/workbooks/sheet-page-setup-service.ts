/**
 * A workbook's print settings, read and written on the workbook itself:
 * `udt_workbooks.metadata.page_setup` (merged with `mergeJsonColumn`, like the table links beside it).
 */
"use client";

import { mergeJsonColumn } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";
import { normalizeSheetPageSetup, pageSetupFromMetadata, type SheetPageSetup } from "@/features/workbooks/sheet-page-setup";

type WorkbookMetaRow = { id: string; version: number; metadata: unknown };

export type PageSetupResult = { ok: true; data: SheetPageSetup } | { ok: false; error: string };

export async function readSheetPageSetup(workbookId: string): Promise<PageSetupResult> {
  const { data, error } = await supabase.schema("workbench").from("udt_workbooks").select("metadata").eq("id", workbookId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: pageSetupFromMetadata(data?.metadata) };
}

export async function writeSheetPageSetup(workbookId: string, setup: SheetPageSetup): Promise<PageSetupResult> {
  const clean = normalizeSheetPageSetup(setup);
  const result = await mergeJsonColumn<WorkbookMetaRow>({
    fetchCurrent: () => supabase.schema("workbench").from("udt_workbooks").select("id, version, metadata").eq("id", workbookId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => ({ ...current, page_setup: clean }),
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      supabase
        .schema("workbench")
        .from("udt_workbooks")
        .update({ metadata: value as never, version: nextVersion })
        .eq("id", workbookId)
        .eq("version", expectedVersion)
        .select("id, version, metadata")
        .maybeSingle(),
  });
  if (result.status === "saved") return { ok: true, data: pageSetupFromMetadata(result.row.metadata) };
  if (result.status === "not_found") return { ok: false, error: "This workbook could not be found" };
  if (result.status === "conflict") return { ok: false, error: "The workbook changed while saving; try again" };
  const reason: unknown = result.error;
  return { ok: false, error: reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Something went wrong" };
}

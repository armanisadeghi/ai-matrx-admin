/**
 * renamePdfDocument — restored from the extractor studio (folded away in 76ab72e802): keeps
 * `processed_documents.name` and the backing `cld_files` row in lock-step, so the PDF list, the workspace
 * title and `/files` always show the same name.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { renameFile } from "@/features/files/redux/thunks";
import { supabase } from "@/utils/supabase/client";
import { docprocDb } from "@/utils/supabase/docprocDb";
import { tryWriteOne, WriteDidNotLandError } from "@/utils/supabase/writeOne";
import { operationFailed } from "@/utils/errors";

export interface RenamePdfDocumentInput {
  docId: string;
  sourceKind: string | null;
  sourceId: string | null;
  newName: string;
  dispatch: AppDispatch;
}

export async function renamePdfDocument(
  input: RenamePdfDocumentInput,
): Promise<void> {
  const trimmed = input.newName.trim();
  if (!trimmed) return;

  const { error } = await tryWriteOne(
    docprocDb(supabase)
      .from("processed_documents")
      .update({ name: trimmed })
      .eq("id", input.docId)
      .select("id"),
    { action: "rename", noun: "document" },
  );
  if (error) throw error instanceof WriteDidNotLandError ? error : operationFailed("rename this document", error);

  if (input.sourceKind === "cld_file" && input.sourceId) {
    await input
      .dispatch(renameFile({ fileId: input.sourceId, newName: trimmed }))
      .unwrap()
      .catch(() => undefined);
  }
}

/**
 * renamePdfFile — the list's rename: the cloud FILE is renamed (it is what the list shows and what /files shows);
 * when a processed document exists for it, its name follows so the two never disagree. A failed file rename throws.
 */
export async function renamePdfFile(input: { fileId: string; docId: string | null; newName: string; dispatch: AppDispatch }): Promise<void> {
  const trimmed = input.newName.trim();
  if (!trimmed) return;
  await input.dispatch(renameFile({ fileId: input.fileId, newName: trimmed })).unwrap();
  if (!input.docId) return;
  const { error } = await tryWriteOne(
    docprocDb(supabase).from("processed_documents").update({ name: trimmed }).eq("id", input.docId).select("id"),
    { action: "rename", noun: "document" },
  );
  if (error) throw error instanceof WriteDidNotLandError ? error : operationFailed("rename this document", error);
}

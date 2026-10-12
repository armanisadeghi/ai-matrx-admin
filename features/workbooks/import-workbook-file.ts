/**
 * Spreadsheet file → a NEW workbook, the ONE import path: the Workbooks home and the editor's
 * File → Import both run it. The file is parsed before anything is created (a malformed file leaves
 * no empty workbook behind), the lossless original is stashed (non-fatal), and a failed save rolls
 * the new row back.
 */

import { fileHandler } from "@/features/files/handler/handler";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { isServiceFailure } from "@/features/data-tables/types";
import {
  createWorkbook,
  discardFailedWorkbook,
  saveSnapshot,
} from "@/features/workbooks/workbook-service";

/**
 * Pre-flight import file check. We deliberately do NOT use the `accept`
 * attribute on the picker (it greys out everything in Drive / Google
 * Sheets pickers on iOS and many Android pickers), so we validate after
 * pick. Returns null when the file is accepted, or a short user-facing
 * reason string when it isn't.
 */
export function unsupportedFileReason(file: File): string | null {
  const name = file.name.toLowerCase();
  // Native, parseable formats.
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    return null;
  }
  if (name.endsWith(".tsv") || name.endsWith(".txt")) return null; // SheetJS parses these too

  // Drive's "Google Sheets" shortcut is a tiny JSON pointer file that browsers cannot resolve into
  // the sheet; the Google Sheets import reads the real file through Google's own picker.
  if (name.endsWith(".gsheet")) {
    return "A Google Sheets shortcut can't be uploaded. Use Import from Google Sheets.";
  }
  // Anything else.
  return `"${file.name}" isn't a spreadsheet file. Supported: .xlsx, .xls, .csv. For a Google Sheet, use Import from Google Sheets.`;
}

export async function importWorkbookFile(
  file: File,
  organizationId: string | null,
): Promise<{ id: string; name: string; notCarried: string[] }> {
  const capturedOrganizationId = await ensureOrgId(organizationId);
  // Parse first — if the file is malformed, we surface the error
  // BEFORE creating an empty workbook the user would have to delete.
  const { xlsxToUniverWorkbook } =
    await import("@/features/workbooks/xlsx-to-univer");
  const droppedOnImport: string[] = [];
  const { uploadImportedImage } = await import("@/lib/univer/matrxImagePorts");
  const snapshot = await xlsxToUniverWorkbook(file, {
    uploadImage: uploadImportedImage,
    onDropped: (what) => droppedOnImport.push(what),
  });

  // Stash the lossless original in cld_files so users can download or
  // re-import the source later. Failure here is non-fatal — the workbook
  // import path is the primary deliverable, the original-file link is
  // a recoverability nicety (FK is ON DELETE SET NULL, so we'd nil out
  // the link if the file went away anyway). Log + continue on failure.
  let originalFileId: string | undefined;
  try {
    const uploaded = await fileHandler.upload(
      { kind: "file", file },
      { folderPath: "Workbooks/Imports" },
    );
    originalFileId = uploaded.fileId;
  } catch (uploadErr) {
    console.warn(
      "Workbook import: stashing original failed; continuing without link.",
      uploadErr,
    );
  }

  const cleanName = file.name.replace(/\.[^.]+$/, "") || "Imported workbook";
  const created = await createWorkbook({
    name: cleanName,
    description: `Imported from ${file.name}`,
    source: file.name.toLowerCase().endsWith(".csv")
      ? "imported_csv"
      : "imported_xlsx",
    organizationId: capturedOrganizationId,
    originalFileId,
  });
  if (isServiceFailure(created)) throw new Error(created.error);

  const saved = await saveSnapshot({
    workbookId: created.data.id,
    snapshot,
    origin: "imported",
    label: file.name,
  });
  if (isServiceFailure(saved)) {
    // Roll back the workbook so we don't leave an empty husk on import
    // failure. Best-effort, and a HARD delete on purpose: this row was
    // created seconds ago by this same flow and never reached the user, so
    // tombstoning it would leave invisible litter instead of cleaning up.
    await discardFailedWorkbook(created.data.id);
    throw new Error(saved.error);
  }

  return { id: created.data.id, name: cleanName, notCarried: droppedOnImport };
}

/**
 * pdfFileRows — what "Your PDFs" lists: the person's PDF FILES (`files.files` rows with a PDF type, read through the
 * cloud-files tree the Files app uses, so access and the system-files knob are the platform's own), never the
 * processed documents. A PDF appears the moment it is uploaded; whether its text has been extracted is a column
 * ("Text ready" / "Not extracted"), taken from the processed document that points at the file.
 *
 * Pure, so the rule is tested without a store. The active organization is never a filter here.
 */
import type { CloudFileRecord } from "@/features/files/types";
import { isListedFile } from "@/features/files/utils/user-visible";
import { matchesFileFilter } from "@/features/resource-manager/resource-picker/filesPickerLists";

/** The processed document that backs a file's text (one per file: the newest root). */
export interface PdfFileDoc {
  id: string;
  name: string;
  totalPages: number | null;
}

export type PdfTextStatus = "ready" | "none";

export const PDF_TEXT_STATUS_LABEL: Record<PdfTextStatus, string> = {
  ready: "Text ready",
  none: "Not extracted",
};

export interface PdfFileRow {
  /** The file id: opens /pdf/<id>, and is the row's identity for rename/archive. */
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fileSize: number | null;
  /** In the trash (the platform's archive for files). */
  archived: boolean;
  textStatus: PdfTextStatus;
  /** The processed document, when the text was extracted. */
  docId: string | null;
  totalPages: number | null;
}

export function pdfFileRows(
  filesById: Record<string, CloudFileRecord>,
  docsByFileId: ReadonlyMap<string, PdfFileDoc>,
  { showSystemFiles = false }: { showSystemFiles?: boolean } = {},
): PdfFileRow[] {
  return Object.values(filesById)
    .filter((f) => !!f && isListedFile(f, showSystemFiles) && matchesFileFilter(f, "pdfs"))
    .map((f): PdfFileRow => {
      const doc = docsByFileId.get(f.id) ?? null;
      return {
        id: f.id,
        name: f.fileName,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        fileSize: f.fileSize ?? null,
        archived: !!f.deletedAt,
        textStatus: doc ? "ready" : "none",
        docId: doc?.id ?? null,
        totalPages: doc?.totalPages ?? null,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

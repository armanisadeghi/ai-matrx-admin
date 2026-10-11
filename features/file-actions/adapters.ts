/**
 * The ONE adapter per file-like record type. Lists (useFileItemActions) and
 * editors (useFileRecordActions) both take their service doors from here, so
 * rename / copy / move / trash / restore / download are defined exactly once.
 */

import { isServiceFailure, type DocumentRow, type Workbook } from "@/features/data-tables/types";
import {
  copyWorkbook,
  deleteWorkbook,
  getLatestSnapshot,
  moveWorkbook,
  renameWorkbook,
  restoreWorkbook,
} from "@/features/workbooks/workbook-service";
import {
  copyDocument,
  deleteDocument,
  getLatestDocumentSnapshot,
  moveDocument,
  renameDocument,
  restoreDocument,
} from "@/features/documents/document-service";
import { downloadSheetAsCsv, downloadSheetAsPdf } from "@/features/workbooks/sheet-output";
import type { FileDownload, FileKindAdapter } from "./types";

async function latestWorkbookSnapshot(id: string): Promise<unknown> {
  const res = await getLatestSnapshot(id);
  if (isServiceFailure(res)) throw new Error(res.error);
  if (!res.data) throw new Error("This workbook has no saved content yet");
  return res.data.snapshot;
}

async function latestDocumentMarkdown(id: string): Promise<string> {
  const res = await getLatestDocumentSnapshot(id);
  if (isServiceFailure(res)) throw new Error(res.error);
  if (!res.data) throw new Error("This document has no saved content yet");
  const { univerDocToMarkdown } = await import("@/features/documents/univer-doc-to-markdown");
  return univerDocToMarkdown(res.data.snapshot);
}

export const WORKBOOK_ADAPTER: FileKindAdapter<Workbook> = {
  noun: "workbook",
  resourceType: "workbook",
  entityType: "workbook",
  nameOf: (w) => w.workbook_name,
  projectIdOf: (w) => w.project_id,
  hrefFor: (id) => `/workbooks/${id}`,
  rename: renameWorkbook,
  copy: copyWorkbook,
  move: moveWorkbook,
  trash: deleteWorkbook,
  restore: restoreWorkbook,
  downloads: (id, name): FileDownload[] => [
    {
      label: "Excel (.xlsx)",
      run: async () => {
        const snapshot = await latestWorkbookSnapshot(id);
        const [{ downloadUniverAsXlsx }, { resolveExportImage }] = await Promise.all([
          import("@/features/workbooks/univer-to-xlsx"),
          import("@/lib/univer/matrxImagePorts"),
        ]);
        await downloadUniverAsXlsx(snapshot as Parameters<typeof downloadUniverAsXlsx>[0], { filename: name, resolveImage: resolveExportImage });
      },
    },
    {
      label: "CSV (first sheet)",
      run: async () => {
        const snapshot = await latestWorkbookSnapshot(id);
        if (!downloadSheetAsCsv(snapshot, { filename: name })) throw new Error("This sheet has nothing to export");
      },
    },
    {
      label: "PDF (first sheet)",
      run: async () => {
        const snapshot = await latestWorkbookSnapshot(id);
        if (!(await downloadSheetAsPdf(snapshot, { title: name }))) throw new Error("This sheet has nothing to export");
      },
    },
  ],
};

export const DOCUMENT_ADAPTER: FileKindAdapter<DocumentRow> = {
  noun: "document",
  resourceType: "udt_document",
  entityType: "udt_document",
  nameOf: (d) => d.document_name,
  projectIdOf: (d) => d.project_id,
  hrefFor: (id) => `/documents/${id}`,
  rename: renameDocument,
  copy: copyDocument,
  move: moveDocument,
  trash: deleteDocument,
  restore: restoreDocument,
  downloads: (id, name): FileDownload[] =>
    (
      [
        ["pdf", "PDF"],
        ["docx", "Word"],
        ["markdown", "Markdown"],
      ] as const
    ).map(([format, label]) => ({
      label,
      run: async () => {
        const markdown = await latestDocumentMarkdown(id);
        const { exportContent } = await import("@ai-matrx/rich-content/copy/content-export");
        await exportContent(markdown, format, name);
      },
    })),
};

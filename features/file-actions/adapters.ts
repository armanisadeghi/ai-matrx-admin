/**
 * The ONE adapter per file-like record type. Lists (useFileItemActions) and
 * editors (useFileRecordActions) both take their service doors from here, so
 * rename / copy / move / trash / restore / download are defined exactly once.
 */

import { isServiceFailure } from "@/features/data-tables/types";
import { type DocumentRow, type Workbook } from "@ai-matrx/office/core";
import {
  copyWorkbook,
  deleteWorkbook,
  moveWorkbook,
  renameWorkbook,
  restoreWorkbook,
} from "@ai-matrx/office/sheets";
import {
  copyDocument,
  deleteDocument,
  moveDocument,
  renameDocument,
  restoreDocument,
} from "@ai-matrx/office/docs";
import { downloadSheetAsCsv, downloadSheetAsPdf } from "@ai-matrx/office/sheets";
import {
  copyPresentation,
  deletePresentation,
  getPresentation,
  movePresentation,
  renamePresentation,
  restorePresentation,
  type PresentationRow,
} from "@/features/presentations/presentation-service";
import { deckDownloads } from "@/features/presentations/deck-export";
import { readCurrentDocumentMarkdown, readCurrentWorkbook } from "@/lib/collab/current-record";
import type { FileDownload, FileKindAdapter } from "./types";

// A list menu has no editor, so its downloads read the record's CURRENT content: the co-edited room folded to
// head (edits not yet saved included), or the newest snapshot when nobody is editing. Stale falls back in a toast.
async function latestWorkbookSnapshot(id: string): Promise<unknown> {
  const { snapshot } = await readCurrentWorkbook(id);
  if (!snapshot) throw new Error("This workbook has no saved content yet");
  return snapshot;
}

async function latestDocumentMarkdown(id: string): Promise<string> {
  const markdown = await readCurrentDocumentMarkdown(id);
  if (markdown === null) throw new Error("This document has no saved content yet");
  return markdown;
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
          import("@ai-matrx/office/sheets/xlsx"),
          import("@/lib/univer-host").then(async () => import("@ai-matrx/office/univer")),
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
        const { readSheetPageSetup } = await import("@ai-matrx/office/sheets");
        const saved = await readSheetPageSetup(id);
        if (!saved.ok) throw new Error(saved.error);
        // No live selection from a list: "selected cells" prints the first sheet.
        const setup = saved.data.scope === "selection" ? { ...saved.data, scope: "sheet" as const } : saved.data;
        if (!(await downloadSheetAsPdf(snapshot, { title: name, setup }))) throw new Error("This sheet has nothing to export");
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

async function savedDeck(id: string) {
  const res = await getPresentation(id);
  if (isServiceFailure(res)) throw new Error(res.error);
  return res.data.deck;
}

export const PRESENTATION_ADAPTER: FileKindAdapter<PresentationRow> = {
  noun: "presentation",
  resourceType: "presentation",
  entityType: "presentation",
  nameOf: (p) => p.name,
  projectIdOf: (p) => p.project_id,
  hrefFor: (id) => `/presentations/${id}`,
  rename: renamePresentation,
  copy: copyPresentation,
  move: movePresentation,
  trash: deletePresentation,
  restore: restorePresentation,
  downloads: (id, name) => deckDownloads(() => savedDeck(id), name),
};

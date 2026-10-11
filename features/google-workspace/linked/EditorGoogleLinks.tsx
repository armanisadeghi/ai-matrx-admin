"use client";

/**
 * The two editor hook-ups: a workbook's live Univer workbook and a document's
 * live Univer doc, each lent to `GoogleLinkControl` as an adapter.
 */

import type { IDocumentData, IWorkbookData } from "@univerjs/core";
import type { FUniver } from "@univerjs/presets";

import { isServiceFailure } from "@/features/data-tables/types";
import { getLatestSnapshot, saveSnapshot } from "@/features/workbooks/workbook-service";
import { getLatestDocumentSnapshot, saveDocumentSnapshot } from "@/features/documents/document-service";
import { univerDocToMarkdown } from "@/features/documents/univer-doc-to-markdown";
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";
import { mountUniverDocument } from "@/features/documents/univer-mount-document";
import { sanitizeUniverDocSnapshot } from "@/features/documents/utils/sanitizeUniverDocSnapshot";

import { GoogleLinkControl, type GoogleLinkAdapter } from "./GoogleLinkControl";

function liveApi(apiRef: React.RefObject<FUniver | null>): FUniver {
  const api = apiRef.current;
  if (!api) throw new Error("The editor is not ready yet. Try again in a moment.");
  return api;
}

export function WorkbookGoogleLink({
  apiRef,
  workbookId,
  workbookName,
  editable,
}: {
  apiRef: React.RefObject<FUniver | null>;
  workbookId: string;
  workbookName?: string;
  editable: boolean;
}) {
  const adapter: GoogleLinkAdapter = {
    recordKind: "workbook",
    recordId: workbookId,
    title: workbookName || "Untitled workbook",
    readLocal: () => {
      const workbook = liveApi(apiRef).getActiveWorkbook();
      if (!workbook) throw new Error("No workbook is open.");
      return workbook.save();
    },
    applyRemote: async (content) => {
      const api = liveApi(apiRef);
      const current = api.getActiveWorkbook();
      const snapshot = { ...(content as Partial<IWorkbookData>) };
      if (current) {
        snapshot.id = current.getId();
        api.disposeUnit(current.getId());
      }
      api.createWorkbook(snapshot);
      const res = await saveSnapshot({
        workbookId,
        snapshot,
        origin: "imported",
        label: "Updated from Google Sheets",
      });
      if (isServiceFailure(res)) throw new Error(`Google's version is showing but was not saved: ${res.error}`);
      return res.data.id;
    },
    latestLocalSnapshotId: async () => {
      const res = await getLatestSnapshot(workbookId);
      return isServiceFailure(res) ? null : (res.data?.id ?? null);
    },
  };
  return <GoogleLinkControl adapter={adapter} editable={editable} />;
}

export function DocumentGoogleLink({
  apiRef,
  documentId,
  documentName,
  editable,
}: {
  apiRef: React.RefObject<FUniver | null>;
  documentId: string;
  documentName?: string;
  editable: boolean;
}) {
  const adapter: GoogleLinkAdapter = {
    recordKind: "document",
    recordId: documentId,
    title: documentName || "Untitled document",
    readLocal: () => {
      const doc = liveApi(apiRef).getActiveDocument();
      if (!doc) throw new Error("No document is open.");
      return univerDocToMarkdown(doc.save());
    },
    applyRemote: async (content) => {
      const api = liveApi(apiRef);
      const current = api.getActiveDocument();
      const snapshot = sanitizeUniverDocSnapshot(
        markdownToUniverDoc(String(content ?? ""), documentName) as Partial<IDocumentData>,
        documentId,
      );
      if (current) api.disposeUnit(current.getId());
      mountUniverDocument(api, snapshot);
      const res = await saveDocumentSnapshot({
        documentId,
        snapshot,
        origin: "imported",
        label: "Updated from Google Docs",
      });
      if (!res.success) throw new Error(`Google's version is showing but was not saved: ${res.error}`);
      return res.data.id;
    },
    latestLocalSnapshotId: async () => {
      const res = await getLatestDocumentSnapshot(documentId);
      return res.success ? (res.data?.id ?? null) : null;
    },
  };
  return <GoogleLinkControl adapter={adapter} editable={editable} />;
}

"use client";

/**
 * The two editor hook-ups: a workbook's live Univer workbook and a document's
 * live Univer doc, each lent to `GoogleLinkControl` as an adapter.
 *
 * Taking Google's version SAVES it first, then shows it through the one
 * content-replacement door (`lib/univer/openEditorContent`) — the same path
 * as a history restore, so collab peers follow and no autosave writes the old
 * content back. Never dispose / create Univer units here.
 */

import { useEffect, useState } from "react";
import type { IDocumentData, IWorkbookData } from "@univerjs/core";
import type { FUniver } from "@univerjs/presets";

import { isServiceFailure } from "@/features/data-tables/types";
import { getLatestSnapshot, saveSnapshot } from "@/features/workbooks/workbook-service";
import { getLatestDocumentSnapshot, saveDocumentSnapshot } from "@/features/documents/document-service";
import { univerDocToMarkdown } from "@/features/documents/univer-doc-to-markdown";
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";
import { showSavedSnapshot } from "@/lib/univer/openEditorContent";
import { sanitizeUniverDocSnapshot } from "@/features/documents/utils/sanitizeUniverDocSnapshot";

import { GoogleLinkControl, type GoogleLinkAdapter } from "./GoogleLinkControl";

// An open editor registers its live adapter here, so the record's File menu (mounted elsewhere in
// the page) offers the SAME Google actions over the same live content as the toolbar button.
const liveAdapters = new Map<string, GoogleLinkAdapter>();
const liveListeners = new Set<() => void>();
const liveKey = (kind: string, id: string) => `${kind}:${id}`;

function registerLiveAdapter(adapter: GoogleLinkAdapter): () => void {
  const key = liveKey(adapter.recordKind, adapter.recordId);
  liveAdapters.set(key, adapter);
  liveListeners.forEach((l) => l());
  return () => {
    if (liveAdapters.get(key) === adapter) liveAdapters.delete(key);
    liveListeners.forEach((l) => l());
  };
}

/** The open editor's live adapter for a record, or null until its editor is ready. */
export function useLiveGoogleAdapter(kind: "workbook" | "document", id: string): GoogleLinkAdapter | null {
  const [, bump] = useState(0);
  useEffect(() => {
    const listener = () => bump((n) => n + 1);
    liveListeners.add(listener);
    return () => {
      liveListeners.delete(listener);
    };
  }, []);
  return liveAdapters.get(liveKey(kind, id)) ?? null;
}

function liveApi(apiRef: React.RefObject<FUniver | null>): FUniver {
  const api = apiRef.current;
  if (!api) throw new Error("The editor is not ready yet. Try again in a moment.");
  return api;
}

export function workbookGoogleAdapter(
  apiRef: React.RefObject<FUniver | null>,
  workbookId: string,
  workbookName?: string,
): GoogleLinkAdapter {
  return {
    recordKind: "workbook",
    recordId: workbookId,
    title: workbookName || "Untitled workbook",
    readLocal: () => {
      const workbook = liveApi(apiRef).getActiveWorkbook();
      if (!workbook) throw new Error("No workbook is open.");
      return workbook.save();
    },
    applyRemote: async (content) => {
      const current = liveApi(apiRef).getActiveWorkbook();
      const snapshot = { ...(content as Partial<IWorkbookData>) };
      // Same unit id as the open workbook: collab peers address it by id.
      if (current) snapshot.id = current.getId();
      const res = await saveSnapshot({
        workbookId,
        snapshot,
        origin: "imported",
        label: "Updated from Google Sheets",
      });
      if (isServiceFailure(res)) throw new Error(`Google's version was not saved: ${res.error}`);
      const shown = await showSavedSnapshot("workbook", workbookId, { id: res.data.id, snapshot });
      if (!shown) throw new Error("Google's version was saved, but the editor is closed. Reopen the workbook to see it.");
      return res.data.id;
    },
    latestLocalSnapshotId: async () => {
      const res = await getLatestSnapshot(workbookId);
      return isServiceFailure(res) ? null : (res.data?.id ?? null);
    },
  };
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
  const adapter = workbookGoogleAdapter(apiRef, workbookId, workbookName);
  useEffect(() => registerLiveAdapter(adapter), [workbookId, workbookName]);
  return <GoogleLinkControl adapter={adapter} editable={editable} />;
}

export function documentGoogleAdapter(
  apiRef: React.RefObject<FUniver | null>,
  documentId: string,
  documentName?: string,
): GoogleLinkAdapter {
  return {
    recordKind: "document",
    recordId: documentId,
    title: documentName || "Untitled document",
    readLocal: () => {
      const doc = liveApi(apiRef).getActiveDocument();
      if (!doc) throw new Error("No document is open.");
      return univerDocToMarkdown(doc.save());
    },
    applyRemote: async (content) => {
      liveApi(apiRef);
      const snapshot = sanitizeUniverDocSnapshot(
        markdownToUniverDoc(String(content ?? ""), documentName) as Partial<IDocumentData>,
        documentId,
      );
      const res = await saveDocumentSnapshot({
        documentId,
        snapshot,
        origin: "imported",
        label: "Updated from Google Docs",
      });
      if (!res.success) throw new Error(`Google's version was not saved: ${res.error}`);
      const shown = await showSavedSnapshot("document", documentId, { id: res.data.id, snapshot });
      if (!shown) throw new Error("Google's version was saved, but the editor is closed. Reopen the document to see it.");
      return res.data.id;
    },
    latestLocalSnapshotId: async () => {
      const res = await getLatestDocumentSnapshot(documentId);
      return res.success ? (res.data?.id ?? null) : null;
    },
  };
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
  const adapter = documentGoogleAdapter(apiRef, documentId, documentName);
  useEffect(() => registerLiveAdapter(adapter), [documentId, documentName]);
  return <GoogleLinkControl adapter={adapter} editable={editable} />;
}

/**
 * A list row has no open editor: its content is the latest SAVED snapshot, and an update from
 * Google saves a new snapshot (opening the record shows it). The same adapter shape as the
 * editors, so the Google rows in a list menu are the ones in the editor.
 */
export function savedRecordGoogleAdapter(
  recordKind: "workbook" | "document",
  recordId: string,
  title: string,
): GoogleLinkAdapter {
  if (recordKind === "workbook") {
    return {
      recordKind,
      recordId,
      title,
      readLocal: async () => {
        const res = await getLatestSnapshot(recordId);
        if (isServiceFailure(res)) throw new Error(res.error);
        if (!res.data) throw new Error("Open this workbook once before sending it to Google.");
        return res.data.snapshot;
      },
      applyRemote: async (content) => {
        const res = await saveSnapshot({
          workbookId: recordId,
          snapshot: { ...(content as object) },
          origin: "imported",
          label: "Updated from Google Sheets",
        });
        if (isServiceFailure(res)) throw new Error(`Google's version was not saved: ${res.error}`);
        return res.data.id;
      },
      latestLocalSnapshotId: async () => {
        const res = await getLatestSnapshot(recordId);
        return isServiceFailure(res) ? null : (res.data?.id ?? null);
      },
    };
  }
  return {
    recordKind,
    recordId,
    title,
    readLocal: async () => {
      const res = await getLatestDocumentSnapshot(recordId);
      if (!res.success) throw new Error(res.error);
      if (!res.data) throw new Error("Open this document once before sending it to Google.");
      return univerDocToMarkdown(res.data.snapshot);
    },
    applyRemote: async (content) => {
      const snapshot = sanitizeUniverDocSnapshot(
        markdownToUniverDoc(String(content ?? ""), title) as Partial<IDocumentData>,
        recordId,
      );
      const res = await saveDocumentSnapshot({
        documentId: recordId,
        snapshot,
        origin: "imported",
        label: "Updated from Google Docs",
      });
      if (!res.success) throw new Error(`Google's version was not saved: ${res.error}`);
      return res.data.id;
    },
    latestLocalSnapshotId: async () => {
      const res = await getLatestDocumentSnapshot(recordId);
      return res.success ? (res.data?.id ?? null) : null;
    },
  };
}

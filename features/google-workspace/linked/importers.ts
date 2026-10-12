/**
 * Google file -> new linked workbook / document. The person picks the file in
 * Google's own Picker (drive.file: we only ever see what they pick), the pick
 * is registered, the content converted on the server, and the new record is
 * saved with its Google link so Update / Push work from the first open.
 */
"use client";

import { pickGoogleWorkspaceFile } from "@/lib/googlePicker";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { isServiceFailure } from "@/features/data-tables/types";
import { createWorkbook, saveSnapshot, deleteWorkbook } from "@/features/workbooks/workbook-service";
import { createDocument, saveDocumentSnapshot, deleteDocument } from "@/features/documents/document-service";
import { deriveDocumentName, markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";
import { sanitizeUniverDocSnapshot } from "@/features/documents/utils/sanitizeUniverDocSnapshot";
import { getGoogleDrivePickerToken } from "@/features/google-workspace/drivePickerToken";
import { registerSelectedGoogleFile } from "@/features/google-workspace/service";
import type { GoogleConnectionRef } from "@/features/google-workspace/connection";

import { writeGoogleLink, type GoogleFileLink } from "./link-store";
import { createDocFromMarkdown, createSheetFromWorkbook, readDocAsMarkdown, readSheetAsWorkbook } from "./linkedService";
import { googleImageNote } from "./doc-images";

const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const DOC_MIME = "application/vnd.google-apps.document";

export type ImportOutcome = { id: string; name: string; note?: string | null } | null;

/** Google's own default names ("Untitled document"…) say nothing; the content's title does. */
export function isPlaceholderName(name: string | null | undefined): boolean {
  return !name || /^untitled( (document|spreadsheet|workbook))?$/i.test(name.trim());
}

/** The name a document should carry: Google's, unless it is a placeholder and the text has a title. */
export function documentNameFrom(googleName: string | null | undefined, markdown: string): string {
  if (!isPlaceholderName(googleName)) return String(googleName).trim();
  const derived = markdown.trim() ? deriveDocumentName(markdown) : "";
  return derived && !/^Document \d/.test(derived) ? derived : (googleName?.trim() || "Untitled document");
}

async function pick(connection: GoogleConnectionRef, mime: string) {
  const token = await getGoogleDrivePickerToken({ id: connection.connectionId });
  const picked = await pickGoogleWorkspaceFile(token, { mimeTypes: [mime] });
  if (!picked) return null; // closed the Picker: nothing happened
  return registerSelectedGoogleFile(connection.connectionId, picked.id);
}

function linkFor(
  kind: GoogleFileLink["kind"],
  connection: GoogleConnectionRef,
  file: { fileId: string; name: string; webViewLink: string | null; recordId: string | null },
  remoteVersion: string | null,
  snapshotId: string,
): GoogleFileLink {
  const now = new Date().toISOString();
  return {
    kind,
    connectionId: connection.connectionId,
    fileId: file.fileId,
    name: file.name,
    webViewLink: file.webViewLink,
    recordId: file.recordId,
    linkedAt: now,
    lastSyncedAt: now,
    remoteVersion,
    localSnapshotId: snapshotId,
    localFingerprint: null,
    baselineOnOpen: true,
    lastDirection: "from_google",
  };
}

/** Pick a Google Sheet and open it as a new, linked workbook. */
export async function importGoogleSheetAsWorkbook(connection: GoogleConnectionRef): Promise<ImportOutcome> {
  const file = await pick(connection, SHEET_MIME);
  if (!file) return null;
  const organizationId = await ensureOrgId(null);
  const created = await createWorkbook({ name: file.name, source: "linked_gsheet", organizationId });
  if (isServiceFailure(created)) throw new Error(`Could not create the workbook: ${created.error}`);
  const workbookId = created.data.id;
  try {
    const { workbook, remote } = await readSheetAsWorkbook(connection.connectionId, file.fileId, workbookId);
    const saved = await saveSnapshot({ workbookId, snapshot: workbook, origin: "imported", label: "Imported from Google Sheets" });
    if (isServiceFailure(saved)) throw new Error(saved.error);
    const linked = await writeGoogleLink("workbook", workbookId, linkFor("google_sheet", connection, file, remote.version, saved.data.id));
    if (!linked.ok) throw new Error(linked.error);
  } catch (error) {
    // Never leave an empty husk behind an import that did not land.
    await deleteWorkbook(workbookId);
    throw error;
  }
  return { id: workbookId, name: file.name };
}

/** Pick a Google Doc and open it as a new, linked document. */
export async function importGoogleDocAsDocument(connection: GoogleConnectionRef): Promise<ImportOutcome> {
  const file = await pick(connection, DOC_MIME);
  if (!file) return null;
  const organizationId = await ensureOrgId(null);
  // Read first: the name comes from Google's file, or its own title when Google's is a placeholder.
  const { markdown, remote } = await readDocAsMarkdown(connection.connectionId, file.fileId);
  const name = documentNameFrom(remote.name ?? file.name, markdown);
  const created = await createDocument({ name, source: "linked_gdoc", organizationId });
  if (!created.success) throw new Error(`Could not create the document: ${created.error}`);
  const documentId = created.data.id;
  try {
    const snapshot = sanitizeUniverDocSnapshot(markdownToUniverDoc(markdown, name), documentId);
    const saved = await saveDocumentSnapshot({ documentId, snapshot, origin: "imported", label: "Imported from Google Docs" });
    if (!saved.success) throw new Error(saved.error);
    const linked = await writeGoogleLink("document", documentId, linkFor("google_doc", connection, file, remote.version, saved.data.id));
    if (!linked.ok) throw new Error(linked.error);
  } catch (error) {
    await deleteDocument(documentId);
    throw error;
  }
  return { id: documentId, name, note: googleImageNote(markdown) };
}

const BLANK_SHEET_ID = "sheet-1";
const blankWorkbook = (name: string) => ({
  name,
  sheetOrder: [BLANK_SHEET_ID],
  sheets: { [BLANK_SHEET_ID]: { id: BLANK_SHEET_ID, name: "Sheet1", cellData: {} } },
});

/**
 * New, linked both ways from the first click: a blank workbook / document here
 * and its Google Sheet / Doc in Drive. A create the organization sends for
 * approval still opens the record here (the link lands once approved).
 */
export async function createLinkedBlank(
  kind: "workbook" | "document",
  connection: GoogleConnectionRef,
): Promise<{ id: string; webViewLink: string | null; assistId: string | null }> {
  const organizationId = await ensureOrgId(null);
  if (kind === "workbook") {
    const name = "Untitled workbook";
    const created = await createWorkbook({ name, source: "linked_gsheet", organizationId });
    if (isServiceFailure(created)) throw new Error(`Could not create the workbook: ${created.error}`);
    const id = created.data.id;
    try {
      const content = blankWorkbook(name);
      const saved = await saveSnapshot({ workbookId: id, snapshot: content, origin: "imported", label: "New in Google Sheets" });
      if (isServiceFailure(saved)) throw new Error(saved.error);
      const outcome = await createSheetFromWorkbook(connection.connectionId, name, content);
      if (outcome.proposed) return { id, webViewLink: null, assistId: outcome.assistId };
      const { file, remote } = outcome.result;
      const link = { ...linkFor("google_sheet", connection, file, remote.version, saved.data.id), baselineOnOpen: true, lastDirection: "to_google" as const };
      const linked = await writeGoogleLink("workbook", id, link);
      if (!linked.ok) throw new Error(linked.error);
      return { id, webViewLink: file.webViewLink ?? remote.webViewLink, assistId: null };
    } catch (error) {
      await deleteWorkbook(id);
      throw error;
    }
  }
  const name = "Untitled document";
  const created = await createDocument({ name, source: "linked_gdoc", organizationId });
  if (!created.success) throw new Error(`Could not create the document: ${created.error}`);
  const id = created.data.id;
  try {
    const snapshot = sanitizeUniverDocSnapshot(markdownToUniverDoc("", name), id);
    const saved = await saveDocumentSnapshot({ documentId: id, snapshot, origin: "imported", label: "New in Google Docs" });
    if (!saved.success) throw new Error(saved.error);
    const outcome = await createDocFromMarkdown(connection.connectionId, name, "");
    if (outcome.proposed) return { id, webViewLink: null, assistId: outcome.assistId };
    const { file, remote } = outcome.result;
    const link = { ...linkFor("google_doc", connection, file, remote.version, saved.data.id), baselineOnOpen: true, lastDirection: "to_google" as const };
    const linked = await writeGoogleLink("document", id, link);
    if (!linked.ok) throw new Error(linked.error);
    return { id, webViewLink: file.webViewLink ?? remote.webViewLink, assistId: null };
  } catch (error) {
    await deleteDocument(id);
    throw error;
  }
}

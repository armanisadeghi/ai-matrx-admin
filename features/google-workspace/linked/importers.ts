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
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";
import { sanitizeUniverDocSnapshot } from "@/features/documents/utils/sanitizeUniverDocSnapshot";
import { getGoogleDrivePickerToken } from "@/features/google-workspace/drivePickerToken";
import { registerSelectedGoogleFile } from "@/features/google-workspace/service";
import type { GoogleConnectionRef } from "@/features/google-workspace/connection";

import { writeGoogleLink, type GoogleFileLink } from "./link-store";
import { readDocAsMarkdown, readSheetAsWorkbook } from "./linkedService";

const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const DOC_MIME = "application/vnd.google-apps.document";

export type ImportOutcome = { id: string; name: string } | null;

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
  const created = await createDocument({ name: file.name, organizationId });
  if (!created.success) throw new Error(`Could not create the document: ${created.error}`);
  const documentId = created.data.id;
  try {
    const { markdown, remote } = await readDocAsMarkdown(connection.connectionId, file.fileId);
    const snapshot = sanitizeUniverDocSnapshot(markdownToUniverDoc(markdown, file.name), documentId);
    const saved = await saveDocumentSnapshot({ documentId, snapshot, origin: "imported", label: "Imported from Google Docs" });
    if (!saved.success) throw new Error(saved.error);
    const linked = await writeGoogleLink("document", documentId, linkFor("google_doc", connection, file, remote.version, saved.data.id));
    if (!linked.ok) throw new Error(linked.error);
  } catch (error) {
    await deleteDocument(documentId);
    throw error;
  }
  return { id: documentId, name: file.name };
}

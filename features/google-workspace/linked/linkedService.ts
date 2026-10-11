/**
 * The client half of aidream's `/google-workspace/linked/*` doors: a workbook
 * <-> a Google Sheet, a document <-> a Google Doc. The converters live on the
 * server beside the Google calls; this file only carries snapshots and answers.
 *
 * Every write returns the same `GoogleWriteOutcome` union as the other Google
 * writes, so a 202 "sent for approval" can never read as done.
 */
"use client";

import { postGoogleBackend } from "@/features/marketing/google/service";
import {
  effectiveOrganizationId,
  responseRecord,
  selectedFile,
  writeOutcome,
  type GoogleWriteOutcome,
} from "@/features/google-workspace/service";
import type { SelectedGoogleFile } from "@/features/google-workspace/types";

export interface GoogleRemoteVersion {
  fileId: string;
  /** Content fingerprint: changes the moment the file's content does. */
  version: string | null;
  modifiedTime: string | null;
  name: string | null;
  webViewLink: string | null;
}

export interface LinkedCreate {
  file: SelectedGoogleFile;
  remote: GoogleRemoteVersion;
  notes: string[];
}

export interface LinkedPush {
  status: "pushed" | "conflict";
  remote: GoogleRemoteVersion;
  notes: string[];
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function remoteFrom(raw: unknown): GoogleRemoteVersion {
  const r = (raw ?? {}) as Record<string, unknown>;
  const fileId = str(r.file_id);
  if (!fileId) throw new Error("Google returned no file id for this file.");
  return {
    fileId,
    version: str(r.version),
    modifiedTime: str(r.modified_time),
    name: str(r.name),
    webViewLink: str(r.web_view_link),
  };
}

function notesFrom(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((n): n is string => typeof n === "string") : [];
}

function createFrom(body: Record<string, unknown>): LinkedCreate {
  return {
    file: selectedFile((body.file ?? {}) as Record<string, unknown>),
    remote: remoteFrom(body.remote),
    notes: notesFrom(body.notes),
  };
}

function pushFrom(body: Record<string, unknown>): LinkedPush {
  const status = body.status === "conflict" ? "conflict" : "pushed";
  return { status, remote: remoteFrom(body.remote), notes: notesFrom(body.notes) };
}

export async function createSheetFromWorkbook(
  connectionId: string,
  title: string,
  workbook: unknown,
): Promise<GoogleWriteOutcome<LinkedCreate>> {
  const organizationId = await effectiveOrganizationId();
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/sheets/from-workbook",
    { connection_id: connectionId, title, workbook, organization_id: organizationId },
    "Unable to create the Google Sheet.",
    organizationId,
  );
  return writeOutcome(response, createFrom);
}

export async function readSheetAsWorkbook(
  connectionId: string,
  fileId: string,
  workbookId: string,
): Promise<{ workbook: Record<string, unknown>; remote: GoogleRemoteVersion }> {
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/sheets/to-workbook",
    { connection_id: connectionId, file_id: fileId, workbook_id: workbookId },
    "Unable to read the Google Sheet.",
  );
  const body = await responseRecord(response);
  const workbook = body.workbook;
  if (!workbook || typeof workbook !== "object") {
    throw new Error("Google Sheets returned no workbook.");
  }
  return { workbook: workbook as Record<string, unknown>, remote: remoteFrom(body.remote) };
}

export async function pushWorkbookToSheet(
  connectionId: string,
  fileId: string,
  workbook: unknown,
  expectedVersion: string | null,
  force: boolean,
): Promise<GoogleWriteOutcome<LinkedPush>> {
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/sheets/push",
    {
      connection_id: connectionId,
      file_id: fileId,
      workbook,
      expected_version: expectedVersion,
      force,
    },
    "Unable to update the Google Sheet.",
  );
  return writeOutcome(response, pushFrom);
}

export async function createDocFromMarkdown(
  connectionId: string,
  title: string,
  markdown: string,
): Promise<GoogleWriteOutcome<LinkedCreate>> {
  const organizationId = await effectiveOrganizationId();
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/documents/from-markdown",
    { connection_id: connectionId, title, markdown, organization_id: organizationId },
    "Unable to create the Google Doc.",
    organizationId,
  );
  return writeOutcome(response, createFrom);
}

export async function readDocAsMarkdown(
  connectionId: string,
  fileId: string,
): Promise<{ markdown: string; remote: GoogleRemoteVersion }> {
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/documents/to-markdown",
    { connection_id: connectionId, file_id: fileId },
    "Unable to read the Google Doc.",
  );
  const body = await responseRecord(response);
  return { markdown: str(body.markdown) ?? "", remote: remoteFrom(body.remote) };
}

export async function pushMarkdownToDoc(
  connectionId: string,
  fileId: string,
  markdown: string,
  expectedVersion: string | null,
  force: boolean,
): Promise<LinkedPush> {
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/documents/push",
    {
      connection_id: connectionId,
      file_id: fileId,
      markdown,
      expected_version: expectedVersion,
      force,
    },
    "Unable to update the Google Doc.",
  );
  return pushFrom(await responseRecord(response));
}

export async function readRemoteVersion(
  connectionId: string,
  fileId: string,
  kind: "sheet" | "doc",
): Promise<GoogleRemoteVersion> {
  const response = await postGoogleBackend(
    "/api/google-workspace/linked/version",
    { connection_id: connectionId, file_id: fileId, kind },
    "Unable to check the Google file.",
  );
  return remoteFrom(await responseRecord(response));
}

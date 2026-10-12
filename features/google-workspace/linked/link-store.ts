/**
 * The Google link a workbook or document carries: `metadata.google_link` on
 * `workbench.udt_workbooks` / `workbench.udt_documents` / `workbench.presentation`.
 *
 * One object per record, beside (never inside) the custom-table link Lane B
 * keeps in `metadata.table_links` — each kind of link owns its own key, so the
 * two never collide. Written through `mergeJsonColumn` (version-checked), never
 * a read-spread-write of our own.
 */
"use client";

import { mergeJsonColumn } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";

export type LinkedRecordKind = "workbook" | "document" | "presentation";

export interface GoogleFileLink {
  kind: "google_sheet" | "google_doc" | "google_slides";
  connectionId: string;
  fileId: string;
  name: string;
  webViewLink: string | null;
  /** The `workbench.google_document` Record the server minted for the file. */
  recordId: string | null;
  linkedAt: string;
  lastSyncedAt: string;
  /** The Google content fingerprint at the last sync (server-computed). */
  remoteVersion: string | null;
  /** Our own latest snapshot id at the last sync (history pointer). */
  localSnapshotId: string | null;
  /**
   * Fingerprint of OUR content at the last sync — "changed here since?". Snapshot
   * ids cannot answer that: opening the editor saves a fresh snapshot whose
   * content is unchanged.
   */
  localFingerprint?: string | null;
  /** Set by an import: the first editor open records the fingerprint of what it shows. */
  baselineOnOpen?: boolean;
  lastDirection: "to_google" | "from_google";
}

const TABLE: Record<LinkedRecordKind, "udt_workbooks" | "udt_documents" | "presentation"> = {
  workbook: "udt_workbooks",
  document: "udt_documents",
  presentation: "presentation",
};

type MetaRow = { id: string; version: number; metadata: unknown };

export function googleLinkIn(metadata: unknown): GoogleFileLink | null {
  const raw = (metadata as { google_link?: unknown } | null)?.google_link;
  if (!raw || typeof raw !== "object") return null;
  const link = raw as Partial<GoogleFileLink>;
  if (typeof link.fileId !== "string" || typeof link.connectionId !== "string") return null;
  return link as GoogleFileLink;
}

export async function readGoogleLink(
  kind: LinkedRecordKind,
  id: string,
): Promise<{ ok: true; link: GoogleFileLink | null } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .schema("workbench")
    .from(TABLE[kind])
    .select("metadata")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, link: googleLinkIn(data?.metadata) };
}

/**
 * A create that an organization's review mode turned into an approval request:
 * the file does not exist yet, so the link cannot be saved. This remembers WHICH
 * approval will make it, so the link is completed once it is applied.
 */
export interface PendingGoogleLink {
  /**
   * What the approval will do: `create` (the default, the file does not exist yet) makes the
   * link; `push` writes into the already-linked file (`fileId`) and, once applied, brings the
   * link's sync point forward.
   */
  intent?: "create" | "push";
  fileId?: string;
  assistId: string;
  kind: GoogleFileLink["kind"];
  connectionId: string;
  name: string;
  queuedAt: string;
  localFingerprint: string | null;
  localSnapshotId: string | null;
}

export async function readPendingGoogleLink(
  kind: LinkedRecordKind,
  id: string,
): Promise<PendingGoogleLink | null> {
  const { data, error } = await supabase
    .schema("workbench")
    .from(TABLE[kind])
    .select("metadata")
    .eq("id", id)
    .maybeSingle();
  // A failed read is NOT "no pending approval": an approved change would silently never be recorded.
  if (error) throw new Error(`Could not check this item's pending Google approval: ${error.message}`);
  const raw = (data?.metadata as { google_link_pending?: unknown } | null)?.google_link_pending;
  if (!raw || typeof raw !== "object" || typeof (raw as PendingGoogleLink).assistId !== "string") return null;
  return raw as PendingGoogleLink;
}

/** Save (or with `null`, remove) the record's Google link. */
export async function writeGoogleLink(
  kind: LinkedRecordKind,
  id: string,
  link: GoogleFileLink | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return writeMetadataKey(kind, id, "google_link", link, link ? "google_link_pending" : undefined);
}

export async function writePendingGoogleLink(
  kind: LinkedRecordKind,
  id: string,
  pending: PendingGoogleLink | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return writeMetadataKey(kind, id, "google_link_pending", pending);
}

async function writeMetadataKey(
  kind: LinkedRecordKind,
  id: string,
  key: "google_link" | "google_link_pending",
  value: unknown,
  alsoClear?: "google_link_pending",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const table = TABLE[kind];
  const result = await mergeJsonColumn<MetaRow>({
    fetchCurrent: () =>
      supabase.schema("workbench").from(table).select("id, version, metadata").eq("id", id).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      const next: Record<string, unknown> = { ...(current ?? {}) };
      if (value) next[key] = value;
      else delete next[key];
      if (alsoClear) delete next[alsoClear];
      return next;
    },
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      supabase
        .schema("workbench")
        .from(table)
        .update({ metadata: value as never, version: nextVersion })
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("id, version, metadata")
        .maybeSingle(),
  });
  if (result.status === "saved") return { ok: true };
  if (result.status === "not_found") return { ok: false, error: "This item could not be found." };
  if (result.status === "conflict") return { ok: false, error: "It changed while saving the Google link. Try again." };
  return { ok: false, error: failureMessage(result.error) };
}

/** A Supabase/Postgrest failure is a plain object with `message`, not an Error: String() would read "[object Object]". */
export function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  if (typeof message === "string" && message) return message;
  return typeof error === "string" && error ? error : "The database refused the change and gave no reason.";
}

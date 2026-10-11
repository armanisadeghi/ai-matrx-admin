/**
 * The Google link a workbook or document carries: `metadata.google_link` on
 * `workbench.udt_workbooks` / `workbench.udt_documents`.
 *
 * One object per record, beside (never inside) the custom-table link Lane B
 * keeps in `metadata.table_links` — each kind of link owns its own key, so the
 * two never collide. Written through `mergeJsonColumn` (version-checked), never
 * a read-spread-write of our own.
 */
"use client";

import { mergeJsonColumn } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";

export type LinkedRecordKind = "workbook" | "document";

export interface GoogleFileLink {
  kind: "google_sheet" | "google_doc";
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
  /** Our own latest snapshot id at the last sync — "changed here since?". */
  localSnapshotId: string | null;
  lastDirection: "to_google" | "from_google";
}

const TABLE: Record<LinkedRecordKind, "udt_workbooks" | "udt_documents"> = {
  workbook: "udt_workbooks",
  document: "udt_documents",
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

/** Save (or with `null`, remove) the record's Google link. */
export async function writeGoogleLink(
  kind: LinkedRecordKind,
  id: string,
  link: GoogleFileLink | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const table = TABLE[kind];
  const result = await mergeJsonColumn<MetaRow>({
    fetchCurrent: () =>
      supabase.schema("workbench").from(table).select("id, version, metadata").eq("id", id).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      const next: Record<string, unknown> = { ...(current ?? {}) };
      if (link) next.google_link = link;
      else delete next.google_link;
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
  return { ok: false, error: result.error };
}

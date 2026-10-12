/**
 * Finish a Google link whose create went through an approval request.
 *
 * When an organization requires review for Google writes, "Create Google Sheet/
 * Doc" queues a request and nothing exists yet, so no link can be saved. The
 * request's id is remembered on the record (`google_link_pending`); once a person
 * approves it, the receipt on `platform.assists` carries the created file, and
 * this saves the link — the approval never leaves a record that silently is not
 * linked.
 */
"use client";

import { supabase } from "@/utils/supabase/client";

import {
  readPendingGoogleLink,
  writeGoogleLink,
  writePendingGoogleLink,
  type GoogleFileLink,
  type LinkedRecordKind,
} from "./link-store";
import { readRemoteVersion } from "./linkedService";

export type PendingOutcome =
  | { state: "none" }
  | { state: "waiting"; assistId: string }
  | { state: "ended" }
  | { state: "linked"; link: GoogleFileLink };

type ExistingLink = GoogleFileLink | null;

const remoteKindOf = (kind: GoogleFileLink["kind"]) =>
  kind === "google_sheet" ? "sheet" : kind === "google_slides" ? "slide" : "doc";

type Receipt = { state?: string; output?: { file_id?: string; name?: string; open_in_google?: string | null } };

export async function completePendingLink(
  kind: LinkedRecordKind,
  id: string,
  existing: ExistingLink = null,
): Promise<PendingOutcome> {
  const pending = await readPendingGoogleLink(kind, id);
  if (!pending) return { state: "none" };
  const { data, error } = await supabase
    .schema("platform")
    .from("assists")
    .select("status, result, deleted_at")
    .eq("id", pending.assistId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const receipt = (data?.result ?? null) as Receipt | null;
  const output = receipt?.state === "applied" ? receipt.output : undefined;
  if (pending.intent === "push") {
    // A reviewed push into an already-linked file: once applied, the link's sync point moves up to
    // what Google now holds, so the next Update/Push does not read as "changed in both places".
    if (receipt?.state === "applied" && existing && existing.fileId === pending.fileId) {
      const remote = await readRemoteVersion(existing.connectionId, existing.fileId, remoteKindOf(existing.kind));
      const link: GoogleFileLink = {
        ...existing,
        webViewLink: remote.webViewLink ?? existing.webViewLink,
        lastSyncedAt: new Date().toISOString(),
        remoteVersion: remote.version,
        localSnapshotId: pending.localSnapshotId,
        localFingerprint: pending.localFingerprint,
        baselineOnOpen: false,
        lastDirection: "to_google",
      };
      const saved = await writeGoogleLink(kind, id, link);
      if (!saved.ok) throw new Error(saved.error);
      return { state: "linked", link };
    }
  } else if (output?.file_id) {
    const remote = await readRemoteVersion(pending.connectionId, output.file_id, remoteKindOf(pending.kind));
    const now = new Date().toISOString();
    const link: GoogleFileLink = {
      kind: pending.kind,
      connectionId: pending.connectionId,
      fileId: output.file_id,
      name: output.name ?? pending.name,
      webViewLink: output.open_in_google ?? remote.webViewLink,
      recordId: null,
      linkedAt: now,
      lastSyncedAt: now,
      remoteVersion: remote.version,
      localSnapshotId: pending.localSnapshotId,
      localFingerprint: pending.localFingerprint,
      lastDirection: "to_google",
    };
    const saved = await writeGoogleLink(kind, id, link);
    if (!saved.ok) throw new Error(saved.error);
    return { state: "linked", link };
  }
  const status = String(data?.status ?? "");
  if (!data || data.deleted_at || status === "rejected" || status === "expired" || receipt?.state === "rejected") {
    await writePendingGoogleLink(kind, id, null);
    return { state: "ended" };
  }
  return { state: "waiting", assistId: pending.assistId };
}

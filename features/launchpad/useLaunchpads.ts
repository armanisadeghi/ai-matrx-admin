"use client";

// features/launchpad/useLaunchpads.ts — list, read, save (versioned), restore and archive launchpads.
// Must sit under a records provider (LaunchpadsMount).
//
// Which launchpads a person sees: their own (every organization they belong to; newest wins per key) plus
// the launchpads of the organization new things are saved in (`owner = "org"`). A key resolves to the
// person's own first, then the organization's. Every write names its organization explicitly: the row's
// own organization when it exists, else the organization new things are saved in (the Start rule).
import { useEffect, useRef, useState } from "react";
import { listAppRows, removeAppRow, upsertAppRow, useRecordsClient, useTypedTable, type RecordHistoryEntry } from "@ai-matrx/records/react";
import { readVersionNow } from "@ai-matrx/records/versions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { launchpadSlot, launchpadTable, personOwner, type LaunchpadOwner } from "./launchpad.typed-table";
import { parseLaunchpadDoc, sameLaunchpadDoc, serializeLaunchpadDoc, summarizeEdit, type LaunchpadDocParse } from "./doc";
import { browserLock, seedOnce } from "./seedOnce";
import { moveStartPageOnce } from "./startMigration";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** One launchpad as the person sees it. */
export interface LaunchpadEntry {
  key: string;
  title: string;
  owner: LaunchpadOwner;
  recordId: string;
  organizationId: string;
  savedAt: string | null;
  note: string | null;
  parsed: LaunchpadDocParse;
}

/** The key every person's first launchpad uses (their Start page moved here). */
export const START_LAUNCHPAD_KEY = "start";

export function useLaunchpads() {
  const client = useRecordsClient();
  const userId = useAppSelector(selectUserId);
  const table = useTypedTable(launchpadTable);
  const [saving, setSaving] = useState(false);
  const moved = useRef(false);

  const activeOrg = client.config.organizationId ?? null;
  const mineOwner = userId ? personOwner(userId) : null;
  const newestFirst = [...table.rows].sort((a, b) => (b.saved_at ?? "").localeCompare(a.saved_at ?? ""));
  const entries: LaunchpadEntry[] = [];
  const seen = new Set<string>();
  for (const r of newestFirst) {
    const owner = (r.owner ?? "") as LaunchpadOwner;
    const isMine = mineOwner !== null && owner === mineOwner;
    const isOrg = owner === "org" && r._organizationId === activeOrg;
    if (!isMine && !isOrg) continue;
    const id = `${isMine ? "p" : "o"}:${r.key}`;
    if (seen.has(id)) continue; // newest wins per key
    seen.add(id);
    entries.push({
      key: r.key,
      title: r.title || r.key,
      owner,
      recordId: r._id,
      organizationId: r._organizationId,
      savedAt: r.saved_at ?? null,
      note: r.note ?? null,
      parsed: parseLaunchpadDoc(r.doc),
    });
  }
  // The person's own first, then the organization's; each by title.
  entries.sort((a, b) => Number(b.owner !== "org") - Number(a.owner !== "org") || a.title.localeCompare(b.title));

  /** The launchpad a key opens: the person's own, else the organization's. */
  const byKey = (key: string): LaunchpadEntry | null =>
    entries.find((e) => e.key === key && e.owner !== "org") ?? entries.find((e) => e.key === key) ?? null;

  const save = async (
    input: { key: string; title: string; doc: LaunchpadDoc; owner?: LaunchpadOwner },
    note: string,
    opts: { byAgent?: boolean } = {},
  ): Promise<SaveResult> => {
    if (!userId || !mineOwner) return { ok: false, error: "Sign in to save a launchpad." };
    const owner = input.owner ?? (byKey(input.key)?.owner ?? mineOwner);
    const current = entries.find((e) => e.key === input.key && e.owner === owner) ?? null;
    // org-filter: write-target — the row's own organization, else where new things are saved.
    const organizationId = current?.organizationId ?? activeOrg;
    if (!organizationId) return { ok: false, error: "No organization to save your launchpad in." };
    // Nothing changed: no new version.
    if (current?.parsed.ok && sameLaunchpadDoc(current.parsed.doc, input.doc) && current.title === input.title) return { ok: true };
    setSaving(true);
    const row = {
      slot: launchpadSlot(owner, input.key),
      key: input.key,
      title: input.title,
      owner,
      doc: serializeLaunchpadDoc(input.doc),
      note,
      saved_at: new Date().toISOString(),
    };
    const write = (data: typeof row) => upsertAppRow(client, launchpadTable, data, { organizationId });
    // An agent's turn is written as the agent acting for this person (the store's envelope keys), so History
    // reads "Agent for you"; a store that refuses the stamp still keeps the change.
    let answer = opts.byAgent ? await write({ ...row, _actor: "agent", _on_behalf_of: userId } as typeof row) : await write(row);
    if (!answer.ok && opts.byAgent) answer = await write(row);
    setSaving(false);
    table.reload();
    return answer.ok ? { ok: true } : { ok: false, error: answer.error.message };
  };

  /** Archive (the store's soft delete; restorable from the archive). */
  const archive = async (entry: LaunchpadEntry): Promise<SaveResult> => {
    const answer = await removeAppRow(client, launchpadTable, entry.recordId, { organizationId: entry.organizationId });
    table.reload();
    return answer.ok ? { ok: true } : { ok: false, error: answer.error.message };
  };

  // FIRST VISIT: the person's Start page moves in as the `start` launchpad, once (idempotent: a fresh read of
  // their rows inside a cross-tab lock). Announced in the console, never silent.
  const needsMove = !table.loading && !table.error && Boolean(userId) && Boolean(activeOrg) && !entries.some((e) => e.key === START_LAUNCHPAD_KEY && e.owner !== "org");
  useEffect(() => {
    if (!needsMove || !userId || moved.current) return;
    moved.current = true;
    void seedOnce({
      userId: `${userId}:start-move`,
      lock: browserLock,
      hasRow: async () => {
        const listed = await listAppRows(client, launchpadTable);
        return listed.ok && listed.data.rows.some((r) => r.owner === personOwner(userId) && r.key === START_LAUNCHPAD_KEY);
      },
      write: () => moveStartPageOnce({ client, userId, organizationId: activeOrg! }),
    }).then((outcome) => {
      if (outcome === "failed") toast.error("Your Start page could not be moved to your launchpads");
      table.reload();
    });
  });

  return {
    loading: table.loading,
    saving,
    error: table.error?.message ?? null,
    entries,
    byKey,
    save,
    archive,
    reload: table.reload,
    userId,
  };
}

/** Who wrote a version, as the person reads it. */
export function versionAuthor(entry: RecordHistoryEntry, userId: string | null): string {
  if (entry.actor.kind === "agent") return "Agent for you";
  if (entry.actor.kind === "system") return "System";
  if (entry.actor.user_id && entry.actor.user_id === userId) return "You";
  return entry.actor.name ?? "Someone";
}

/** The note a version was saved with, else what the layout change was. */
export function versionNote(entry: RecordHistoryEntry): string {
  const note = entry.changes.find((c) => c.key === "note")?.after;
  if (typeof note === "string" && note) return note;
  const doc = entry.changes.find((c) => c.key === "doc");
  if (doc) {
    const before = parseLaunchpadDoc(doc.before);
    const after = parseLaunchpadDoc(doc.after);
    if (after.ok) return before.ok ? summarizeEdit(before.doc, after.doc) : "First version";
  }
  return entry.changes.length === 0 ? "Saved again, no change" : entry.operation_label;
}

/** The label a restore is saved with: "Restored v5", plus the note that version carried. */
export function restoredNote(version: number, versionsOwnNote: string | null): string {
  const own = versionsOwnNote?.trim();
  return own ? `Restored v${version}: ${own}` : `Restored v${version}`;
}

/**
 * Restore `version` as ONE new version, written through the normal save so it carries its own label and a
 * fresh saved time (a store-side restore copied the old note and saved time back). A preview's version read
 * can be missing (the page remounted between preview and press): read it now instead of refusing.
 */
export async function setActiveVersion(
  client: Pick<ReturnType<typeof useRecordsClient>, "recordHeaders" | "restorePreview">,
  recordId: string,
  version: number,
  seenVersion: number | null,
  write: { currentDoc: LaunchpadDoc | null; note: string; save: (doc: LaunchpadDoc, note: string) => Promise<SaveResult> },
): Promise<SaveResult> {
  const seen = seenVersion ?? (await readVersionNow(client, recordId));
  const now = await readVersionNow(client, recordId);
  if (seen === null || now === null) return { ok: false, error: "Could not check your launchpad for changes. Try again." };
  if (now !== seen) return { ok: false, error: "Your launchpad changed since you previewed it. Preview the version again." };
  const answer = await client.restorePreview({ record_id: recordId, version });
  if (!answer.ok) return { ok: false, error: answer.error.message };
  const change = answer.data.changes.find((c) => c.key === "doc");
  let doc = write.currentDoc;
  if (change) {
    const parsed = parseLaunchpadDoc(change.after);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    doc = parsed.doc;
  }
  if (!doc) return { ok: false, error: "No saved launchpad yet." };
  return write.save(doc, write.note);
}

/** One launchpad's versions: list, preview in place, and "Set active". */
export function useLaunchpadHistory(recordId: string | null, open: boolean, save: (doc: LaunchpadDoc, note: string) => Promise<SaveResult>) {
  const client = useRecordsClient();
  const [entries, setEntries] = useState<RecordHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!open || !recordId) return;
    let live = true;
    void client.recordHistory({ record_id: recordId, limit: 50 }).then((answer) => {
      if (!live) return;
      if (answer.ok) {
        setEntries(answer.data);
        setError(null);
      } else setError(answer.error.message);
    });
    return () => {
      live = false;
    };
  }, [client, recordId, open, revision]);

  /** The doc as it stood at `version` (read-only), and the record's version when previewed. */
  const preview = async (
    version: number,
    currentDoc: LaunchpadDoc,
  ): Promise<{ ok: true; doc: LaunchpadDoc; seenVersion: number | null } | { ok: false; error: string }> => {
    if (!recordId) return { ok: false, error: "No saved launchpad yet." };
    const [answer, seenVersion] = await Promise.all([client.restorePreview({ record_id: recordId, version }), readVersionNow(client, recordId)]);
    if (!answer.ok) return { ok: false, error: answer.error.message };
    const change = answer.data.changes.find((c) => c.key === "doc");
    if (!change) return { ok: true, doc: currentDoc, seenVersion };
    const parsed = parseLaunchpadDoc(change.after);
    return parsed.ok ? { ok: true, doc: parsed.doc, seenVersion } : { ok: false, error: parsed.error };
  };

  const setActive = async (version: number, seenVersion: number | null, currentDoc: LaunchpadDoc | null): Promise<SaveResult> => {
    if (!recordId) return { ok: false, error: "No saved launchpad yet." };
    const entry = entries?.find((e) => e.version === version);
    const answer = await setActiveVersion(client, recordId, version, seenVersion, {
      currentDoc,
      note: restoredNote(version, entry ? versionNote(entry) : null),
      save,
    });
    setRevision((n) => n + 1);
    return answer;
  };

  return { entries, error, preview, setActive, refresh: () => setRevision((n) => n + 1) };
}

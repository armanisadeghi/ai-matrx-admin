// features/shell/shell-layout/service.ts — read, save, clear and version-restore stored layouts through the
// record store (the `shell_layout` typed table). Plain functions over a records client; the React face is
// `useShellLayoutStore`. Every write names its organization explicitly:
//   - the person's layout: the organization her row already lives in, else the active organization;
//   - an organization's layout: that organization (the UI lets only its owner/admin save it).
// Writes are compare-and-swap (`expectedVersion`): a layout changed in another tab or device since it was
// read is refused (`stale_write`), never silently overwritten.

import { listAppRows, removeAppRow, upsertAppRow, type RecordHistoryEntry, type useRecordsClient } from "@ai-matrx/records/react";
import { readVersionNow } from "@ai-matrx/records/versions";
import {
  orgLayoutSlot,
  personLayoutSlot,
  type ShellLayoutBody,
  type StoredShellLayout,
} from "./contract";
import { shellLayoutTable } from "./shellLayout.typed-table";
import { parseShellLayoutBody, serializeShellLayoutBody } from "./validate";
import type { ShellLayoutTarget } from "./shellLayoutSlice";

export type ShellRecordsClient = ReturnType<typeof useRecordsClient>;
export type ShellLayoutResult<T> = { ok: true; data: T } | { ok: false; error: string; stale?: boolean };

/** One stored layout row as the editors read it (the store's row + its note). */
export interface ShellLayoutEntry extends StoredShellLayout {
  note: string | null;
}

export interface ShellLayoutRows {
  /** The person's own layout, newest across every organization she belongs to. */
  person: ShellLayoutEntry | null;
  /** The given organization's layout. */
  organization: ShellLayoutEntry | null;
}

/** The person's layout (newest across her organizations) and `organizationId`'s layout. One read. */
export async function readShellLayouts(
  client: ShellRecordsClient,
  input: { userId: string; organizationId: string | null },
): Promise<ShellLayoutResult<ShellLayoutRows>> {
  const listed = await listAppRows(client, shellLayoutTable);
  if (!listed.ok) return { ok: false, error: listed.error.message };
  const mine = personLayoutSlot(input.userId);
  let person: { row: (typeof listed.data.rows)[number] } | null = null;
  let organization: { row: (typeof listed.data.rows)[number] } | null = null;
  for (const row of listed.data.rows) {
    if (row.slot === mine) {
      if (!person || (row.saved_at ?? "") > (person.row.saved_at ?? "")) person = { row };
    } else if (row.slot === orgLayoutSlot() && row._organizationId === input.organizationId) {
      organization = { row };
    }
  }
  const entry = async (found: { row: (typeof listed.data.rows)[number] } | null): Promise<ShellLayoutEntry | null> => {
    if (!found) return null;
    const version = (await readVersionNow(client, found.row._id)) ?? 0;
    return {
      recordId: found.row._id,
      organizationId: found.row._organizationId,
      version,
      updatedAt: found.row.saved_at ?? "",
      body: found.row.body,
      note: found.row.note ?? null,
    };
  };
  const [p, o] = await Promise.all([entry(person), entry(organization)]);
  return { ok: true, data: { person: p, organization: o } };
}

/**
 * Save a layout. `current` is the row the editor started from (its organization and version decide where
 * the write lands and what it must not overwrite); null = a first save. A body with problems is refused —
 * an editor saves only what it can show.
 */
export async function saveShellLayout(
  client: ShellRecordsClient,
  input: {
    target: ShellLayoutTarget;
    body: ShellLayoutBody;
    note: string;
    userId: string;
    /** The organization new things are saved in (person) / the organization whose layout this is. */
    organizationId: string;
    current: Pick<StoredShellLayout, "organizationId" | "version" | "body"> | null;
  },
): Promise<ShellLayoutResult<StoredShellLayout>> {
  const text = serializeShellLayoutBody(input.body);
  const checked = parseShellLayoutBody(text);
  if (!checked.body || checked.problems.length > 0) {
    return { ok: false, error: `This layout cannot be saved: ${checked.problems.join("; ") || "unreadable"}` };
  }
  // org-filter: write-target — the row's own organization, else where new things are saved
  const organizationId = input.target === "person" ? (input.current?.organizationId ?? input.organizationId) : input.organizationId;
  const savedAt = new Date().toISOString();
  const answer = await upsertAppRow(
    client,
    shellLayoutTable,
    {
      slot: input.target === "person" ? personLayoutSlot(input.userId) : orgLayoutSlot(),
      body: text,
      note: input.note,
      saved_at: savedAt,
    },
    { organizationId, ...(input.current ? { expectedVersion: input.current.version } : {}) },
  );
  if (!answer.ok) {
    const stale = answer.error.code === "stale_write";
    return {
      ok: false,
      stale,
      error: stale ? "This layout was changed somewhere else. Reload it and try again." : answer.error.message,
    };
  }
  const version = (await readVersionNow(client, answer.data)) ?? (input.current ? input.current.version + 1 : 1);
  return { ok: true, data: { recordId: answer.data, organizationId, version, updatedAt: savedAt, body: text } };
}

/** Archive a stored layout (the store's soft delete; restorable). The default (or the organization's) applies. */
export async function clearShellLayout(
  client: ShellRecordsClient,
  stored: Pick<StoredShellLayout, "recordId" | "organizationId">,
): Promise<ShellLayoutResult<null>> {
  const answer = await removeAppRow(client, shellLayoutTable, stored.recordId, { organizationId: stored.organizationId });
  return answer.ok ? { ok: true, data: null } : { ok: false, error: answer.error.message };
}

/** Every version of one stored layout, newest first (the store keeps them; nothing else does). */
export async function listShellLayoutVersions(
  client: ShellRecordsClient,
  recordId: string,
): Promise<ShellLayoutResult<RecordHistoryEntry[]>> {
  const answer = await client.recordHistory({ record_id: recordId, limit: 50 });
  return answer.ok ? { ok: true, data: answer.data } : { ok: false, error: answer.error.message };
}

/** The body as it stood at `version` (read-only preview). */
export async function previewShellLayoutVersion(
  client: ShellRecordsClient,
  recordId: string,
  version: number,
): Promise<ShellLayoutResult<{ body: ShellLayoutBody | null; problems: string[] }>> {
  const answer = await client.restorePreview({ record_id: recordId, version });
  if (!answer.ok) return { ok: false, error: answer.error.message };
  const change = answer.data.changes.find((c) => c.key === "body");
  if (!change) return { ok: true, data: { body: null, problems: ["that version did not change the layout"] } };
  const parsed = typeof change.after === "string" ? parseShellLayoutBody(change.after) : { body: null, problems: ["not text"] };
  return { ok: true, data: parsed };
}

/**
 * Restore `version` as ONE new version, written through the normal save (its own note and a fresh saved
 * time — the same rule as launchpads). Refused when the layout moved since `seenVersion` was read.
 */
export async function restoreShellLayoutVersion(
  client: ShellRecordsClient,
  input: {
    target: ShellLayoutTarget;
    current: StoredShellLayout;
    version: number;
    seenVersion: number;
    userId: string;
  },
): Promise<ShellLayoutResult<StoredShellLayout>> {
  const now = await readVersionNow(client, input.current.recordId);
  if (now === null) return { ok: false, error: "Could not check your layout for changes. Try again." };
  if (now !== input.seenVersion) return { ok: false, stale: true, error: "Your layout changed since you previewed it. Preview the version again." };
  const preview = await previewShellLayoutVersion(client, input.current.recordId, input.version);
  if (!preview.ok) return preview;
  if (!preview.data.body) return { ok: false, error: `Version ${input.version} cannot be restored: ${preview.data.problems.join("; ")}` };
  return saveShellLayout(client, {
    target: input.target,
    body: preview.data.body,
    note: `Restored v${input.version}`,
    userId: input.userId,
    organizationId: input.current.organizationId,
    current: { ...input.current, version: now },
  });
}

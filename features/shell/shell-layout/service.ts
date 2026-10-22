// features/shell/shell-layout/service.ts — read, save, clear and version-restore stored layouts through the
// record store (the `shell_layout` typed table). Plain functions over a records client; the React face is
// `useShellLayoutStore`. Every write names its organization explicitly:
//   - the person's layout: the organization her row already lives in, else the active organization;
//   - an organization's layout: that organization (the UI lets only its owner/admin save it).
// Writes are compare-and-swap (`expectedVersion`): a layout changed in another tab or device since it was
// read is refused (`stale_write`), never silently overwritten.

import { removeAppRow, upsertAppRow, type RecordHistoryEntry, type useRecordsClient } from "@ai-matrx/records/react";
import { readVersionNow } from "@ai-matrx/records/versions";
import { orgLayoutSlot, personLayoutSlot, type ShellLayoutBody, type StoredShellLayout } from "./contract";
import { clientInOrganization } from "@/lib/records/clientInOrganization";
import { shellLayoutTable } from "./shellLayout.typed-table";
import { parseShellLayoutBody, serializeShellLayoutBody } from "./validate";
import type { ShellLayoutTarget } from "./shellLayoutSlice";

export type ShellRecordsClient = ReturnType<typeof useRecordsClient>;
export type ShellLayoutResult<T> = { ok: true; data: T } | { ok: false; error: string; stale?: boolean };

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
      error: stale ? "This layout was changed somewhere else. Reload it and try again." : plainLayoutRefusal(answer.error.message),
    };
  }
  const version = (await readVersionNow(clientInOrganization(client, organizationId), answer.data)) ?? (input.current ? input.current.version + 1 : 1);
  return { ok: true, data: { recordId: answer.data, organizationId, version, updatedAt: savedAt, body: text } };
}

/**
 * The store's refusal in the person's words. An archived organization's refusal names the storage step
 * ("…so creating a table is not possible there…", custom._not_a_member_refusal); a layout save says what
 * it means for her instead. Every other refusal is the store's own sentence, unchanged.
 */
export function plainLayoutRefusal(message: string): string {
  if (/^This organization is archived\b/i.test(message)) return "This organization is archived. Restore it to change its layout.";
  return message;
}

/** Archive a stored layout (the store's soft delete; restorable). The default (or the organization's) applies. */
export async function clearShellLayout(
  client: ShellRecordsClient,
  stored: Pick<StoredShellLayout, "recordId" | "organizationId">,
): Promise<ShellLayoutResult<null>> {
  const answer = await removeAppRow(client, shellLayoutTable, stored.recordId, { organizationId: stored.organizationId });
  return answer.ok ? { ok: true, data: null } : { ok: false, error: plainLayoutRefusal(answer.error.message) };
}

/** Every version of one stored layout, newest first (the store keeps them; nothing else does). */
export async function listShellLayoutVersions(
  client: ShellRecordsClient,
  row: Pick<StoredShellLayout, "recordId" | "organizationId">,
): Promise<ShellLayoutResult<RecordHistoryEntry[]>> {
  const answer = await clientInOrganization(client, row.organizationId).recordHistory({ record_id: row.recordId, limit: 50 });
  return answer.ok ? { ok: true, data: answer.data } : { ok: false, error: answer.error.message };
}

/** The record's version now, read in the row's own organization (null = could not read). */
export function readShellLayoutVersionNow(client: ShellRecordsClient, row: Pick<StoredShellLayout, "recordId" | "organizationId">) {
  return readVersionNow(clientInOrganization(client, row.organizationId), row.recordId);
}

/** The body as it stood at `version` (read-only preview). */
export async function previewShellLayoutVersion(
  client: ShellRecordsClient,
  row: Pick<StoredShellLayout, "recordId" | "organizationId">,
  version: number,
): Promise<ShellLayoutResult<{ body: ShellLayoutBody | null; problems: string[] }>> {
  const answer = await clientInOrganization(client, row.organizationId).restorePreview({ record_id: row.recordId, version });
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
  const now = await readShellLayoutVersionNow(client, input.current);
  if (now === null) return { ok: false, error: "Could not check your layout for changes. Try again." };
  if (now !== input.seenVersion) return { ok: false, stale: true, error: "Your layout changed since you previewed it. Preview the version again." };
  const preview = await previewShellLayoutVersion(client, input.current, input.version);
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

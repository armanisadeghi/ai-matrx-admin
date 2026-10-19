"use client";

// features/shell/shell-layout/useShellLayoutStore.ts — THE door the layout editors call (lane C).
// Must sit under a records provider (e.g. `RecordsMount` with `useAppRecordsConfig(activeOrg)`).
//
//   const layouts = useShellLayoutStore();
//   layouts.person / layouts.organization        — the stored rows (null = none), from the store
//   layouts.canEditOrganization                  — the person is the active organization's owner/admin
//   await layouts.save("person", body, note)     — compare-and-swap; the shell re-renders at once and
//   await layouts.save("organization", body, note)  every other tab follows (broadcast)
//   await layouts.clear("person" | "organization")   — archive; the default (or the organization's) applies
//   await layouts.versions("person")             — the history list (newest first)
//   await layouts.preview("person", version)     — the body at that version (read-only)
//   await layouts.restore("person", version, seenVersion) — one new version with that body
//
// Every answer is `{ ok: true, data } | { ok: false, error, stale? }`; nothing throws, nothing is silent.

import { useEffect, useState } from "react";
import { useRecordsClient } from "@ai-matrx/records/react";
import { readVersionNow } from "@ai-matrx/records/versions";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useUserRole } from "@/features/organizations/hooks";
import type { ShellLayoutBody, StoredShellLayout } from "./contract";
import {
  clearShellLayout,
  listShellLayoutVersions,
  previewShellLayoutVersion,
  readShellLayouts,
  restoreShellLayoutVersion,
  saveShellLayout,
  type ShellLayoutEntry,
  type ShellLayoutResult,
} from "./service";
import { shellLayoutCleared, shellLayoutStored, type ShellLayoutTarget } from "./shellLayoutSlice";

export function useShellLayoutStore() {
  const client = useRecordsClient();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  // org-filter: write-target — where a first person layout is saved and whose organization layout is edited
  const organizationId = client.config.organizationId ?? null;
  const role = useUserRole(organizationId ?? undefined);
  const [rows, setRows] = useState<{ person: ShellLayoutEntry | null; organization: ShellLayoutEntry | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void readShellLayouts(client, { userId, organizationId }).then((answer) => {
      if (!live) return;
      if (answer.ok) {
        setRows(answer.data);
        setError(null);
      } else setError(answer.error);
    });
    return () => {
      live = false;
    };
  }, [client, userId, organizationId, revision]);

  const rowOf = (target: ShellLayoutTarget): ShellLayoutEntry | null => (target === "person" ? rows?.person : rows?.organization) ?? null;

  const save = async (target: ShellLayoutTarget, body: ShellLayoutBody, note: string): Promise<ShellLayoutResult<StoredShellLayout>> => {
    if (!userId) return { ok: false, error: "Sign in to save a layout." };
    if (!organizationId) return { ok: false, error: "No organization to save your layout in." };
    if (target === "organization" && !role.isAdmin) return { ok: false, error: "Only an owner or admin can change the organization's layout." };
    setSaving(true);
    const answer = await saveShellLayout(client, { target, body, note, userId, organizationId, current: rowOf(target) });
    setSaving(false);
    if (answer.ok) dispatch(shellLayoutStored({ target, stored: answer.data }));
    setRevision((n) => n + 1);
    return answer;
  };

  const clear = async (target: ShellLayoutTarget): Promise<ShellLayoutResult<null>> => {
    const row = rowOf(target);
    if (!row) return { ok: true, data: null };
    if (target === "organization" && !role.isAdmin) return { ok: false, error: "Only an owner or admin can change the organization's layout." };
    const answer = await clearShellLayout(client, row);
    if (answer.ok) dispatch(shellLayoutCleared({ target, organizationId: row.organizationId }));
    setRevision((n) => n + 1);
    return answer;
  };

  const versions = async (target: ShellLayoutTarget) => {
    const row = rowOf(target);
    return row ? listShellLayoutVersions(client, row.recordId) : ({ ok: true, data: [] } as const);
  };

  /** The body at `version`, plus the record's version now (pass it back to `restore`). */
  const preview = async (target: ShellLayoutTarget, version: number) => {
    const row = rowOf(target);
    if (!row) return { ok: false, error: "No saved layout yet." } as const;
    const [answer, seenVersion] = await Promise.all([previewShellLayoutVersion(client, row.recordId, version), readVersionNow(client, row.recordId)]);
    return answer.ok ? ({ ok: true, data: { ...answer.data, seenVersion } } as const) : answer;
  };

  const restore = async (target: ShellLayoutTarget, version: number, seenVersion: number): Promise<ShellLayoutResult<StoredShellLayout>> => {
    const row = rowOf(target);
    if (!row || !userId) return { ok: false, error: "No saved layout yet." };
    const answer = await restoreShellLayoutVersion(client, { target, current: row, version, seenVersion, userId });
    if (answer.ok) dispatch(shellLayoutStored({ target, stored: answer.data }));
    setRevision((n) => n + 1);
    return answer;
  };

  return {
    loading: rows === null && error === null,
    error,
    saving,
    person: rows?.person ?? null,
    organization: rows?.organization ?? null,
    organizationId,
    canEditOrganization: role.isAdmin,
    save,
    clear,
    versions,
    preview,
    restore,
    reload: () => setRevision((n) => n + 1),
  };
}

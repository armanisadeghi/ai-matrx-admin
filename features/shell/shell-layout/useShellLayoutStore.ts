"use client";

// features/shell/shell-layout/useShellLayoutStore.ts — THE door the layout editors call (lane C).
// Must sit under a records provider (e.g. `RecordsMount` with `useAppRecordsConfig(activeOrg)`).
//
//   const layouts = useShellLayoutStore();
//   layouts.person / layouts.organization        — the held rows (null = none): the shell's slice, revalidated
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
import type { AppDispatch } from "@/lib/redux/store";
import type { RootState } from "@/lib/redux/rootReducer";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useUserRole } from "@/features/organizations/hooks";
import type { ShellLayoutBody, StoredShellLayout } from "./contract";
import {
  clearShellLayout,
  listShellLayoutVersions,
  previewShellLayoutVersion,
  restoreShellLayoutVersion,
  saveShellLayout,
  type ShellLayoutResult,
} from "./service";
import {
  fetchShellLayoutSeed,
  initialShellLayoutState,
  shellLayoutCleared,
  shellLayoutLoaded,
  shellLayoutStored,
  type ShellLayoutTarget,
} from "./shellLayoutSlice";

// THE HELD LAYOUTS ARE THE EDITOR'S DATA. The boot seed (and every save, here or in another tab) already
// holds the person's layout and her organizations' layouts WITH their store versions, so the editors open
// from what the shell holds — zero requests — and revalidate with the ONE seed read (`iam.shell_layout_seed`,
// index-only). Until 2026-10-19 every open listed the typed table across every organization (one
// `table_find` per organization + a version read per row): ~5-8 s for a person in many organizations.
// One revalidation per page at a time, and none within REVALIDATE_FRESH_MS of the last answer.
const REVALIDATE_FRESH_MS = 5_000;
let revalidating: Promise<void> | null = null;
let revalidatedAt = 0;

function revalidateHeldLayouts(dispatch: AppDispatch, force = false): Promise<void> {
  if (revalidating) return revalidating;
  if (!force && Date.now() - revalidatedAt < REVALIDATE_FRESH_MS) return Promise.resolve();
  revalidating = fetchShellLayoutSeed()
    .then((seed) => {
      if (seed === "failed") return; // fetchShellLayoutSeed already said why; the held copy stays
      revalidatedAt = Date.now();
      dispatch(shellLayoutLoaded(seed));
    })
    .finally(() => {
      revalidating = null;
    });
  return revalidating;
}

const selectHeldStatus = (state: RootState) => (state.shellLayout ?? initialShellLayoutState).status;
const selectHeldPerson = (state: RootState) => (state.shellLayout ?? initialShellLayoutState).person;
const selectHeldOrganizations = (state: RootState) => (state.shellLayout ?? initialShellLayoutState).organizations;

export function useShellLayoutStore() {
  const client = useRecordsClient();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  // org-filter: write-target — where a first person layout is saved and whose organization layout is edited
  const organizationId = client.config.organizationId ?? null;
  const role = useUserRole(organizationId ?? undefined);
  const status = useAppSelector(selectHeldStatus);
  const person = useAppSelector(selectHeldPerson);
  const organizations = useAppSelector(selectHeldOrganizations);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void revalidateHeldLayouts(dispatch).then(
      () => live && setAnswered(true),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, [dispatch, userId]);

  const rows = {
    person,
    organization: organizationId ? (organizations[organizationId] ?? null) : null,
  };
  const known = status === "ready" || answered;

  const rowOf = (target: ShellLayoutTarget): StoredShellLayout | null => (target === "person" ? rows.person : rows.organization) ?? null;

  const save = async (target: ShellLayoutTarget, body: ShellLayoutBody, note: string): Promise<ShellLayoutResult<StoredShellLayout>> => {
    if (!userId) return { ok: false, error: "Sign in to save a layout." };
    if (!organizationId) return { ok: false, error: "No organization to save your layout in." };
    if (target === "organization" && !role.isAdmin) return { ok: false, error: "Only an owner or admin can change the organization's layout." };
    setSaving(true);
    const answer = await saveShellLayout(client, { target, body, note, userId, organizationId, current: rowOf(target) });
    setSaving(false);
    if (answer.ok) dispatch(shellLayoutStored({ target, stored: answer.data }));
    else if (answer.stale) void revalidateHeldLayouts(dispatch, true);
    return answer;
  };

  const clear = async (target: ShellLayoutTarget): Promise<ShellLayoutResult<null>> => {
    const row = rowOf(target);
    if (!row) return { ok: true, data: null };
    if (target === "organization" && !role.isAdmin) return { ok: false, error: "Only an owner or admin can change the organization's layout." };
    const answer = await clearShellLayout(client, row);
    if (answer.ok) dispatch(shellLayoutCleared({ target, organizationId: row.organizationId }));
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
    else if (answer.stale) void revalidateHeldLayouts(dispatch, true);
    return answer;
  };

  return {
    loading: !known && error === null,
    error,
    saving,
    person: rows.person,
    organization: rows.organization,
    organizationId,
    canEditOrganization: role.isAdmin,
    save,
    clear,
    versions,
    preview,
    restore,
    reload: () => void revalidateHeldLayouts(dispatch, true),
  };
}

// features/notes/homes/useNoteHomes.ts
//
// Every home a person can put a note in, read from the ONE scope tree
// (features/scopes). The picker, the sidebar's home tree and the home chip all
// read this — never a folder list.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectOrganizationsList } from "@/features/scopes/redux/selectors/tree";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import { useWholeScopeTree } from "@/features/scopes/hooks/useWholeScopeTree";
import { selectNoteHomeIds, selectNoteOrganizationIds, selectNotesListStatus } from "../redux/selectors";
import { buildHomes, homeLabelParts, homeLabels, type HomeLabelParts, type ItemHome } from "@/features/scopes/homes/homeModel";

export interface UseNoteHomesReturn {
  homes: ItemHome[];
  byId: ReadonlyMap<string, ItemHome>;
  /** Each organization's General (scope id) by organization id. */
  generalByOrganization: ReadonlyMap<string, ItemHome>;
  /** The label a home shows (organization only where it is the meaning). */
  labelOf: (scopeId: string | null | undefined) => string | null;
  notesSpanManyOrganizations: boolean;
  status: ReturnType<typeof useWholeScopeTree>["status"];
  organizations: ReturnType<typeof useWholeScopeTree>["organizations"];
}

// The names of homes outside the scope tree, kept for the tab: the sidebar remounts (board hide/show,
// route changes) and must not ask `platform.home_labels` again for homes it already named.
const outsideTreeCache: Record<string, ItemHome | null> = {};
// Ids a `home_labels` read is already carrying. The sidebar, the picker and the home chip each mount this hook
// and (before the tree settles) each asked for the same ids; an id in flight is not asked for again.
const homeLabelsInFlight = new Set<string>();
const homeLabelListeners = new Set<(next: Record<string, ItemHome | null>) => void>();

export function useNoteHomes(): UseNoteHomesReturn {
  const tree = useWholeScopeTree();
  const noteOrganizationIds = useAppSelector(selectNoteOrganizationIds);
  const notesSpanManyOrganizations = noteOrganizationIds.length > 1;
  const noteHomeIds = useAppSelector(selectNoteHomeIds);
  // Homes a note lives in that the scope tree does not carry (a scope of an
  // organization the tree did not load, an archived scope): named through
  // `platform.home_labels` — the door for homes the person meets — so the
  // sidebar never shows a nameless group. Never a direct read of
  // custom.context_scopes: people have no SELECT on it.
  const [outsideTree, setOutsideTree] = useState<Record<string, ItemHome | null>>(() => ({ ...outsideTreeCache }));
  useEffect(() => {
    const listener = (next: Record<string, ItemHome | null>) => setOutsideTree((prev) => ({ ...prev, ...next }));
    homeLabelListeners.add(listener);
    return () => {
      homeLabelListeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    if (tree.status !== "ready") return;
    const known = new Set<string>();
    for (const org of tree.organizations) for (const t of org.scope_types) for (const sc of t.scopes) known.add(sc.id);
    const missing = noteHomeIds.filter(
      (id) => !known.has(id) && !(id in outsideTree) && !(id in outsideTreeCache) && !homeLabelsInFlight.has(id),
    );
    if (missing.length === 0) return;
    for (const id of missing) homeLabelsInFlight.add(id);
    // Not canceled on cleanup: the answer fills the module cache for every mounted hook, and a re-run of
    // this effect (the note list growing) must not drop a read already on the wire and then ask again.
    void supabase
      .schema("platform")
      .rpc("home_labels", { p_scope_ids: missing })
      .then(({ data, error }) => {
        for (const id of missing) homeLabelsInFlight.delete(id);
        if (error) {
          console.error("[notes homes] could not name homes outside the scope tree", error);
          return;
        }
        const next: Record<string, ItemHome | null> = {};
        for (const id of missing) next[id] = null;
        for (const row of data ?? []) {
          next[row.scope_id] = {
            scopeId: row.scope_id,
            name: row.is_general ? "General" : row.name,
            organizationId: row.organization_id,
            organizationName: row.organization_name,
            scopeTypeId: "",
            scopeTypeLabel: row.is_general ? "General" : "",
            isGeneral: row.is_general,
          };
        }
        Object.assign(outsideTreeCache, next);
        for (const listener of homeLabelListeners) listener(next);
      });
  }, [tree.status, tree.organizations, noteHomeIds, outsideTree]);

  return useMemo(() => {
    const homes = buildHomes(tree.organizations);
    const byId = new Map(homes.map((home) => [home.scopeId, home]));
    const generalByOrganization = new Map<string, ItemHome>();
    for (const home of homes) {
      if (home.isGeneral && !generalByOrganization.has(home.organizationId)) {
        generalByOrganization.set(home.organizationId, home);
      }
    }
    const outside = Object.values(outsideTree).filter((home): home is ItemHome => home !== null);
    const labels = homeLabels([...homes, ...outside.filter((home) => !byId.has(home.scopeId))], {
      notesSpanManyOrganizations,
    });
    const labelOf = (scopeId: string | null | undefined): string | null => {
      if (!scopeId) return null;
      const label = labels.get(scopeId);
      if (label) return label;
      return scopeId in outsideTree ? "Unavailable home" : null;
    };
    return {
      homes,
      byId,
      generalByOrganization,
      labelOf,
      notesSpanManyOrganizations,
      status: tree.status,
      organizations: tree.organizations,
    };
  }, [tree.organizations, tree.status, notesSpanManyOrganizations, outsideTree]);
}

// ── NAMES ONLY ───────────────────────────────────────────────────────────────────────────────────
// A list that only NAMES the homes its notes live in (the sidebar) must not load the whole scope tree
// (`context_tree`, `context_tree_types`, `context_scopes`): that is the first-paint contract's "nothing
// fetches until engaged". This hook asks ONE specific read — `platform.home_names` — for the homes the
// loaded notes sit in (plus the active organization's General, the always-present drop target), and
// never reads `state.scopesTree`. The pickers keep `useNoteHomes` and load the tree when they open.

export interface NoteHomeNames {
  homes: ItemHome[];
  byId: ReadonlyMap<string, ItemHome>;
  generalByOrganization: ReadonlyMap<string, ItemHome>;
  labelOf: (scopeId: string | null | undefined) => string | null;
  /** The label in two parts — render with `LabelWithTail` so the tail telling twins apart stays visible. */
  labelPartsOf: (scopeId: string | null | undefined) => HomeLabelParts | null;
  notesSpanManyOrganizations: boolean;
}

const namedGeneralOrgs = new Set<string>();


interface HomeNameRow {
  scope_id: string;
  name: string;
  organization_id: string;
  organization_name: string;
  is_general: boolean;
  scope_type_id: string;
  scope_type_label: string;
}

const queuedHomeIds = new Set<string>();
const queuedGeneralOrgs = new Set<string>();
let homeNamesFlushScheduled = false;

/** Coalesces every home-name ask of one tick into a single `platform.home_names` read. */
function queueHomeNames(ids: readonly string[], generalOrganizationId: string | null): void {
  for (const id of ids) queuedHomeIds.add(id);
  if (generalOrganizationId) queuedGeneralOrgs.add(generalOrganizationId);
  if (homeNamesFlushScheduled) return;
  homeNamesFlushScheduled = true;
  setTimeout(flushHomeNames, 0);
}

function flushHomeNames(): void {
  homeNamesFlushScheduled = false;
  const ids = [...queuedHomeIds];
  const generals = [...queuedGeneralOrgs];
  queuedHomeIds.clear();
  queuedGeneralOrgs.clear();
  if (ids.length === 0 && generals.length === 0) return;
  // Not canceled on cleanup: the answer fills the module cache for every mounted hook.
  void supabase
    .schema("platform")
    .rpc("home_names" as never, { p_scope_ids: ids, p_general_orgs: generals } as never)
    .then((result) => {
      for (const id of ids) homeLabelsInFlight.delete(id);
      const { data, error } = result as { data: HomeNameRow[] | null; error: { message: string } | null };
      if (error) {
        for (const org of generals) namedGeneralOrgs.delete(org);
        console.error("[notes homes] could not name the homes the notes live in", error);
        return;
      }
      const next: Record<string, ItemHome | null> = {};
      for (const id of ids) next[id] = null;
      for (const row of data ?? []) {
        next[row.scope_id] = {
          scopeId: row.scope_id,
          name: row.is_general ? "General" : row.name,
          organizationId: row.organization_id,
          organizationName: row.organization_name,
          scopeTypeId: row.scope_type_id,
          scopeTypeLabel: row.is_general ? "General" : row.scope_type_label,
          isGeneral: row.is_general,
        };
      }
      Object.assign(outsideTreeCache, next);
      for (const listener of homeLabelListeners) listener(next);
    });
}

export function useNoteHomeNames(generalOfOrganizationId: string | null = null): NoteHomeNames {
  const noteOrganizationIds = useAppSelector(selectNoteOrganizationIds);
  const notesSpanManyOrganizations = noteOrganizationIds.length > 1;
  const noteHomeIds = useAppSelector(selectNoteHomeIds);
  // Ask once the notes list has answered: the homes the notes live in and the active organization's
  // General then go out as ONE read, not General first and the note homes after.
  const listStatus = useAppSelector(selectNotesListStatus);
  const listSettled = listStatus === "loaded" || listStatus === "error";
  const [named, setNamed] = useState<Record<string, ItemHome | null>>(() => ({ ...outsideTreeCache }));
  useEffect(() => {
    const listener = (next: Record<string, ItemHome | null>) => setNamed((prev) => ({ ...prev, ...next }));
    homeLabelListeners.add(listener);
    return () => {
      homeLabelListeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    if (!listSettled) return;
    const missing = noteHomeIds.filter(
      (id) => !(id in named) && !(id in outsideTreeCache) && !homeLabelsInFlight.has(id),
    );
    const askGeneral =
      generalOfOrganizationId !== null && !namedGeneralOrgs.has(generalOfOrganizationId);
    if (missing.length === 0 && !askGeneral) return;
    for (const id of missing) homeLabelsInFlight.add(id);
    if (askGeneral) namedGeneralOrgs.add(generalOfOrganizationId);
    // Every mount asking in this tick shares ONE read (the sidebar, the landing and the agent surface
    // each mount this hook on /notes).
    queueHomeNames(missing, askGeneral ? generalOfOrganizationId : null);
  }, [noteHomeIds, named, generalOfOrganizationId, listSettled]);

  return useMemo(() => {
    const homes = Object.values(named).filter((home): home is ItemHome => home !== null);
    const byId = new Map(homes.map((home) => [home.scopeId, home]));
    const generalByOrganization = new Map<string, ItemHome>();
    for (const home of homes) {
      if (home.isGeneral && !generalByOrganization.has(home.organizationId)) {
        generalByOrganization.set(home.organizationId, home);
      }
    }
    const parts = homeLabelParts(homes, { notesSpanManyOrganizations });
    const labelPartsOf = (scopeId: string | null | undefined): HomeLabelParts | null => {
      if (!scopeId) return null;
      const part = parts.get(scopeId);
      if (part) return part;
      return scopeId in named ? { text: "Unavailable home", tail: null } : null;
    };
    const labelOf = (scopeId: string | null | undefined): string | null => {
      const part = labelPartsOf(scopeId);
      return part ? part.text + (part.tail ?? "") : null;
    };
    return { homes, byId, generalByOrganization, labelOf, labelPartsOf, notesSpanManyOrganizations };
  }, [named, notesSpanManyOrganizations]);
}

// ── THE AGENT SURFACE'S HOMES ────────────────────────────────────────────────────────────────────
// The notes surface (agent context + write handlers) is mounted on every /notes paint but used only
// when an agent is. It NAMES homes from the same specific read as the sidebar (`useNoteHomeNames`)
// and reads the whole scope tree only when something is actually asked: `homesNow()` (a write
// resolving a home) and `engage()` (the agent was started) — both trigger-time, never render.

export interface NoteSurfaceHomes extends NoteHomeNames {
  /** Trigger-time: the surface is in use — start loading the whole tree. */
  engage: () => void;
  /** Trigger-time: every home known right now (the tree once it is in, else the named homes). */
  homesNow: () => Pick<NoteHomeNames, "homes" | "labelOf">;
  /** Trigger-time: wait for the whole tree, then answer every home. */
  homesWhenLoaded: () => Promise<Pick<NoteHomeNames, "homes" | "labelOf">>;
}

export function useNoteHomesForSurface(generalOfOrganizationId: string | null = null): NoteSurfaceHomes {
  const names = useNoteHomeNames(generalOfOrganizationId);
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const engage = useCallback(() => {
    void dispatch(ensureScopeTree());
  }, [dispatch]);
  const homesNow = useCallback(() => {
    // A trigger-time read of the tree: the surface is engaged, so this MAY start the tree load.
    const byId = new Map<string, ItemHome>(buildHomes(selectOrganizationsList(store.getState())).map((h) => [h.scopeId, h]));
    for (const home of names.homes) if (!byId.has(home.scopeId)) byId.set(home.scopeId, home);
    const homes = [...byId.values()];
    const labels = homeLabels(homes, { notesSpanManyOrganizations: names.notesSpanManyOrganizations });
    return {
      homes,
      labelOf: (scopeId: string | null | undefined) => (scopeId ? (labels.get(scopeId) ?? names.labelOf(scopeId)) : null),
    };
  }, [store, names]);
  const homesWhenLoaded = useCallback(async () => {
    await dispatch(ensureScopeTree());
    return homesNow();
  }, [dispatch, homesNow]);
  return { ...names, engage, homesNow, homesWhenLoaded };
}

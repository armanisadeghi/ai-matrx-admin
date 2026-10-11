// features/notes/homes/useNoteHomes.ts
//
// Every home a person can put a note in, read from the ONE scope tree
// (features/scopes). The picker, the sidebar's home tree and the home chip all
// read this — never a folder list.

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWholeScopeTree } from "@/features/scopes/hooks/useWholeScopeTree";
import { selectNoteHomeIds, selectNoteOrganizationIds } from "../redux/selectors";
import {
  buildHomes,
  collidingHomeNames,
  homeDisplayName,
  type NoteHome,
} from "./homeModel";

export interface UseNoteHomesReturn {
  homes: NoteHome[];
  byId: ReadonlyMap<string, NoteHome>;
  /** Each organization's General (scope id) by organization id. */
  generalByOrganization: ReadonlyMap<string, NoteHome>;
  /** The label a home shows (organization only where it is the meaning). */
  labelOf: (scopeId: string | null | undefined) => string | null;
  notesSpanManyOrganizations: boolean;
  status: ReturnType<typeof useWholeScopeTree>["status"];
  organizations: ReturnType<typeof useWholeScopeTree>["organizations"];
}

export function useNoteHomes(): UseNoteHomesReturn {
  const tree = useWholeScopeTree();
  const noteOrganizationIds = useAppSelector(selectNoteOrganizationIds);
  const notesSpanManyOrganizations = noteOrganizationIds.length > 1;
  const noteHomeIds = useAppSelector(selectNoteHomeIds);
  // Homes a note lives in that the scope tree does not carry (a scope of an
  // organization the tree did not load, an archived scope): named by a direct
  // read so the sidebar never shows a nameless group.
  const [outsideTree, setOutsideTree] = useState<Record<string, string>>({});
  useEffect(() => {
    if (tree.status !== "ready") return;
    const known = new Set<string>();
    for (const org of tree.organizations) for (const t of org.scope_types) for (const sc of t.scopes) known.add(sc.id);
    const missing = noteHomeIds.filter((id) => !known.has(id) && !(id in outsideTree));
    if (missing.length === 0) return;
    let cancelled = false;
    void supabase
      .schema("custom")
      .from("context_scopes")
      .select("id, name")
      .in("id", missing)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[notes homes] could not name homes outside the scope tree", error);
          return;
        }
        const next: Record<string, string> = {};
        for (const id of missing) next[id] = "Unavailable home";
        for (const row of (data ?? []) as { id: string | null; name: string | null }[]) {
          if (row.id) next[row.id] = row.name ?? "Unavailable home";
        }
        setOutsideTree((prev) => ({ ...prev, ...next }));
      });
    return () => {
      cancelled = true;
    };
  }, [tree.status, tree.organizations, noteHomeIds, outsideTree]);

  return useMemo(() => {
    const homes = buildHomes(tree.organizations);
    const byId = new Map(homes.map((home) => [home.scopeId, home]));
    const generalByOrganization = new Map<string, NoteHome>();
    for (const home of homes) {
      if (home.isGeneral && !generalByOrganization.has(home.organizationId)) {
        generalByOrganization.set(home.organizationId, home);
      }
    }
    const collidingNames = collidingHomeNames(homes);
    const labelOf = (scopeId: string | null | undefined): string | null => {
      if (!scopeId) return null;
      const home = byId.get(scopeId);
      if (home) return homeDisplayName(home, { notesSpanManyOrganizations, collidingNames });
      return outsideTree[scopeId] ?? null;
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

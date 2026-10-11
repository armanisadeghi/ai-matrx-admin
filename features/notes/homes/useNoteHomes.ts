// features/notes/homes/useNoteHomes.ts
//
// Every home a person can put a note in, read from the ONE scope tree
// (features/scopes). The picker, the sidebar's home tree and the home chip all
// read this — never a folder list.

"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWholeScopeTree } from "@/features/scopes/hooks/useWholeScopeTree";
import { selectNoteOrganizationIds } from "../redux/selectors";
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
      return home ? homeDisplayName(home, { notesSpanManyOrganizations, collidingNames }) : null;
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
  }, [tree.organizations, tree.status, notesSpanManyOrganizations]);
}

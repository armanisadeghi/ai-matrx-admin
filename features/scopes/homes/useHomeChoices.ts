// features/scopes/homes/useHomeChoices.ts
//
// Every home a person can put a record in — each organization's General plus
// every scope — read from the ONE scope tree. The shared home picker reads
// this; notes' own hook (`useNoteHomes`) layers note-only naming on top.

"use client";

import { useMemo } from "react";
import { useWholeScopeTree } from "@/features/scopes/hooks/useWholeScopeTree";
import { buildHomes, type ItemHome } from "./homeModel";

export interface UseHomeChoicesReturn {
  homes: ItemHome[];
  status: ReturnType<typeof useWholeScopeTree>["status"];
  organizations: ReturnType<typeof useWholeScopeTree>["organizations"];
}

export function useHomeChoices(): UseHomeChoicesReturn {
  const tree = useWholeScopeTree();
  return useMemo(
    () => ({ homes: buildHomes(tree.organizations), status: tree.status, organizations: tree.organizations }),
    [tree.organizations, tree.status],
  );
}

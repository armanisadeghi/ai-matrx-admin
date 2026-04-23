"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllResources,
  selectResourcesForSkill,
  selectResourcesStatus,
  fetchResources,
  deleteResource,
  type SklResource,
} from "../redux/skl";

export interface UseResourcesArgs {
  skillId?: string;
}

export interface UseResourcesResult {
  resources: SklResource[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  remove: (id: string) => void;
}

export function useResources({
  skillId,
}: UseResourcesArgs = {}): UseResourcesResult {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectResourcesStatus);
  const error = useAppSelector((s) => s.skl.resources.error);

  const all = useAppSelector(selectAllResources);
  const forSkill = useAppSelector(selectResourcesForSkill(skillId ?? null));

  useEffect(() => {
    void dispatch(fetchResources(skillId ? { skillId } : {}));
  }, [dispatch, skillId]);

  return useMemo(
    () => ({
      resources: skillId ? forSkill : all,
      loading: status === "loading",
      error,
      reload: () => {
        void dispatch(fetchResources(skillId ? { skillId } : {}));
      },
      remove: (id: string) => {
        void dispatch(deleteResource({ id }));
      },
    }),
    [all, forSkill, skillId, status, error, dispatch],
  );
}

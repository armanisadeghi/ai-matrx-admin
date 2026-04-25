"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllSkillDefinitions,
  selectSkillDefinitionsByType,
  selectSkillDefinitionsStatus,
  selectSkillDefinitionsGrouped,
} from "../redux/skl/selectors";
import { fetchSkillDefinitions } from "../redux/skl/thunks";
import type { SklSkillType, SklDefinition } from "../redux/skl/types";
import { useViewScope } from "./useViewScope";

export interface UseSkillsArgs {
  types?: SklSkillType[];
}

export interface UseSkillsResult {
  skills: SklDefinition[];
  grouped: Record<SklSkillType, SklDefinition[]>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSkills({ types }: UseSkillsArgs = {}): UseSkillsResult {
  const dispatch = useAppDispatch();
  const { scope, scopeId } = useViewScope();
  const status = useAppSelector(selectSkillDefinitionsStatus);
  const error = useAppSelector((s) => s.skl.definitions.error);

  const allSkills = useAppSelector(selectAllSkillDefinitions);
  const filteredSelector = useMemo(
    () => selectSkillDefinitionsByType(types),
    [types],
  );
  const filteredSkills = useAppSelector(filteredSelector);
  const grouped = useAppSelector(selectSkillDefinitionsGrouped);

  const typesKey = types?.join(",");
  useEffect(() => {
    void dispatch(fetchSkillDefinitions({ scope, scopeId, types }));
    // Depend on the stable typesKey so array identity doesn't cause refetch.
  }, [dispatch, scope, scopeId, typesKey]);

  return useMemo(
    () => ({
      skills: types ? filteredSkills : allSkills,
      grouped,
      loading: status === "loading",
      error,
      reload: () => {
        void dispatch(fetchSkillDefinitions({ scope, scopeId, types }));
      },
    }),
    [
      allSkills,
      filteredSkills,
      grouped,
      status,
      error,
      dispatch,
      scope,
      scopeId,
      types,
    ],
  );
}

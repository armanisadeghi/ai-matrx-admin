"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllSkillDefinitions,
  selectSkillDefinitionsByType,
  selectSkillDefinitionsStatus,
  selectSkillDefinitionsGrouped,
  fetchSkillDefinitions,
  type SklSkillType,
  type SklDefinition,
} from "../redux/skl";
import { useScope } from "./useScope";

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
  const { scope, scopeId } = useScope();
  const status = useAppSelector(selectSkillDefinitionsStatus);
  const error = useAppSelector((s) => s.skl.definitions.error);

  const allSkills = useAppSelector(selectAllSkillDefinitions);
  const filteredSelector = useMemo(
    () => selectSkillDefinitionsByType(types),
    [types],
  );
  const filteredSkills = useAppSelector(filteredSelector);
  const grouped = useAppSelector(selectSkillDefinitionsGrouped);

  useEffect(() => {
    void dispatch(
      fetchSkillDefinitions({ scope, scopeId, types }),
    );
  }, [dispatch, scope, scopeId, types?.join(",")]);

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

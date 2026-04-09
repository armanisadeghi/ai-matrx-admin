"use client";

import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { useProjectTasks } from "@/features/agent-context/hooks/useHierarchy";
import {
  fetchScopeTypes,
  fetchScopes,
  EMPTY_SCOPE_PICKER_OPTIONS,
  selectScopePickerOptions,
  selectScopeTypesLoading,
} from "@/features/agent-context/redux/scope";
import { fetchEntitiesByScopes } from "@/features/agent-context/redux/scope/scopeAssignmentsSlice";
import type {
  HierarchyLevel,
  HierarchySelection,
  HierarchyOption,
  ScopeTypeLevel,
  UseHierarchySelectionReturn,
} from "./types";
import { EMPTY_SELECTION } from "./types";

interface UseHierarchySelectionOptions {
  levels?: HierarchyLevel[];
  controlled?: {
    value: HierarchySelection;
    onChange: (selection: HierarchySelection) => void;
  };
  autoSelectFirst?: boolean;
}

export function useHierarchySelection(
  options: UseHierarchySelectionOptions = {},
): UseHierarchySelectionReturn {
  const {
    levels = ["organization", "project", "task"],
    controlled,
    autoSelectFirst = false,
  } = options;

  const dispatch = useAppDispatch();
  const {
    orgs: rawOrgs,
    flatProjects,
    isLoading,
    isError,
    isSuccess,
  } = useNavTree();

  const [internal, setInternal] = useState<HierarchySelection>(EMPTY_SELECTION);
  const [scopeFilteredProjectIds, setScopeFilteredProjectIds] =
    useState<Set<string> | null>(null);

  const selection = controlled ? controlled.value : internal;
  const setSelection = controlled ? controlled.onChange : setInternal;

  const { data: rawTasks } = useProjectTasks(
    levels.includes("task") ? selection.projectId : null,
  );

  const includesScopes = levels.includes("scope");
  const selectedOrgId = selection.organizationId;
  const scopeSelections = selection.scopeSelections ?? {};

  const hasFetchedScopes = useRef<string | null>(null);
  useEffect(() => {
    if (!includesScopes || !selectedOrgId) return;
    if (hasFetchedScopes.current === selectedOrgId) return;
    hasFetchedScopes.current = selectedOrgId;
    dispatch(fetchScopeTypes(selectedOrgId));
    dispatch(fetchScopes({ org_id: selectedOrgId }));
  }, [dispatch, includesScopes, selectedOrgId]);

  const pickerOptions = useAppSelector((state) =>
    selectedOrgId && includesScopes
      ? selectScopePickerOptions(state, selectedOrgId)
      : EMPTY_SCOPE_PICKER_OPTIONS,
  );
  const scopeTypesLoading = useAppSelector(selectScopeTypesLoading);

  const scopeLevels: ScopeTypeLevel[] = pickerOptions.map((group) => ({
    typeId: group.type_id,
    label: group.label.replace(/s$/i, ""),
    pluralLabel: group.label,
    icon: group.icon,
    color: group.color,
    sortOrder: 0,
    options: group.options.map((o) => ({
      id: o.value,
      name: o.label,
    })),
  }));

  const activeScopeIds = Object.values(scopeSelections).filter(
    Boolean,
  ) as string[];
  const activeScopeKey = activeScopeIds.sort().join(",");

  const lastScopeKey = useRef("");
  useEffect(() => {
    if (activeScopeKey === lastScopeKey.current) return;
    lastScopeKey.current = activeScopeKey;

    if (activeScopeIds.length === 0) {
      setScopeFilteredProjectIds(null);
      return;
    }

    dispatch(
      fetchEntitiesByScopes({
        scope_ids: activeScopeIds,
        entity_type: "project",
        match_all: false,
      }),
    )
      .unwrap()
      .then((entities) => {
        setScopeFilteredProjectIds(new Set(entities.map((e) => e.entity_id)));
      })
      .catch(() => {
        setScopeFilteredProjectIds(null);
      });
  }, [dispatch, activeScopeKey]);

  const orgs: HierarchyOption[] = rawOrgs.map((o) => ({
    id: o.id,
    name: o.name,
    isPersonal: o.is_personal,
    role: o.role,
  }));

  const allProjects = selectedOrgId
    ? flatProjects.filter((p) => p.org_id === selectedOrgId)
    : flatProjects;

  const projects: HierarchyOption[] = allProjects
    .filter(
      (p) => !scopeFilteredProjectIds || scopeFilteredProjectIds.has(p.id),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
    }));

  const tasks: HierarchyOption[] = (rawTasks ?? []).map((t) => ({
    id: t.id,
    name: t.title,
    status: t.status ?? null,
  }));

  useEffect(() => {
    if (!autoSelectFirst || !isSuccess) return;
    if (!selection.organizationId && orgs.length > 0) {
      setSelection({
        ...EMPTY_SELECTION,
        organizationId: orgs[0].id,
        organizationName: orgs[0].name,
      });
    }
  }, [autoSelectFirst, isSuccess, orgs.length]);

  const setOrg = (id: string | null) => {
    const org = id ? orgs.find((o) => o.id === id) : null;
    setScopeFilteredProjectIds(null);
    setSelection({
      organizationId: id,
      organizationName: org?.name ?? null,
      projectId: null,
      projectName: null,
      taskId: null,
      taskName: null,
      scopeSelections: {},
    });
  };

  const setProject = (id: string | null) => {
    const proj = id ? projects.find((p) => p.id === id) : null;
    setSelection({
      ...selection,
      projectId: id,
      projectName: proj?.name ?? null,
      taskId: null,
      taskName: null,
    });
  };

  const setTask = (id: string | null) => {
    const task = id ? tasks.find((t) => t.id === id) : null;
    setSelection({
      ...selection,
      taskId: id,
      taskName: task?.name ?? null,
    });
  };

  const setScopeValue = (typeId: string, scopeId: string | null) => {
    const nextScopes = { ...scopeSelections };
    if (scopeId) {
      nextScopes[typeId] = scopeId;
    } else {
      delete nextScopes[typeId];
    }
    setSelection({
      ...selection,
      scopeSelections: nextScopes,
      projectId: null,
      projectName: null,
      taskId: null,
      taskName: null,
    });
  };

  const clear = () => {
    setScopeFilteredProjectIds(null);
    setSelection(EMPTY_SELECTION);
  };

  return {
    orgs,
    projects,
    tasks,
    scopeLevels,
    isLoading: isLoading || (includesScopes && scopeTypesLoading),
    isError,
    selection,
    setOrg,
    setProject,
    setTask,
    setScopeValue,
    clear,
  };
}

"use client";

import { useState, useEffect } from "react";
import { useNavTree } from "../../hooks/useNavTree";
import { useProjectTasks } from "../../hooks/useHierarchy";
import type {
  HierarchyLevel,
  HierarchySelection,
  HierarchyOption,
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
  const { levels = ["organization", "project", "task"], controlled, autoSelectFirst = false } = options;

  const { orgs: rawOrgs, flatProjects, isLoading, isError, isSuccess } = useNavTree();

  const [internal, setInternal] = useState<HierarchySelection>(EMPTY_SELECTION);

  const selection = controlled ? controlled.value : internal;
  const setSelection = controlled
    ? controlled.onChange
    : setInternal;

  const { data: rawTasks } = useProjectTasks(
    levels.includes("task") ? selection.projectId : null,
  );

  const orgs: HierarchyOption[] = rawOrgs.map((o) => ({
    id: o.id,
    name: o.name,
    isPersonal: o.is_personal,
    role: o.role,
  }));

  const projects: HierarchyOption[] = (
    selection.organizationId
      ? flatProjects.filter((p) => p.org_id === selection.organizationId)
      : flatProjects
  ).map((p) => ({
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
    setSelection({
      organizationId: id,
      organizationName: org?.name ?? null,
      projectId: null,
      projectName: null,
      taskId: null,
      taskName: null,
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

  const clear = () => setSelection(EMPTY_SELECTION);

  return {
    orgs,
    projects,
    tasks,
    isLoading,
    isError,
    selection,
    setOrg,
    setProject,
    setTask,
    clear,
  };
}

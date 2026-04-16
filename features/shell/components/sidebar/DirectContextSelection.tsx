"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  Building,
  FolderKanban,
  ListCheck,
  ChevronDown,
  X,
  Settings2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectOrganizationId,
  selectOrganizationName,
  selectProjectId,
  selectProjectName,
  selectTaskId,
  selectTaskName,
  selectScopeSelectionsContext,
  setOrganization,
  setScopeSelections,
  setProject,
  setTask,
  clearContext,
} from "@/features/agent-context/redux/appContextSlice";
import { selectNavOrganizations } from "@/features/agent-context/redux/hierarchySlice";
import { selectAllTasks } from "@/features/agent-context/redux/tasksSlice";
import { selectAllProjects } from "@/features/agent-context/redux/projectsSlice";
import {
  selectAllScopeTypes,
  selectAllScopes,
} from "@/features/agent-context/redux/scope";
import { fetchEntitiesByScopes } from "@/features/agent-context/redux/scope/scopeAssignmentsSlice";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { selectDefaultContextPreferences } from "@/lib/redux/selectors/userPreferenceSelectors";
import {
  ContextRow,
  DynamicIcon,
  type PickerOption,
} from "@/features/agent-context/components/ContextPickerPrimitives";

interface DirectContextSelectionProps {
  /** Start expanded (e.g., when rendered inside a bottom sheet). Default: false */
  defaultExpanded?: boolean;
}

export function DirectContextSelection({ defaultExpanded = false }: DirectContextSelectionProps) {
  const dispatch = useAppDispatch();

  // ── Redux context state ────────────────────────────────────────────────────
  const orgId = useAppSelector(selectOrganizationId);
  const orgName = useAppSelector(selectOrganizationName);
  const projectId = useAppSelector(selectProjectId);
  const projectName = useAppSelector(selectProjectName);
  const taskId = useAppSelector(selectTaskId);
  const taskName = useAppSelector(selectTaskName);
  const scopeSelections = useAppSelector(selectScopeSelectionsContext);

  // ── Default context preference (auto-apply on first mount) ─────────────────
  const defaultCtxPref = useAppSelector(selectDefaultContextPreferences);
  const appliedDefault = useRef(false);

  // ── Raw data ───────────────────────────────────────────────────────────────
  const { isLoading } = useNavTree();
  const orgsFromContext = useAppSelector(selectNavOrganizations);
  const allProjects = useAppSelector(selectAllProjects);
  const allTasks = useAppSelector(selectAllTasks);
  const allScopeTypes = useAppSelector(selectAllScopeTypes);
  const allScopes = useAppSelector(selectAllScopes);

  // ── Apply default context once data is available ───────────────────────────
  useEffect(() => {
    if (appliedDefault.current) return;
    if (!defaultCtxPref || defaultCtxPref.level === "none") {
      appliedDefault.current = true;
      return;
    }
    if (!orgsFromContext || orgsFromContext.length === 0) return;

    const {
      level,
      organizationId,
      projectId: prefProjectId,
      taskId: prefTaskId,
    } = defaultCtxPref;

    if (
      (level === "org" || level === "project" || level === "task") &&
      organizationId
    ) {
      const org = orgsFromContext.find((o) => o.id === organizationId);
      if (org) dispatch(setOrganization({ id: org.id, name: org.name }));
    }
    if ((level === "project" || level === "task") && prefProjectId) {
      const proj = allProjects.find((p) => p.id === prefProjectId);
      if (proj) dispatch(setProject({ id: proj.id, name: proj.name }));
    }
    if (level === "task" && prefTaskId) {
      const task = allTasks.find((t) => t.id === prefTaskId);
      if (task) dispatch(setTask({ id: task.id, name: task.title }));
    }
    appliedDefault.current = true;
  }, [dispatch, defaultCtxPref, orgsFromContext, allProjects, allTasks]);

  // ── Collapsible state ──────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(defaultExpanded);

  // ── Scope-filtered project IDs ─────────────────────────────────────────────
  const [scopeFilteredIds, setScopeFilteredIds] = useState<Set<string> | null>(
    null,
  );
  const activeScopeIds = Object.values(scopeSelections).filter(
    Boolean,
  ) as string[];
  const activeScopeKey = [...activeScopeIds].sort().join(",");
  const lastScopeKey = useRef("");

  useEffect(() => {
    if (activeScopeKey === lastScopeKey.current) return;
    lastScopeKey.current = activeScopeKey;
    if (activeScopeIds.length === 0) {
      setScopeFilteredIds(null);
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
      .then((entities) =>
        setScopeFilteredIds(new Set(entities.map((e) => e.entity_id))),
      )
      .catch(() => setScopeFilteredIds(null));
  }, [dispatch, activeScopeKey]);

  // ── Visible scope types ────────────────────────────────────────────────────
  const visibleScopeTypes = useMemo(
    () =>
      orgId
        ? allScopeTypes.filter((t) => t.organization_id === orgId)
        : allScopeTypes,
    [allScopeTypes, orgId],
  );

  // ── Options ────────────────────────────────────────────────────────────────
  const orgOptions: PickerOption[] = useMemo(
    () => (orgsFromContext ?? []).map((o) => ({ id: o.id, name: o.name })),
    [orgsFromContext],
  );

  const { projectOptions, orphanProjectOptions } = useMemo(() => {
    const orgFiltered = orgId
      ? allProjects.filter((p) => p.organization_id === orgId)
      : allProjects;
    const scopeFiltered = scopeFilteredIds
      ? orgFiltered.filter((p) => scopeFilteredIds.has(p.id))
      : orgFiltered;
    const orphans =
      scopeFilteredIds && orgFiltered.length > 0
        ? orgFiltered
            .filter((p) => !scopeFilteredIds.has(p.id))
            .map((p) => ({ id: p.id, name: p.name }))
        : [];
    return {
      projectOptions: scopeFiltered.map((p) => ({ id: p.id, name: p.name })),
      orphanProjectOptions: orphans,
    };
  }, [allProjects, orgId, scopeFilteredIds]);

  const { taskOptions, orphanTaskOptions } = useMemo(() => {
    const base = (
      orgId ? allTasks.filter((t) => t.organization_id === orgId) : allTasks
    ).filter((t) => t.status !== "completed");
    if (projectId) {
      return {
        taskOptions: base
          .filter((t) => t.project_id === projectId)
          .map((t) => ({ id: t.id, name: t.title, status: t.status })),
        orphanTaskOptions: base
          .filter((t) => t.project_id === null)
          .map((t) => ({ id: t.id, name: t.title, status: t.status })),
      };
    }
    return {
      taskOptions: base
        .filter((t) => t.project_id !== null)
        .map((t) => ({ id: t.id, name: t.title, status: t.status })),
      orphanTaskOptions: base
        .filter((t) => t.project_id === null)
        .map((t) => ({ id: t.id, name: t.title, status: t.status })),
    };
  }, [allTasks, orgId, projectId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectOrg = (id: string | null) => {
    const org = (orgsFromContext ?? []).find((o) => o.id === id);
    dispatch(setOrganization({ id, name: org?.name ?? null }));
    setScopeFilteredIds(null);
  };

  const handleSelectScope = (typeId: string, scopeId: string | null) => {
    const next = { ...scopeSelections };
    if (scopeId) next[typeId] = scopeId;
    else delete next[typeId];
    dispatch(setScopeSelections(next));
  };

  const handleSelectProject = (id: string | null) => {
    const proj = allProjects.find((p) => p.id === id);
    dispatch(setProject({ id, name: proj?.name ?? null }));
  };

  const handleSelectTask = (id: string | null) => {
    const task = allTasks.find((t) => t.id === id);
    if (task?.project_id && !projectId) {
      const proj = allProjects.find((p) => p.id === task.project_id);
      dispatch(setProject({ id: task.project_id, name: proj?.name ?? null }));
    }
    dispatch(setTask({ id, name: task?.title ?? null }));
  };

  const handleClearAll = useCallback(() => {
    setScopeFilteredIds(null);
    dispatch(clearContext());
  }, [dispatch]);

  // ── Collapsed summary ──────────────────────────────────────────────────────
  const hasAnyContext =
    !!orgId || !!projectId || !!taskId || activeScopeIds.length > 0;

  const collapsedLabel = useMemo(() => {
    if (taskName) return taskName;
    if (projectName) return projectName;
    const firstScopeId = activeScopeIds[0];
    if (firstScopeId) {
      const scope = allScopes.find((s) => s.id === firstScopeId);
      if (scope) return scope.name;
    }
    if (orgName) return orgName;
    return null;
  }, [taskName, projectName, activeScopeIds, allScopes, orgName]);

  const collapsedIcon = useMemo(() => {
    if (taskId) return ListCheck;
    if (projectId) return FolderKanban;
    const firstScopeId = activeScopeIds[0];
    if (firstScopeId) {
      const scopeType = visibleScopeTypes.find((st) =>
        allScopes.some(
          (s) => s.id === firstScopeId && s.scope_type_id === st.id,
        ),
      );
      if (scopeType) {
        return (props: { className?: string }) => (
          <DynamicIcon name={scopeType.icon} {...props} />
        );
      }
    }
    if (orgId) return Building;
    return Settings2;
  }, [taskId, projectId, activeScopeIds, orgId, visibleScopeTypes, allScopes]);

  const CollapsedIcon = collapsedIcon;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Collapsed header — div to avoid nested <button> */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v);
        }}
        className="flex items-center gap-2 w-full px-2.5 py-1 text-left hover:bg-accent/40 transition-colors group cursor-pointer select-none"
      >
        <CollapsedIcon
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-colors",
            hasAnyContext
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span
          className={cn(
            "text-xs flex-1 truncate",
            hasAnyContext
              ? "text-foreground font-medium"
              : "text-muted-foreground",
          )}
        >
          {collapsedLabel ?? "Set Context"}
        </span>
        {hasAnyContext && !expanded && (
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClearAll();
            }}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors mr-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-150",
            expanded && "rotate-180",
          )}
        />
      </div>

      {/* Expanded rows */}
      {expanded && (
        <div className="px-1.5 pb-1">
          {isLoading && visibleScopeTypes.length === 0 && (
            <>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-2.5 py-1.5"
                >
                  <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse flex-shrink-0" />
                  <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </>
          )}

          <ContextRow
            icon={Building}
            label="Organization"
            selectedName={orgName}
            selectedId={orgId}
            accentClass="text-violet-500"
            options={orgOptions}
            onSelect={handleSelectOrg}
            emptyText="No organizations found"
          />

          {visibleScopeTypes.map((scopeType) => {
            const selectedScopeId = scopeSelections[scopeType.id] ?? null;
            const selectedScope = selectedScopeId
              ? allScopes.find((s) => s.id === selectedScopeId)
              : null;
            const scopeOptions: PickerOption[] = allScopes
              .filter((s) => s.scope_type_id === scopeType.id)
              .map((s) => ({ id: s.id, name: s.name }));
            return (
              <ContextRow
                key={scopeType.id}
                icon={(props) => (
                  <DynamicIcon name={scopeType.icon} {...props} />
                )}
                label={scopeType.label_singular}
                selectedName={selectedScope?.name ?? null}
                selectedId={selectedScopeId}
                accentClass="text-emerald-500"
                options={scopeOptions}
                onSelect={(id) => handleSelectScope(scopeType.id, id)}
                emptyText={`No ${scopeType.label_plural.toLowerCase()} found`}
              />
            );
          })}

          {visibleScopeTypes.length > 0 && (
            <div className="mx-1 my-0.5 border-t border-border/40" />
          )}

          <ContextRow
            icon={FolderKanban}
            label="Project"
            selectedName={projectName}
            selectedId={projectId}
            accentClass="text-amber-500"
            options={projectOptions}
            orphanOptions={orphanProjectOptions}
            onSelect={handleSelectProject}
            emptyText={
              activeScopeIds.length > 0
                ? "No projects match selected scopes"
                : orgId
                  ? "No projects in this organization"
                  : "Search all projects"
            }
          />

          <ContextRow
            icon={ListCheck}
            label="Tasks"
            selectedName={taskName}
            selectedId={taskId}
            accentClass="text-sky-500"
            options={taskOptions}
            orphanOptions={orphanTaskOptions}
            onSelect={handleSelectTask}
            emptyText={
              projectId
                ? "No open tasks in this project"
                : "Search tasks by name"
            }
          />

          {hasAnyContext && (
            <div className="pt-0.5">
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 w-full px-2.5 py-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors rounded-md hover:bg-accent/30"
              >
                <X className="h-2.5 w-2.5" />
                Clear context
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DirectContextSelection;

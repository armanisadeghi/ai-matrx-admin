"use client";

/**
 * AgentContextPreferences — default context picker for the preferences page.
 *
 * Renders the SAME rows as DirectContextSelection in the chat sidebar:
 *   Organization → [scope type rows] → Project → Task
 *
 * Data comes from the same Redux slices (hierarchy, scopeTypes, scopes,
 * projects, tasks) — all populated by fetchFullContext().
 *
 * Writes to userPreferences.agentContext instead of appContextSlice so the
 * selection persists across sessions and auto-applies on chat open.
 */

import { useMemo } from "react";
import { Building, FolderKanban, ListCheck, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setModulePreferences } from "@/lib/redux/slices/userPreferencesSlice";
import type { AgentContextPreferences as AgentContextPrefs } from "@/lib/redux/slices/userPreferencesSlice";
import { selectDefaultContextPreferences } from "@/lib/redux/selectors/userPreferenceSelectors";
import { selectNavOrganizations } from "@/features/agent-context/redux/hierarchySlice";
import { selectAllProjects } from "@/features/agent-context/redux/projectsSlice";
import { selectAllTasks } from "@/features/agent-context/redux/tasksSlice";
import {
  selectAllScopeTypes,
  selectAllScopes,
} from "@/features/agent-context/redux/scope";
import { useEnsureHierarchyLoaded } from "@/features/agent-context/hooks/useNavTree";
import {
  ContextRow,
  DynamicIcon,
  type PickerOption,
} from "@/features/agent-context/components/ContextPickerPrimitives";
import { cn } from "@/utils/cn";

export default function AgentContextPreferences() {
  const dispatch = useAppDispatch();

  // Ensure the full hierarchy + scopes are loaded in Redux.
  // Idempotent: if DeferredSingletons already triggered the fetch this is a no-op.
  const { isLoading } = useEnsureHierarchyLoaded();

  // ── Redux data (same selectors as the chat sidebar) ────────────────────────
  const pref = useAppSelector(selectDefaultContextPreferences);
  const orgs = useAppSelector(selectNavOrganizations) ?? [];
  const allProjects = useAppSelector(selectAllProjects);
  const allTasks = useAppSelector(selectAllTasks);
  const allScopeTypes = useAppSelector(selectAllScopeTypes);
  const allScopes = useAppSelector(selectAllScopes);

  // ── Scope types scoped to selected org (mirrors sidebar logic) ─────────────
  const visibleScopeTypes = useMemo(
    () =>
      pref.organizationId
        ? allScopeTypes.filter((t) => t.organization_id === pref.organizationId)
        : allScopeTypes,
    [allScopeTypes, pref.organizationId],
  );

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (patch: Partial<AgentContextPrefs>) =>
    dispatch(
      setModulePreferences({ module: "agentContext", preferences: patch }),
    );

  // ── Derived options ────────────────────────────────────────────────────────
  const orgOptions: PickerOption[] = useMemo(
    () => orgs.map((o) => ({ id: o.id, name: o.name })),
    [orgs],
  );

  const projectOptions: PickerOption[] = useMemo(
    () =>
      (pref.organizationId
        ? allProjects.filter((p) => p.organization_id === pref.organizationId)
        : allProjects
      ).map((p) => ({ id: p.id, name: p.name })),
    [allProjects, pref.organizationId],
  );

  // Mirror the sidebar exactly: org-filtered base, project-filtered main list,
  // orphan (no-project) tasks as secondary. When no project selected, show all
  // tasks-with-projects as main and orphans as secondary.
  const { taskOptions, orphanTaskOptions } = useMemo(() => {
    const base = (
      pref.organizationId
        ? allTasks.filter((t) => t.organization_id === pref.organizationId)
        : allTasks
    ).filter((t) => t.status !== "completed");

    if (pref.projectId) {
      return {
        taskOptions: base
          .filter((t) => t.project_id === pref.projectId)
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
  }, [allTasks, pref.organizationId, pref.projectId]);

  // ── Selected display names ─────────────────────────────────────────────────
  const orgName = orgs.find((o) => o.id === pref.organizationId)?.name ?? null;
  const projectName =
    allProjects.find((p) => p.id === pref.projectId)?.name ?? null;
  const taskTitle = allTasks.find((t) => t.id === pref.taskId)?.title ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectOrg = (id: string | null) => {
    // Clear downstream selections when org changes
    set({
      organizationId: id,
      scopeSelections: {},
      projectId: null,
      taskId: null,
    });
  };

  const handleSelectScope = (typeId: string, scopeId: string | null) => {
    const next = { ...pref.scopeSelections };
    if (scopeId) next[typeId] = scopeId;
    else delete next[typeId];
    set({ scopeSelections: next });
  };

  const handleSelectProject = (id: string | null) => {
    if (id && !pref.organizationId) {
      const proj = allProjects.find((p) => p.id === id);
      if (proj?.organization_id) {
        set({
          organizationId: proj.organization_id,
          projectId: id,
          taskId: null,
        });
        return;
      }
    }
    set({ projectId: id, taskId: null });
  };

  const handleSelectTask = (id: string | null) => {
    if (id && !pref.projectId) {
      const task = allTasks.find((t) => t.id === id);
      if (task?.project_id) {
        const proj = allProjects.find((p) => p.id === task.project_id);
        set({
          organizationId: pref.organizationId ?? proj?.organization_id ?? null,
          projectId: task.project_id,
          taskId: id,
        });
        return;
      }
    }
    set({ taskId: id });
  };

  const handleClearAll = () =>
    set({
      organizationId: null,
      scopeSelections: {},
      projectId: null,
      taskId: null,
      level: "none",
    });

  // ── Summary state ──────────────────────────────────────────────────────────
  const activeScopeIds = Object.values(pref.scopeSelections).filter(
    Boolean,
  ) as string[];
  const hasAny =
    !!pref.organizationId ||
    activeScopeIds.length > 0 ||
    !!pref.projectId ||
    !!pref.taskId;

  // Keep level field in sync automatically
  const inferredLevel = pref.taskId
    ? "task"
    : pref.projectId
      ? "project"
      : activeScopeIds.length > 0
        ? "scope"
        : pref.organizationId
          ? "org"
          : "none";
  if (pref.level !== inferredLevel) {
    setTimeout(() => set({ level: inferredLevel }), 0);
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border/40">
        <p className="text-sm font-medium">Default Context</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick the organization, scope, project, or task that should be
          pre-selected every time you open the chat. Hover any row to browse and
          choose.
        </p>
      </div>

      {/* ── Picker rows — identical structure to the chat sidebar ── */}
      <div className="px-2 py-1.5">
        {isLoading ? (
          <div className="space-y-1 py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 px-1 py-1.5">
                <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse flex-shrink-0" />
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Organization */}
            <ContextRow
              icon={Building}
              label="Organization"
              selectedName={orgName}
              selectedId={pref.organizationId}
              accentClass="text-violet-500"
              options={orgOptions}
              onSelect={handleSelectOrg}
              emptyText="No organizations found"
            />

            {/* Scope type rows — one per type visible for selected org */}
            {visibleScopeTypes.map((scopeType) => {
              const selectedScopeId =
                pref.scopeSelections[scopeType.id] ?? null;
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

            {/* Divider between scopes and project/task (only when scope rows exist) */}
            {visibleScopeTypes.length > 0 && (
              <div className="mx-1 my-0.5 border-t border-border/40" />
            )}

            {/* Project */}
            <ContextRow
              icon={FolderKanban}
              label="Project"
              selectedName={projectName}
              selectedId={pref.projectId}
              accentClass="text-amber-500"
              options={projectOptions}
              onSelect={handleSelectProject}
              emptyText={
                pref.organizationId
                  ? "No projects in this organization"
                  : "Select any project"
              }
            />

            {/* Task */}
            <ContextRow
              icon={ListCheck}
              label="Task"
              selectedName={taskTitle}
              selectedId={pref.taskId}
              accentClass="text-sky-500"
              options={taskOptions}
              orphanOptions={orphanTaskOptions}
              onSelect={handleSelectTask}
              emptyText={
                pref.projectId
                  ? "No open tasks in this project"
                  : "Select a project first"
              }
            />
          </>
        )}
      </div>

      {/* ── Summary / clear ── */}
      {hasAny && (
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10 flex items-start justify-between gap-3">
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground/70 mb-1">
              Will auto-apply on chat open:
            </p>
            {orgName && (
              <p>
                · Org: <span className="text-violet-500">{orgName}</span>
              </p>
            )}
            {activeScopeIds.map((scopeId) => {
              const scope = allScopes.find((s) => s.id === scopeId);
              return scope ? (
                <p key={scopeId}>
                  · Scope:{" "}
                  <span className="text-emerald-500">{scope.name}</span>
                </p>
              ) : null;
            })}
            {projectName && (
              <p>
                · Project: <span className="text-amber-500">{projectName}</span>
              </p>
            )}
            {taskTitle && (
              <p>
                · Task: <span className="text-sky-500">{taskTitle}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClearAll}
            className={cn(
              "flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground",
              "transition-colors shrink-0 mt-0.5",
            )}
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}

      {!hasAny && !isLoading && (
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10">
          <p className="text-[11px] text-muted-foreground/50 italic">
            No default set — chat opens with empty context
          </p>
        </div>
      )}
    </div>
  );
}

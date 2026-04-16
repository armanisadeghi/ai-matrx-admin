"use client";

// NoteContextPicker — Full hierarchy context assignment for a single note.
// Modeled on DirectContextSelection but writes to the note record
// (organization_id, project_id, task_id) instead of the global app context.
// Also includes scope assignments via setEntityScopes.

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  Building,
  FolderKanban,
  ListCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectNavOrganizations } from "@/features/agent-context/redux/hierarchySlice";
import { selectAllTasks } from "@/features/agent-context/redux/tasksSlice";
import { selectAllProjects } from "@/features/agent-context/redux/projectsSlice";
import {
  selectAllScopeTypes,
  selectAllScopes,
} from "@/features/agent-context/redux/scope";
import {
  fetchEntitiesByScopes,
  setEntityScopes,
  selectScopeIdsForEntity,
} from "@/features/agent-context/redux/scope/scopeAssignmentsSlice";
import {
  ContextRow,
  DynamicIcon,
  type PickerOption,
} from "@/features/agent-context/components/ContextPickerPrimitives";
import { setNoteField } from "../redux/slice";
import { selectNoteById } from "../redux/selectors";

interface NoteContextPickerProps {
  noteId: string;
  className?: string;
}

export function NoteContextPicker({ noteId, className }: NoteContextPickerProps) {
  const dispatch = useAppDispatch();

  // ── Note's current context ──────────────────────────────────────────────
  const note = useAppSelector(selectNoteById(noteId));
  const noteOrgId = note?.organization_id ?? null;
  const noteProjectId = note?.project_id ?? null;
  const noteTaskId = note?.task_id ?? null;

  // ── Available data ──────────────────────────────────────────────────────
  const orgs = useAppSelector(selectNavOrganizations) ?? [];
  const allProjects = useAppSelector(selectAllProjects);
  const allTasks = useAppSelector(selectAllTasks);
  const allScopeTypes = useAppSelector(selectAllScopeTypes);
  const allScopes = useAppSelector(selectAllScopes);

  // ── Note's current scope assignments ────────────────────────────────────
  const noteScopeIds = useAppSelector(
    (state) => selectScopeIdsForEntity(state, "note", noteId),
  );

  // ── Scope-filtered project IDs ──────────────────────────────────────────
  const [scopeFilteredIds, setScopeFilteredIds] = useState<Set<string> | null>(null);
  const activeScopeKey = [...noteScopeIds].sort().join(",");
  const lastScopeKey = useRef("");

  useEffect(() => {
    if (activeScopeKey === lastScopeKey.current) return;
    lastScopeKey.current = activeScopeKey;
    if (noteScopeIds.length === 0) {
      setScopeFilteredIds(null);
      return;
    }
    dispatch(
      fetchEntitiesByScopes({
        scope_ids: noteScopeIds,
        entity_type: "project",
        match_all: false,
      }),
    )
      .unwrap()
      .then((entities) =>
        setScopeFilteredIds(new Set(entities.map((e) => e.entity_id))),
      )
      .catch(() => setScopeFilteredIds(null));
  }, [dispatch, activeScopeKey, noteScopeIds]);

  // ── Visible scope types for the note's org ──────────────────────────────
  const visibleScopeTypes = useMemo(
    () =>
      noteOrgId
        ? allScopeTypes.filter((t) => t.organization_id === noteOrgId)
        : [],
    [allScopeTypes, noteOrgId],
  );

  // ── Options ─────────────────────────────────────────────────────────────
  const orgOptions: PickerOption[] = useMemo(
    () => orgs.map((o) => ({ id: o.id, name: o.name })),
    [orgs],
  );

  const orgName = useMemo(
    () => orgs.find((o) => o.id === noteOrgId)?.name ?? null,
    [orgs, noteOrgId],
  );

  const { projectOptions, orphanProjectOptions } = useMemo(() => {
    const orgFiltered = noteOrgId
      ? allProjects.filter((p) => p.organization_id === noteOrgId)
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
  }, [allProjects, noteOrgId, scopeFilteredIds]);

  const projectName = useMemo(
    () => allProjects.find((p) => p.id === noteProjectId)?.name ?? null,
    [allProjects, noteProjectId],
  );

  const { taskOptions, orphanTaskOptions } = useMemo(() => {
    const base = (
      noteOrgId ? allTasks.filter((t) => t.organization_id === noteOrgId) : allTasks
    ).filter((t) => t.status !== "completed");
    if (noteProjectId) {
      return {
        taskOptions: base
          .filter((t) => t.project_id === noteProjectId)
          .map((t) => ({ id: t.id, name: t.title, status: t.status })),
        orphanTaskOptions: base
          .filter((t) => t.project_id !== noteProjectId)
          .map((t) => ({ id: t.id, name: t.title, status: t.status })),
      };
    }
    return {
      taskOptions: base.map((t) => ({ id: t.id, name: t.title, status: t.status })),
      orphanTaskOptions: [],
    };
  }, [allTasks, noteOrgId, noteProjectId]);

  const taskName = useMemo(
    () => allTasks.find((t) => t.id === noteTaskId)?.title ?? null,
    [allTasks, noteTaskId],
  );

  // ── Handlers — write to note record ─────────────────────────────────────

  const handleSelectOrg = (id: string | null) => {
    dispatch(setNoteField({ id: noteId, field: "organization_id", value: id }));
    // Cascade: clear project and task when org changes
    if (id !== noteOrgId) {
      dispatch(setNoteField({ id: noteId, field: "project_id", value: null }));
      dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
    }
  };

  const handleSelectScope = (typeId: string, scopeId: string | null) => {
    const currentIds = new Set(noteScopeIds);
    // Remove any existing scope from this type
    const scopesOfType = allScopes
      .filter((s) => s.scope_type_id === typeId)
      .map((s) => s.id);
    scopesOfType.forEach((sid) => currentIds.delete(sid));
    // Add the new one
    if (scopeId) currentIds.add(scopeId);
    dispatch(
      setEntityScopes({
        entity_type: "note",
        entity_id: noteId,
        scope_ids: Array.from(currentIds),
      }),
    );
  };

  const handleSelectProject = (id: string | null) => {
    dispatch(setNoteField({ id: noteId, field: "project_id", value: id }));
    // Cascade: clear task when project changes
    if (id !== noteProjectId) {
      dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
    }
  };

  const handleSelectTask = (id: string | null) => {
    // If task belongs to a project we don't have set, auto-set it
    const task = allTasks.find((t) => t.id === id);
    if (task?.project_id && task.project_id !== noteProjectId) {
      dispatch(setNoteField({ id: noteId, field: "project_id", value: task.project_id }));
    }
    dispatch(setNoteField({ id: noteId, field: "task_id", value: id }));
  };

  const handleClearAll = useCallback(() => {
    dispatch(setNoteField({ id: noteId, field: "organization_id", value: null }));
    dispatch(setNoteField({ id: noteId, field: "project_id", value: null }));
    dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
    if (noteScopeIds.length > 0) {
      dispatch(setEntityScopes({ entity_type: "note", entity_id: noteId, scope_ids: [] }));
    }
  }, [dispatch, noteId, noteScopeIds]);

  const hasAnyContext =
    !!noteOrgId || !!noteProjectId || !!noteTaskId || noteScopeIds.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={cn("py-1", className)}>
      <ContextRow
        icon={Building}
        label="Organization"
        selectedName={orgName}
        selectedId={noteOrgId}
        accentClass="text-violet-500"
        options={orgOptions}
        onSelect={handleSelectOrg}
        emptyText="No organizations found"
      />

      {visibleScopeTypes.map((scopeType) => {
        const selectedScopeId =
          noteScopeIds.find((sid) =>
            allScopes.some((s) => s.id === sid && s.scope_type_id === scopeType.id),
          ) ?? null;
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
        selectedId={noteProjectId}
        accentClass="text-amber-500"
        options={projectOptions}
        orphanOptions={orphanProjectOptions}
        onSelect={handleSelectProject}
        emptyText={
          noteScopeIds.length > 0
            ? "No projects match selected scopes"
            : noteOrgId
              ? "No projects in this organization"
              : "Select an organization first"
        }
      />

      <ContextRow
        icon={ListCheck}
        label="Task"
        selectedName={taskName}
        selectedId={noteTaskId}
        accentClass="text-sky-500"
        options={taskOptions}
        orphanOptions={orphanTaskOptions}
        onSelect={handleSelectTask}
        emptyText={
          noteProjectId
            ? "No open tasks in this project"
            : "Select a project first"
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
  );
}

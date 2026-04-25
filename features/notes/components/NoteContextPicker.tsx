"use client";

// NoteContextPicker — Full hierarchy context assignment for a single note.
// Shows Organization → Scope Types (Clients, Cases, etc.) → Project → Task.
// Uses click-to-expand inline lists (NOT hover flyouts) so it works on
// mobile, inside bottom sheets, and inside tab dropdowns.

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  Building,
  FolderKanban,
  ListCheck,
  ChevronDown,
  Check,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { selectAllScopeTypes, fetchScopeTypes } from "@/features/agent-context/redux/scope/scopeTypesSlice";
import { selectAllScopes, fetchScopes } from "@/features/agent-context/redux/scope/scopesSlice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/features/agent-context/redux/appContextSlice";
import { selectNavOrganizations } from "@/features/agent-context/redux/hierarchySlice";
import { selectAllTasks } from "@/features/agent-context/redux/tasksSlice";
import { selectAllProjects } from "@/features/agent-context/redux/projectsSlice";
import {
  fetchEntityScopes,
  fetchEntitiesByScopes,
  setEntityScopes,
  selectScopeIdsForEntity,
} from "@/features/agent-context/redux/scope/scopeAssignmentsSlice";
import { type PickerOption } from "@/features/agent-context/components/ContextPickerPrimitives";
import { setNoteField } from "../redux/slice";
import { selectNoteById } from "../redux/selectors";
import { DynamicIcon } from "@/components/official/icons/IconResolver";

// ── Inline picker row (click-to-expand, no hover flyout) ─────────────────

function InlinePickerRow({
  icon: Icon,
  label,
  selectedName,
  accentClass,
  selectedId,
  options,
  orphanOptions = [],
  onSelect,
  emptyText = "Nothing found",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selectedName: string | null;
  accentClass: string;
  selectedId: string | null;
  options: PickerOption[];
  orphanOptions?: PickerOption[];
  onSelect: (id: string | null) => void;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const q = search.toLowerCase();
  const filtered = q
    ? options.filter((o) => o.name.toLowerCase().includes(q))
    : options;
  const filteredOrphans = q
    ? orphanOptions.filter((o) => o.name.toLowerCase().includes(q))
    : orphanOptions;

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setExpanded(false);
    setSearch("");
  };

  return (
    <div>
      {/* Row trigger */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors text-left group cursor-pointer"
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-colors",
            selectedName
              ? accentClass
              : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span
          className={cn(
            "text-xs flex-1 truncate",
            selectedName ? accentClass + " font-medium" : "",
          )}
        >
          {selectedName ?? label}
        </span>
        {selectedName && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground flex-shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Expanded inline list */}
      {expanded && (
        <div className="ml-5 mr-1 mb-1 rounded-md border border-border/50 bg-card/80 overflow-hidden">
          {/* Search */}
          {options.length + orphanOptions.length > 5 && (
            <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/40">
              <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50 min-w-0"
                style={{ fontSize: "16px" }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 && filteredOrphans.length === 0 && (
              <div className="px-2 py-2 text-[11px] text-muted-foreground">
                {emptyText}
              </div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  "flex items-center gap-2 w-full text-[11px] px-2 py-1.5 text-left hover:bg-accent/60 transition-colors",
                  selectedId === opt.id && "text-primary",
                )}
              >
                {selectedId === opt.id ? (
                  <Check className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <span className="w-3 flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{opt.name}</span>
                {opt.status && (
                  <span className="text-[9px] text-muted-foreground/50">
                    {opt.status}
                  </span>
                )}
              </button>
            ))}
            {filteredOrphans.length > 0 && (
              <>
                <div className="mx-2 my-0.5 border-t border-border/50" />
                <div className="px-2 py-0.5 text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Other
                </div>
                {filteredOrphans.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      "flex items-center gap-2 w-full text-[11px] px-2 py-1.5 text-left hover:bg-accent/60 transition-colors",
                      selectedId === opt.id && "text-primary",
                    )}
                  >
                    {selectedId === opt.id ? (
                      <Check className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <span className="w-3 flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate">{opt.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NoteContextPicker ────────────────────────────────────────────────────

interface NoteContextPickerProps {
  noteId: string;
  className?: string;
}

export function NoteContextPicker({
  noteId,
  className,
}: NoteContextPickerProps) {
  const dispatch = useAppDispatch();

  // ── Note's current hierarchy context ────────────────────────────────────
  const note = useAppSelector(selectNoteById(noteId));
  const noteOrgId = note?.organization_id ?? null;
  const noteProjectId = note?.project_id ?? null;
  const noteTaskId = note?.task_id ?? null;

  // ── Global context org (fallback for scope types when note has no org) ──
  const globalOrgId = useAppSelector(selectOrganizationId);
  const effectiveOrgId = noteOrgId ?? globalOrgId;

  // ── Available data ──────────────────────────────────────────────────────
  const orgs = useAppSelector(selectNavOrganizations) ?? [];
  const allProjects = useAppSelector(selectAllProjects);
  const allTasks = useAppSelector(selectAllTasks);
  const allScopeTypes = useAppSelector(selectAllScopeTypes);
  const allScopes = useAppSelector(selectAllScopes);

  // ── Fetch note's scope assignments on mount ─────────────────────────────
  const fetchedScopesRef = useRef(false);
  useEffect(() => {
    if (fetchedScopesRef.current) return;
    fetchedScopesRef.current = true;
    dispatch(fetchEntityScopes({ entity_type: "note", entity_id: noteId }));
  }, [dispatch, noteId]);

  // ── Ensure scope types + scopes are loaded for effective org ────────────
  const lastOrgFetched = useRef<string | null>(null);
  useEffect(() => {
    if (!effectiveOrgId || effectiveOrgId === lastOrgFetched.current) return;
    lastOrgFetched.current = effectiveOrgId;
    dispatch(fetchScopeTypes(effectiveOrgId));
    dispatch(fetchScopes({ org_id: effectiveOrgId }));
  }, [dispatch, effectiveOrgId]);

  // ── Note's current scope assignment IDs ─────────────────────────────────
  const noteScopeIds = useAppSelector((state) =>
    selectScopeIdsForEntity(state, "note", noteId),
  );

  // ── Scope-filtered project IDs ──────────────────────────────────────────
  const [scopeFilteredIds, setScopeFilteredIds] = useState<Set<string> | null>(
    null,
  );
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

  // ── Visible scope types ─────────────────────────────────────────────────
  const visibleScopeTypes = useMemo(
    () =>
      effectiveOrgId
        ? allScopeTypes.filter((t) => t.organization_id === effectiveOrgId)
        : allScopeTypes,
    [allScopeTypes, effectiveOrgId],
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
    const orgFiltered = effectiveOrgId
      ? allProjects.filter((p) => p.organization_id === effectiveOrgId)
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
  }, [allProjects, effectiveOrgId, scopeFilteredIds]);

  const projectName = useMemo(
    () => allProjects.find((p) => p.id === noteProjectId)?.name ?? null,
    [allProjects, noteProjectId],
  );

  const { taskOptions, orphanTaskOptions } = useMemo(() => {
    const base = (
      effectiveOrgId
        ? allTasks.filter((t) => t.organization_id === effectiveOrgId)
        : allTasks
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
      taskOptions: base.map((t) => ({
        id: t.id,
        name: t.title,
        status: t.status,
      })),
      orphanTaskOptions: [],
    };
  }, [allTasks, effectiveOrgId, noteProjectId]);

  const taskName = useMemo(
    () => allTasks.find((t) => t.id === noteTaskId)?.title ?? null,
    [allTasks, noteTaskId],
  );

  // ── Handlers — write to note record + scope assignments ─────────────────

  const handleSelectOrg = (id: string | null) => {
    dispatch(setNoteField({ id: noteId, field: "organization_id", value: id }));
    if (id !== noteOrgId) {
      dispatch(setNoteField({ id: noteId, field: "project_id", value: null }));
      dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
      if (id) {
        dispatch(fetchScopeTypes(id));
        dispatch(fetchScopes({ org_id: id }));
      }
    }
  };

  const handleSelectScope = (typeId: string, scopeId: string | null) => {
    const currentIds = new Set(noteScopeIds);
    const scopesOfType = allScopes
      .filter((s) => s.scope_type_id === typeId)
      .map((s) => s.id);
    scopesOfType.forEach((sid) => currentIds.delete(sid));
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
    if (id !== noteProjectId) {
      dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
    }
  };

  const handleSelectTask = (id: string | null) => {
    const task = allTasks.find((t) => t.id === id);
    if (task?.project_id && task.project_id !== noteProjectId) {
      dispatch(
        setNoteField({
          id: noteId,
          field: "project_id",
          value: task.project_id,
        }),
      );
    }
    dispatch(setNoteField({ id: noteId, field: "task_id", value: id }));
  };

  const handleClearAll = useCallback(() => {
    dispatch(
      setNoteField({ id: noteId, field: "organization_id", value: null }),
    );
    dispatch(setNoteField({ id: noteId, field: "project_id", value: null }));
    dispatch(setNoteField({ id: noteId, field: "task_id", value: null }));
    if (noteScopeIds.length > 0) {
      dispatch(
        setEntityScopes({
          entity_type: "note",
          entity_id: noteId,
          scope_ids: [],
        }),
      );
    }
  }, [dispatch, noteId, noteScopeIds]);

  const hasAnyContext =
    !!noteOrgId || !!noteProjectId || !!noteTaskId || noteScopeIds.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={cn("py-1", className)}>
      <InlinePickerRow
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
            allScopes.some(
              (s) => s.id === sid && s.scope_type_id === scopeType.id,
            ),
          ) ?? null;
        const selectedScope = selectedScopeId
          ? allScopes.find((s) => s.id === selectedScopeId)
          : null;
        const scopeOptions: PickerOption[] = allScopes
          .filter((s) => s.scope_type_id === scopeType.id)
          .map((s) => ({ id: s.id, name: s.name }));
        return (
          <InlinePickerRow
            key={scopeType.id}
            icon={(props) => <DynamicIcon name={scopeType.icon} {...props} />}
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
        <div className="mx-2 my-0.5 border-t border-border/40" />
      )}

      <InlinePickerRow
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
            : effectiveOrgId
              ? "No projects in this organization"
              : "Select an organization first"
        }
      />

      <InlinePickerRow
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
            className="flex items-center gap-1.5 w-full px-2 py-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors rounded-md hover:bg-accent/30"
          >
            <X className="h-2.5 w-2.5" />
            Clear all context
          </button>
        </div>
      )}
    </div>
  );
}

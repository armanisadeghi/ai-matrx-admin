"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  Building,
  FolderKanban,
  ListCheck,
  ChevronRight,
  Check,
  X,
  Search,
  Circle,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

// ─── Lucide icon resolver ─────────────────────────────────────────────────────

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  const pascalName = name
    .split(/[-_\s]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Icon = icons[pascalName] ?? Circle;
  return <Icon className={className} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickerOption {
  id: string;
  name: string;
  status?: string | null;
}

// ─── Searchable dropdown content ─────────────────────────────────────────────
// Renders inside DropdownMenuContent — keeps the original side="right" positioning.

function SearchableList({
  options,
  orphanOptions = [],
  selectedId,
  onSelect,
  placeholder,
  emptyText = "Nothing found",
}: {
  options: PickerOption[];
  orphanOptions?: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placeholder: string;
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // autofocus when mounted
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const q = search.toLowerCase();
  const filtered = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  const filteredOrphans = q
    ? orphanOptions.filter((o) => o.name.toLowerCase().includes(q))
    : orphanOptions;

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border">
        <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50 min-w-0"
          onKeyDown={(e) => e.stopPropagation()} // prevent DropdownMenu key handling
        />
        {search && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setSearch(""); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-52 overflow-y-auto">
        {filtered.length === 0 && filteredOrphans.length === 0 && (
          <div className="px-2 py-2 text-[11px] text-muted-foreground">{emptyText}</div>
        )}

        {filtered.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            className={cn(
              "flex items-center gap-2 text-[11px] px-2 py-1.5 cursor-pointer",
              selectedId === opt.id && "text-primary",
            )}
            onSelect={() => onSelect(opt.id)}
          >
            {selectedId === opt.id ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <span className="w-3 flex-shrink-0" />
            )}
            <span className="flex-1 truncate">{opt.name}</span>
            {opt.status && (
              <span className="text-[9px] text-muted-foreground/50">{opt.status}</span>
            )}
          </DropdownMenuItem>
        ))}

        {filteredOrphans.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-0.5 text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
              Unassociated
            </div>
            {filteredOrphans.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                className={cn(
                  "flex items-center gap-2 text-[11px] px-2 py-1.5 cursor-pointer",
                  selectedId === opt.id && "text-primary",
                )}
                onSelect={() => onSelect(opt.id)}
              >
                {selectedId === opt.id ? (
                  <Check className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <span className="w-3 flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{opt.name}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </div>

      {/* Clear */}
      {selectedId && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-1.5 text-[11px] px-2 py-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
            onSelect={() => onSelect(null)}
          >
            <X className="h-3 w-3" />
            Clear selection
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

// ─── Single context row — exact original trigger styling ─────────────────────

function ContextRow({
  icon: Icon,
  label,
  selectedName,
  accentClass,
  selectedId,
  options,
  orphanOptions,
  onSelect,
  placeholder,
  emptyText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selectedName: string | null;
  accentClass: string;
  selectedId: string | null;
  options: PickerOption[];
  orphanOptions?: PickerOption[];
  onSelect: (id: string | null) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* ── exact original trigger button style ── */}
        <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors text-left group">
          <Icon
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0 transition-colors",
              selectedName ? accentClass : "text-muted-foreground group-hover:text-foreground",
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
          {selectedName ? (
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSelect(null);
              }}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </button>
      </DropdownMenuTrigger>

      {/* ── exact original content positioning ── */}
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-52 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SearchableList
          options={options}
          orphanOptions={orphanOptions}
          selectedId={selectedId}
          onSelect={onSelect}
          placeholder={placeholder ?? `Search ${label.toLowerCase()}…`}
          emptyText={emptyText}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function DirectContextSelection() {
  const dispatch = useAppDispatch();

  // ── Redux context state ────────────────────────────────────────────────────
  const orgId = useAppSelector(selectOrganizationId);
  const orgName = useAppSelector(selectOrganizationName);
  const projectId = useAppSelector(selectProjectId);
  const projectName = useAppSelector(selectProjectName);
  const taskId = useAppSelector(selectTaskId);
  const taskName = useAppSelector(selectTaskName);
  const scopeSelections = useAppSelector(selectScopeSelectionsContext);

  // ── Raw data ───────────────────────────────────────────────────────────────
  const { isLoading } = useNavTree();
  const orgsFromContext = useAppSelector(selectNavOrganizations);
  const allProjects = useAppSelector(selectAllProjects);
  const allTasks = useAppSelector(selectAllTasks);
  const allScopeTypes = useAppSelector(selectAllScopeTypes);
  const allScopes = useAppSelector(selectAllScopes);

  // ── Scope-filtered project IDs ─────────────────────────────────────────────
  const [scopeFilteredIds, setScopeFilteredIds] = useState<Set<string> | null>(null);
  const activeScopeIds = Object.values(scopeSelections).filter(Boolean) as string[];
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
      .then((entities) => setScopeFilteredIds(new Set(entities.map((e) => e.entity_id))))
      .catch(() => setScopeFilteredIds(null));
  }, [dispatch, activeScopeKey]);

  // ── Scope types to render (all types; filtered to org when one is selected) ─
  const visibleScopeTypes = useMemo(
    () => (orgId ? allScopeTypes.filter((t) => t.organization_id === orgId) : allScopeTypes),
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
        ? orgFiltered.filter((p) => !scopeFilteredIds.has(p.id)).map((p) => ({ id: p.id, name: p.name }))
        : [];
    return {
      projectOptions: scopeFiltered.map((p) => ({ id: p.id, name: p.name })),
      orphanProjectOptions: orphans,
    };
  }, [allProjects, orgId, scopeFilteredIds]);

  const { taskOptions, orphanTaskOptions } = useMemo(() => {
    const base = (orgId ? allTasks.filter((t) => t.organization_id === orgId) : allTasks).filter(
      (t) => t.status !== "completed",
    );
    if (projectId) {
      return {
        taskOptions: base.filter((t) => t.project_id === projectId).map((t) => ({ id: t.id, name: t.title, status: t.status })),
        orphanTaskOptions: base.filter((t) => t.project_id === null).map((t) => ({ id: t.id, name: t.title, status: t.status })),
      };
    }
    return {
      taskOptions: base.filter((t) => t.project_id !== null).map((t) => ({ id: t.id, name: t.title, status: t.status })),
      orphanTaskOptions: base.filter((t) => t.project_id === null).map((t) => ({ id: t.id, name: t.title, status: t.status })),
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

  const handleClearAll = () => {
    setScopeFilteredIds(null);
    dispatch(clearContext());
  };

  const hasAnyContext = !!orgId || !!projectId || !!taskId || activeScopeIds.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-1.5 py-1 border-b border-border">

      {/* ── SCOPE ROWS — first-class, always visible ── */}
      {isLoading && visibleScopeTypes.length === 0 && (
        // Skeleton while loading
        <>
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5">
              <div className="h-3.5 w-3.5 rounded bg-muted animate-pulse flex-shrink-0" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </>
      )}

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

      {/* Thin divider between scopes and structural context */}
      {visibleScopeTypes.length > 0 && (
        <div className="mx-2.5 my-0.5 border-t border-border/40" />
      )}

      {/* ── ORGANIZATION ── */}
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

      {/* ── PROJECT ── */}
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

      {/* ── TASK ── */}
      <ContextRow
        icon={ListCheck}
        label="Tasks"
        selectedName={taskName}
        selectedId={taskId}
        accentClass="text-sky-500"
        options={taskOptions}
        orphanOptions={orphanTaskOptions}
        onSelect={handleSelectTask}
        emptyText={projectId ? "No open tasks in this project" : "Search tasks by name"}
      />

      {/* Clear all — only when something is set */}
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

export default DirectContextSelection;

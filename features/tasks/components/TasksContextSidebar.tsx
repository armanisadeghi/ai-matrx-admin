"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  X,
  Inbox,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Eye,
  EyeOff,
  Building,
  FolderKanban,
  ListChecks,
  Flag,
  CalendarClock,
  CircleDashed,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import * as icons from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectProjects,
  selectValidProjectIds,
  selectSmartViewCounts,
} from "@/features/tasks/redux/selectors";
import { TASK_GROUP_BY_LABELS } from "@/features/tasks/constants/groupBy";
import {
  SMART_VIEWS,
  SMART_VIEW_BY_KEY,
} from "@/features/tasks/constants/smartViews";
import {
  selectSearchQuery,
  selectShowCompleted,
  selectSmartView,
  selectGroupBy,
  selectSortBy,
  selectSortOrder,
  selectActiveProject,
  selectShowAllProjects,
  setSearchQuery,
  setSmartView,
  setShowCompleted,
  setFilterOrgId,
  selectFilterOrgId,
  setGroupBy,
  setSortBy,
  toggleSortOrder,
  setActiveProject,
  setShowAllProjects,
  type TaskGroupBy,
} from "@/features/tasks/redux/taskUiSlice";
import type { TaskSortField } from "@/features/tasks/types/sort";
import { TASK_SORT_OPTIONS } from "@/features/tasks/types/sort";
// Organization here is an on-page VIEW filter (taskUiSlice.filterOrgId, default All) — it never
// reads or writes the header's selected organization. Scopes remain the Surface A active-context
// picker (global writer below).
// eslint-disable-next-line no-restricted-syntax -- Surface A: tasks active-context picker
import {
  selectScopeSelectionsContext,
  addActiveScope,
  removeActiveScope,
} from "@/lib/redux/slices/appContextSlice";
import {
  selectAllScopeTypesFlat,
  selectAllScopesFlat,
  selectOrganizationsList,
} from "@/features/scopes/redux/selectors/tree";
import {
  Button,
  Chip,
  ChipSet,
  type ChipTone,
  DisclosureHeader,
  SearchField,
  SettingRow,
  Switch,
  Tile,
} from "@ai-matrx/design-system/controls";
import { cn } from "@/utils/cn";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { TASKS_CONTEXT_MENU_PROPS } from "@/features/tasks/agent-context/buildTasksContextData";
import { useTasksListSurfaceScope } from "@/features/tasks/components/TasksListSurfaceRuntime";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";

type LucideIcon = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return CircleDashed;
  const pascal = name
    .split(/[-_\s]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  // MATRX-EXCEPTION: dynamic Lucide icon-by-name lookup — `import * as icons`
  // is the full module namespace (icon components + non-component exports),
  // so there is no narrower structural type to guard against; same pattern
  // used codebase-wide (e.g. features/scopes/utils/resolveIcon.ts).
  const Icon = (icons as unknown as Record<string, LucideIcon>)[pascal];
  return Icon ?? CircleDashed;
}

const GROUP_MODES: { mode: TaskGroupBy; label: string; icon: LucideIcon }[] = [
  { mode: "project", label: TASK_GROUP_BY_LABELS.project, icon: FolderKanban },
  { mode: "scope", label: TASK_GROUP_BY_LABELS.scope, icon: Layers },
  { mode: "priority", label: TASK_GROUP_BY_LABELS.priority, icon: Flag },
  { mode: "status", label: TASK_GROUP_BY_LABELS.status, icon: ListChecks },
  { mode: "dueDate", label: TASK_GROUP_BY_LABELS.dueDate, icon: CalendarClock },
  { mode: "none", label: TASK_GROUP_BY_LABELS.none, icon: Inbox },
];

export default function TasksContextSidebar() {
  const dispatch = useAppDispatch();
  const getSurfaceScope = useTasksListSurfaceScope();

  // Search / views / display
  const searchQuery = useAppSelector(selectSearchQuery);
  const smartView = useAppSelector(selectSmartView);
  const smartViewCounts = useAppSelector(selectSmartViewCounts);
  const showCompleted = useAppSelector(selectShowCompleted);

  // Context (all orgs/scopes/projects, unfiltered)
  const orgId = useAppSelector(selectFilterOrgId);
  const orgs = useAppSelector(selectOrganizationsList);
  const scopeSelections = useAppSelector(selectScopeSelectionsContext);
  const allScopeTypes = useAppSelector(selectAllScopeTypesFlat);
  const allScopes = useAppSelector(selectAllScopesFlat);

  // Derived: which projects are valid under current filter (null = no filter)
  const validProjectIds = useAppSelector(selectValidProjectIds);

  // Groups / sort / projects (UI state)
  const groupBy = useAppSelector(selectGroupBy);
  const sortBy = useAppSelector(selectSortBy);
  const sortOrder = useAppSelector(selectSortOrder);
  const activeProject = useAppSelector(selectActiveProject);
  const showAllProjects = useAppSelector(selectShowAllProjects);
  const derivedProjects = useAppSelector(selectProjects);

  // Scope types are dimmed when another org is selected (not applicable)
  // Scopes are dimmed when org selected AND their type belongs to another org
  // Projects are dimmed when they don't appear in validProjectIds

  // Group scope types by org for nicer display when no org selected and
  // multiple orgs present. If one org is selected, show its types only as
  // active; others appear dimmed.
  const scopeTypesOrdered = useMemo(() => {
    const arr = [...allScopeTypes].sort((a, b) => {
      // Put current-org types first
      if (orgId) {
        if (a.organization_id === orgId && b.organization_id !== orgId)
          return -1;
        if (b.organization_id === orgId && a.organization_id !== orgId)
          return 1;
      }
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    return arr;
  }, [allScopeTypes, orgId]);

  // Scopes grouped by scope type id
  const scopesByType = useMemo(() => {
    const map = new Map<string, typeof allScopes>();
    for (const t of allScopeTypes) {
      map.set(
        t.id,
        allScopes.filter((s) => s.scope_type_id === t.id),
      );
    }
    return map;
  }, [allScopeTypes, allScopes]);

  // MULTI-scope active context (checkbox semantics — any number of scopes per
  // type; one-per-type radio semantics is a known regression pattern).
  const selectedScopeIds = useMemo(
    () =>
      new Set(Object.values(scopeSelections).filter((v): v is string => !!v)),
    [scopeSelections],
  );

  const toggleScope = (scopeId: string) => {
    dispatch(
      selectedScopeIds.has(scopeId)
        ? removeActiveScope(scopeId)
        : addActiveScope(scopeId),
    );
  };

  const clearScopesOfType = (typeScopeIds: string[]) => {
    for (const id of typeScopeIds) {
      if (selectedScopeIds.has(id)) dispatch(removeActiveScope(id));
    }
  };

  // The organization filter lives in the URL (`?org_filter=`, never `?org=` —
  // that key SWITCHES the active org). Every visit starts from the URL, so a
  // bare /tasks is always "All organizations".
  const searchParams = useSearchParams();
  const urlOrgFilter = searchParams.get("org_filter");
  useEffect(() => {
    dispatch(setFilterOrgId(urlOrgFilter || null));
  }, [dispatch, urlOrgFilter]);

  const handleSelectOrg = (id: string | null) => {
    dispatch(setFilterOrgId(id));
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("org_filter", id);
    else url.searchParams.delete("org_filter");
    replaceAddressWithoutNavigating(url);
  };

  const activeGroupLabel =
    TASK_GROUP_BY_LABELS[groupBy] ?? TASK_GROUP_BY_LABELS.none;
  const activeSortLabel =
    TASK_SORT_OPTIONS.find((o) => o.field === sortBy)?.label ?? "Last Updated";
  const activeOrgName = orgId
    ? ((orgs ?? []).find((o) => o.id === orgId)?.name ?? "Organization")
    : "All Organizations";
  const activeProjectName = showAllProjects
    ? "All Projects"
    : (derivedProjects.find((p) => p.id === activeProject)?.name ??
      "All Projects");

  return (
    <NonEditableContextMenu
      sourceFeature={TASKS_CONTEXT_MENU_PROPS.sourceFeature}
      surfaceName={TASKS_CONTEXT_MENU_PROPS.surfaceName}
      getApplicationScope={getSurfaceScope}
    >
      <div
        className="flex flex-col h-full min-h-0 bg-card"
        data-surface-value="project_list"
      >
        {/* Search — page title lives in the shell header (PageHeader) */}
        <div
          className="shrink-0 px-2 pt-2 pb-1"
          data-surface-value="search_query"
        >
          <SearchField
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            end={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => dispatch(setSearchQuery(""))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear task search"
                >
                  <X className="size-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* View — group, sort, show completed (pinned to top) */}
          <CollapsibleSidebarSection
            icon={SlidersHorizontal}
            title="View"
            defaultOpen
            summary={`${activeGroupLabel} · ${activeSortLabel} ${sortOrder === "desc" ? "↓" : "↑"}${showCompleted ? " · +done" : ""}`}
          >
            <div className="flex flex-col gap-1">
              <span className="type-label">Group</span>
              <ChipSet aria-label="Group tasks by">
                {GROUP_MODES.map((m) => (
                  <Chip
                    key={m.mode}
                    label={m.label}
                    pressed={groupBy === m.mode}
                    asChild
                  >
                    <button type="button" onClick={() => dispatch(setGroupBy(m.mode))} />
                  </Chip>
                ))}
              </ChipSet>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <span className="type-label">Sort</span>
              <ChipSet aria-label="Sort tasks by">
                {TASK_SORT_OPTIONS.map((o) => (
                  <Chip
                    key={o.field}
                    label={o.label}
                    pressed={sortBy === o.field}
                    asChild
                  >
                    <button type="button" onClick={() => dispatch(setSortBy(o.field as TaskSortField))} />
                  </Chip>
                ))}
                <Chip
                  label={sortOrder === "desc" ? "Newest first" : "Oldest first"}
                  icon={<ArrowUpDown />}
                  asChild
                >
                  <button
                    type="button"
                    onClick={() => dispatch(toggleSortOrder())}
                    aria-label={sortOrder === "desc" ? "Descending — switch to ascending" : "Ascending — switch to descending"}
                  />
                </Chip>
              </ChipSet>
            </div>

            <SettingRow
              label={
                <span className="flex items-center gap-1.5">
                  {showCompleted ? (
                    <Eye className="size-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" />
                  )}
                  Show completed
                </span>
              }
              className="mt-1.5"
            >
              <Switch
                checked={showCompleted}
                onCheckedChange={(v) => dispatch(setShowCompleted(!!v))}
                aria-label="Show completed"
              />
            </SettingRow>
          </CollapsibleSidebarSection>

          {/* Smart views — Inbox / Today / Upcoming / Overdue / Assigned / Created / Completed */}
          <CollapsibleSidebarSection
            icon={Inbox}
            title="Views"
            defaultOpen
            summary={SMART_VIEW_BY_KEY[smartView]?.label ?? "All tasks"}
          >
            <div className="flex flex-col">
              {SMART_VIEWS.map((v) => {
                const Icon = v.icon;
                const count = smartViewCounts[v.key] ?? 0;
                return (
                  <div key={v.key} title={v.description}>
                    <Tile
                      variant="quiet"
                      dense
                      icon={<Icon />}
                      title={v.label}
                      selected={smartView === v.key}
                      onClick={() => dispatch(setSmartView(v.key))}
                      end={
                        <span
                          className={cn(
                            "type-meta tabular-nums",
                            v.key === "overdue" && count > 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {count}
                        </span>
                      }
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleSidebarSection>

          {/* Context: Organizations */}
          <CollapsibleSidebarSection
            icon={Building}
            glyphTone="violet"
            title="Organization"
            summary={activeOrgName}
            headerAction={
              orgId ? (
                <Button
                  type="button"
                  variant="quiet"
                  icon={<X />}
                  onClick={() => handleSelectOrg(null)}
                  title="Show all organizations"
                  aria-label="Show all organizations"
                />
              ) : undefined
            }
          >
            <div className="space-y-0.5">
              <AllRow
                label="All Organizations"
                active={!orgId}
                count={(orgs ?? []).length}
                onClick={() => handleSelectOrg(null)}
              />
              {(orgs ?? []).map((o) => (
                <ContextRow
                  key={o.id}
                  label={o.name}
                  active={orgId === o.id}
                  dimmed={
                    false /* orgs are never dimmed — picking one is always valid */
                  }
                  onClick={() => handleSelectOrg(orgId === o.id ? null : o.id)}
                />
              ))}
            </div>
          </CollapsibleSidebarSection>

          {/* Context: each scope type with explicit clickable scopes */}
          {scopeTypesOrdered.map((type) => {
            const Icon = resolveIcon(type.icon);
            const opts = scopesByType.get(type.id) ?? [];
            const selectedOfType = opts.filter((s) =>
              selectedScopeIds.has(s.id),
            );
            const typeBelongsToActiveOrg =
              !orgId || type.organization_id === orgId;

            const selectedScopeName =
              selectedOfType.length > 0
                ? selectedOfType.map((s) => s.name).join(", ")
                : `All ${type.label_plural}`;

            return (
              <CollapsibleSidebarSection
                key={type.id}
                icon={Icon}
                iconStyle={type.color ? { color: type.color } : undefined}
                title={type.label_plural}
                titleMuted={!typeBelongsToActiveOrg}
                summary={selectedScopeName}
                headerAction={
                  selectedOfType.length > 0 ? (
                    <Button
                      type="button"
                      variant="quiet"
                      icon={<X />}
                      onClick={() => clearScopesOfType(opts.map((s) => s.id))}
                      title={`Show all ${type.label_plural.toLowerCase()}`}
                      aria-label={`Show all ${type.label_plural.toLowerCase()}`}
                    />
                  ) : undefined
                }
              >
                <div className="space-y-0.5">
                  <AllRow
                    label={`All ${type.label_plural}`}
                    active={selectedOfType.length === 0}
                    count={opts.length}
                    dimmed={!typeBelongsToActiveOrg}
                    onClick={() =>
                      typeBelongsToActiveOrg &&
                      clearScopesOfType(opts.map((s) => s.id))
                    }
                  />
                  {opts.map((scope) => {
                    // A scope is dimmed if its org doesn't match the current
                    // active org selection. If no org selected, all scopes are
                    // active.
                    const dimmed = !!orgId && scope.organization_id !== orgId;
                    const isActive = selectedScopeIds.has(scope.id);
                    return (
                      <ContextRow
                        key={scope.id}
                        label={scope.name}
                        active={isActive}
                        dimmed={dimmed}
                        dotColor={type.color}
                        onClick={() => !dimmed && toggleScope(scope.id)}
                      />
                    );
                  })}
                </div>
              </CollapsibleSidebarSection>
            );
          })}

          {/* Projects — always show all, dim those that don't match */}
          <CollapsibleSidebarSection
            icon={FolderKanban}
            glyphTone="amber"
            title="Projects"
            summary={activeProjectName}
          >
            <div className="space-y-0.5">
              <AllRow
                label="All Projects"
                active={showAllProjects}
                count={derivedProjects.reduce((s, p) => s + p.tasks.length, 0)}
                onClick={() => {
                  dispatch(setShowAllProjects(true));
                  dispatch(setActiveProject(null));
                }}
              />
              {derivedProjects.map((p) => {
                const isActive = activeProject === p.id && !showAllProjects;
                const dimmed =
                  validProjectIds !== null && !validProjectIds.has(p.id);
                return (
                  <ContextRow
                    key={p.id}
                    label={p.name}
                    active={isActive}
                    dimmed={dimmed}
                    count={p.tasks.length}
                    onClick={() => {
                      if (dimmed) return;
                      dispatch(setActiveProject(p.id));
                      dispatch(setShowAllProjects(false));
                    }}
                  />
                );
              })}
            </div>
          </CollapsibleSidebarSection>
        </div>
      </div>
    </NonEditableContextMenu>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function CollapsibleSidebarSection({
  icon: Icon,
  iconStyle,
  glyphTone,
  title,
  titleMuted,
  summary,
  headerAction,
  defaultOpen = false,
  children,
}: {
  icon: LucideIcon;
  iconStyle?: React.CSSProperties;
  glyphTone?: ChipTone;
  title: string;
  titleMuted?: boolean;
  summary: React.ReactNode;
  headerAction?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="px-2 py-1 border-t border-border first:border-t-0">
      <div className="flex items-center gap-0.5">
        <div className={cn("flex-1 min-w-0", titleMuted && "opacity-40")}>
          <DisclosureHeader
            open={open}
            onClick={() => setOpen((v) => !v)}
            chevron="end"
            icon={<Icon style={iconStyle} />}
            glyphTone={glyphTone}
            title={title}
            end={
              !open ? (
                <span className="type-meta text-foreground truncate max-w-15 min-w-0">
                  {summary}
                </span>
              ) : undefined
            }
          />
        </div>
        {headerAction}
      </div>
      {open && <div className="pb-0.5">{children}</div>}
    </section>
  );
}

function AllRow({
  label,
  active,
  count,
  dimmed,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  dimmed?: boolean;
  onClick: () => void;
}) {
  return (
    <ContextRow
      label={label}
      active={active}
      dimmed={dimmed}
      onClick={onClick}
      count={count}
    />
  );
}

function ContextRow({
  label,
  active,
  dimmed,
  onClick,
  count,
  dotColor,
}: {
  label: string;
  active: boolean;
  dimmed?: boolean;
  onClick: () => void;
  count?: number;
  dotColor?: string;
}) {
  return (
    <Tile
      variant="quiet"
      dense
      selected={active}
      disabled={dimmed}
      onClick={onClick}
      icon={
        <span
          className="size-1.5 rounded-full"
          style={{
            backgroundColor: dotColor ?? "currentColor",
            opacity: dimmed ? 0.3 : active ? 1 : 0.5,
          }}
        />
      }
      title={label}
      end={
        typeof count === "number" ? (
          <span className="type-meta tabular-nums text-muted-foreground">
            {count}
          </span>
        ) : undefined
      }
    />
  );
}

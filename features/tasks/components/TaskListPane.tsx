"use client";

import { useId, useMemo, useState } from "react";
import {
  Calendar,
  CircleDashed,
  CheckCircle2,
  Folder,
  LayoutGrid,
  List,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectGroupedFilteredTasks,
  selectProjects,
} from "@/features/tasks/redux/selectors";
import {
  selectSelectedTaskId,
  selectIsCreatingTask,
  selectNewTaskTitle,
  selectActiveProject,
  selectTasksLoading,
  selectGroupBy,
  selectSmartView,
  selectSearchQuery,
  selectShowCompleted,
  setSelectedTaskId,
  setNewTaskTitle,
  selectFilterOrgId,
  setFilterOrgId,
} from "@/features/tasks/redux/taskUiSlice";
import { getTaskGroupByBanner } from "@/features/tasks/constants/groupBy";
import { selectAllScopesFlat } from "@/features/scopes/redux/selectors/tree";
import {
  createTaskThunk,
  toggleTaskCompleteThunk,
} from "@/features/tasks/redux/thunks";
import {
  selectOrganizationId,
  selectScopeSelectionsContext,
} from "@/lib/redux/slices/appContextSlice";
import { ScopeTagsDisplay } from "@/features/agent-context/components/ScopeTagsDisplay";
import {
  DisclosureHeader,
  EmptyState,
  RegionSkeleton,
  SegmentedControl,
} from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { cn } from "@/utils/cn";
import type { TaskWithProject } from "@/features/tasks/types";
import TasksTableView from "@/features/tasks/components/TasksTableView";
import { TaskProvenanceChip } from "@/features/tasks/components/TaskProvenanceChip";
import { useRefocusInputAfterAsync } from "@/features/tasks/hooks/useRefocusInputAfterAsync";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { Button } from "@/components/ui/button";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { formatDateOnly } from "@ai-matrx/kit/dates";
import {
  buildTaskListPayload,
  buildTaskRowPayload,
  taskListHuman,
  taskListKpis,
  taskRow,
  taskSummary,
  type TaskListKpis,
  type TaskListView,
} from "@/features/tasks/lib/copy";
import {
  useListViewPrefs,
  type LegacyListViewImport,
} from "@/lib/list-views/useListViewPrefs";
import type { ListViewPrefs } from "@/lib/redux/preferences/userPreferencesSlice";
import {
  TASK_ROW_DOM_ATTR,
  TASK_TITLE_DOM_ATTR,
  TasksListContextMenu,
} from "@/features/tasks/components/TasksListContextMenu";
import { toast } from "@/lib/toast";
import { ReadFailure } from "@ai-matrx/design-system";
import { UntrustedCount } from "@ai-matrx/design-system";
import { useTasksRead } from "@/features/tasks/hooks/useTasksRead";

/**
 * Style prefs for this pane (synced across devices via `userPreferences`).
 * The grouped task list is the canonical `rows` view; table is the alternate.
 */
const TASK_LIST_VIEW_DEFAULTS: Partial<ListViewPrefs> = { view: "rows" };

/**
 * One-time adoption of the device-local key. Note the vocabulary change: this
 * pane called its non-table mode "list", which is `rows` on the shared axes —
 * a raw pass-through would have written a value no toggle here matches.
 */
const TASK_LIST_LEGACY_VIEW: LegacyListViewImport = {
  key: "tasks-list-view",
  map: (raw) => {
    if (raw === "table") return { view: "table" };
    if (raw === "list") return { view: "rows" };
    return null;
  },
};

export default function TaskListPane() {
  const dispatch = useAppDispatch();
  const copySourceId = useId();
  const groups = useAppSelector(selectGroupedFilteredTasks);
  const selectedTaskId = useAppSelector(selectSelectedTaskId);
  const isCreatingTask = useAppSelector(selectIsCreatingTask);
  const {
    inputRef: quickAddInputRef,
    scheduleRefocus: scheduleQuickAddRefocus,
  } = useRefocusInputAfterAsync(isCreatingTask);
  const newTaskTitle = useAppSelector(selectNewTaskTitle);
  const activeProject = useAppSelector(selectActiveProject);
  const projects = useAppSelector(selectProjects);
  const loading = useAppSelector(selectTasksLoading);
  const tasksRead = useTasksRead();
  const groupBy = useAppSelector(selectGroupBy);
  const smartView = useAppSelector(selectSmartView);
  const searchQuery = useAppSelector(selectSearchQuery);
  const showCompleted = useAppSelector(selectShowCompleted);
  const groupByBanner = getTaskGroupByBanner(groupBy);
  const isGrouped = groupBy !== "none";
  const orgId = useAppSelector(selectOrganizationId);
  const filterOrgId = useAppSelector(selectFilterOrgId);
  const scopeSelections = useAppSelector(selectScopeSelectionsContext);
  // Names for scopes of EVERY organization: the list shows tasks across all of the person's
  // organizations, so a chip's name never depends on the header's selected one.
  const allScopes = useAppSelector(selectAllScopesFlat);
  const scopeNameMap = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of allScopes) out[s.id] = s.name;
    return out;
  }, [allScopes]);

  const { prefs, setView } = useListViewPrefs(
    "tasks-list-pane",
    TASK_LIST_VIEW_DEFAULTS,
    TASK_LIST_LEGACY_VIEW,
  );
  const isTableView = prefs.view === "table";

  const activeGroupKey = useMemo(() => {
    if (!selectedTaskId) return null;
    for (const group of groups) {
      if (group.tasks.some((task) => task.id === selectedTaskId)) {
        return group.key;
      }
    }
    return null;
  }, [groups, selectedTaskId]);

  const defaultCollapsed = useMemo(() => {
    const next = new Set(groups.map((group) => group.key));
    if (activeGroupKey) next.delete(activeGroupKey);
    return next;
  }, [groups, activeGroupKey]);

  const collapseStateKey = `${selectedTaskId ?? "none"}:${groupBy}`;
  const [collapsedOverride, setCollapsedOverride] = useState<{
    key: string;
    groups: Set<string>;
  }>();

  const collapsed =
    collapsedOverride?.key === collapseStateKey
      ? collapsedOverride.groups
      : defaultCollapsed;

  const totalCount = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  // Copy/export cover every task the current view produces — ALL groups
  // flattened, never the expanded ones only, and never a collapsed group's
  // rows silently dropped.
  const allVisibleTasks = groups.flatMap((g) => g.tasks);
  const listKpis = taskListKpis(allVisibleTasks);
  const activeProjectName =
    activeProject && activeProject !== "__unassigned__"
      ? (projects.find((p) => p.id === activeProject)?.name ?? null)
      : null;
  const listView: TaskListView = {
    groupBy,
    smartView: typeof smartView === "string" ? smartView : null,
    projectName: activeProjectName,
    searchQuery: typeof searchQuery === "string" ? searchQuery : null,
    showCompleted: showCompleted === true,
  };

  const handleSelectTask = (taskId: string) => {
    dispatch(setSelectedTaskId(taskId));
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const defaultScopeIds = Object.values(scopeSelections).filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    const firstProject =
      activeProject && activeProject !== "__unassigned__"
        ? activeProject
        : (projects.find((p) => p.id !== "__unassigned__")?.id ?? null);
    try {
      const newId = await dispatch(
        createTaskThunk({
          title: newTaskTitle,
          projectId: firstProject,
          organizationId: orgId,
          scopeIds: defaultScopeIds,
        }),
      ).unwrap();
      if (!newId) {
        toast.error("Could not create task");
        return;
      }
      dispatch(setSelectedTaskId(newId));
      scheduleQuickAddRefocus();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Could not create task");
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await dispatch(toggleTaskCompleteThunk({ taskId })).unwrap();
    } catch (error) {
      console.error("Error changing task completion:", error);
      toast.error("Could not update task completion");
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedOverride((prev) => {
      const base =
        prev?.key === collapseStateKey ? prev.groups : defaultCollapsed;
      const next = new Set(base);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { key: collapseStateKey, groups: next };
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Quick-add — title moved to the shell header (PageHeader). */}
      <div className="shrink-0 px-2 py-2 border-b border-border flex flex-wrap items-center gap-2">
        <span
          className="type-meta text-muted-foreground tabular-nums shrink-0 pl-1"
          data-surface-value="task_count"
        >
          <UntrustedCount value={totalCount} trustworthy={tasksRead.status !== "error"} label="Tasks" />
        </span>
        <SegmentedControl
          value={isTableView ? "table" : "rows"}
          onValueChange={setView}
          aria-label="List style"
          data={[
            {
              value: "rows",
              label: <List className="size-4" />,
              title: "List view",
              ariaLabel: "List view",
            },
            {
              value: "table",
              label: <LayoutGrid className="size-4" />,
              title: "Table view",
              ariaLabel: "Table view",
            },
          ]}
        />
        <div className="order-last flex basis-full gap-1 min-w-0">
          <ProInput
            ref={quickAddInputRef}
            value={newTaskTitle}
            onChange={(e) => dispatch(setNewTaskTitle(e.target.value))}
            placeholder={
              activeProject
                ? `Quick add to ${projects.find((p) => p.id === activeProject)?.name ?? "project"}...`
                : "Quick add task..."
            }
            onSubmit={() => void handleAddTask()}
            submitOnEnter
            submitLabel="Add task"
            submitDisabled={!newTaskTitle.trim() || isCreatingTask}
            isSubmitting={isCreatingTask}
            showCopyButton={false}
            wrapperClassName="flex-1 min-w-0"
            disabled={isCreatingTask}
          />
        </div>
        {allVisibleTasks.length > 0 && (
          <div className="flex shrink-0 items-center gap-0.5">
            <CopyButtons
              sourceId={`task-list:${copySourceId}`}
              size="xs"
              unified
              label="Task list"
              human={() => taskListHuman(allVisibleTasks, listView)}
              json={() => allVisibleTasks.map(taskRow)}
              agent={() =>
                buildTaskListPayload({
                  tasks: allVisibleTasks,
                  view: listView,
                  groups: groups.map((g) => ({
                    key: g.key,
                    label: g.label,
                    taskIds: g.tasks.map((t) => t.id),
                  })),
                })
              }
              export={{
                sheetRows: () => allVisibleTasks.map(taskRow),
                items: [],
              }}
            />
          </div>
        )}
      </div>

      {groupByBanner && !isTableView && (
        <div className="shrink-0 px-3 py-1.5 border-b border-border">
          <span className="type-title text-foreground">
            {groupByBanner}
          </span>
        </div>
      )}

      {/* The ONE menu for the list pane covers rows, table rows, loading,
          empty space, and the empty state. Both row renderers publish the
          same data-task-row-id anchor for delegated task identity. */}
      <TasksListContextMenu
        tasks={allVisibleTasks}
        projects={projects}
        searchQuery={typeof searchQuery === "string" ? searchQuery : ""}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          {isTableView ? (
            <TasksTableView />
          ) : loading && totalCount === 0 ? (
            <div className="p-2">
              <RegionSkeleton shape="rows" count={4} twoLine />
            </div>
          ) : tasksRead.status === "error" && totalCount === 0 ? (
            <ReadFailure error={tasksRead.error ?? true} what="your tasks" onRetry={tasksRead.retry} />
          ) : totalCount === 0 ? (
            <EmptyState
              icon={<CircleDashed />}
              title="No tasks match"
              line="Adjust filters or add a task above"
              action={
                filterOrgId ? (
                  <Button
                    variant="outline"
                    onClick={() => dispatch(setFilterOrgId(null))}
                  >
                    View all organizations
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className={cn(isGrouped && "p-2 space-y-2")}>
              {groups.map((group) => {
                const isCollapsed = collapsed.has(group.key);
                // Resolve scope ids to names where needed
                const displayLabel =
                  group.label && group.label !== group.key
                    ? group.label
                    : (scopeNameMap[group.key] ?? group.label);
                return (
                  <div
                    key={group.key}
                    className={cn(
                      isGrouped &&
                        "rounded-lg border border-border bg-card overflow-hidden",
                    )}
                  >
                    <div
                      className={cn(
                        "sticky top-0 z-10 border-b border-border",
                        isGrouped ? "bg-card" : "bg-background",
                      )}
                    >
                      <DisclosureHeader
                        open={!isCollapsed}
                        onClick={() => toggleGroup(group.key)}
                        title={displayLabel}
                        end={
                          <span className="type-meta tabular-nums text-muted-foreground">
                            {group.tasks.length}
                          </span>
                        }
                      />
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-border">
                        {group.tasks.map((task) => (
                          <TaskRow
                            key={`${group.key}:${task.id}`}
                            task={task}
                            kpis={listKpis}
                            view={listView}
                            isSelected={selectedTaskId === task.id}
                            onSelect={() => handleSelectTask(task.id)}
                            onToggle={() => void handleToggleTask(task.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TasksListContextMenu>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function TaskRow({
  task,
  isSelected,
  onSelect,
  onToggle,
  kpis,
  view,
}: {
  task: TaskWithProject;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  /** The list's rendered KPIs + view state — carried into the row payload. */
  kpis: TaskListKpis;
  view: TaskListView;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const isPastDue =
    !!task.dueDate && task.dueDate < todayStr && !task.completed;

  return (
    <div
      onClick={onSelect}
      data-task-row-id={task.id}
      className={cn(
        "group flex items-start gap-1.5 px-3 py-2 cursor-pointer transition-colors relative",
        isSelected ? "bg-primary/[0.08]" : "hover:bg-accent",
      )}
    >
      {/* Active indicator bar */}
      {isSelected && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
      )}

      {/* Hover-reveal pair. The row selects on click — CopyButtons stops
          propagation so copying never changes the open task. */}
      <CopyButtons
        sourceId={`task:${task.id}`}
        size="xs"
        unified
        label={task.title}
        className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        human={() => taskSummary(task)}
        json={() => taskRow(task)}
        agent={() => buildTaskRowPayload({ task, kpis, view })}
      />

      <Button
        icon={task.completed ? (
          <CheckCircle2 className="text-success" />
        ) : (
          <CircleDashed />
        )}
        type="button"
        variant="quiet"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="mt-0.5 shrink-0"
        title={task.completed ? "Mark incomplete" : "Mark complete"}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <span
            {...{ [TASK_TITLE_DOM_ATTR]: task.id }}
            className="flex-1 min-w-0"
          >
            <EntityRef
              token="task"
              id={task.id}
              name={task.title}
              showIcon={false}
              onOpen={onSelect}
              className="min-w-0 type-title"
              labelClassName={
                task.completed
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }
            />
          </span>
          {task.priority && (
            <span
              className={cn(
                "shrink-0 w-1.5 h-1.5 rounded-full mt-1.5",
                task.priority === "high" && "bg-destructive",
                task.priority === "medium" && "bg-warning",
                task.priority === "low" && "bg-success",
              )}
              title={`${task.priority} priority`}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-meta text-muted-foreground mt-0.5">
          {task.projectName && task.projectId !== "__unassigned__" && (
            <EntityRef
              token="project"
              id={task.projectId}
              name={task.projectName}
              className="max-w-[120px] type-meta"
            />
          )}
          {task.projectName && task.projectId === "__unassigned__" && (
            <span className="flex items-center gap-0.5 truncate max-w-[120px]">
              <Folder className="w-2.5 h-2.5" />
              <span className="truncate">{task.projectName}</span>
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                "flex items-center gap-0.5",
                isPastDue ? "text-destructive" : "",
              )}
            >
              <Calendar className="w-2.5 h-2.5" />
              {formatDateOnly(task.dueDate, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {/* A projected task is visibly machine-made in the list itself, and
              the badge is the door back to whatever produced it — one generic
              chip off origin/source_*, never a per-producer list query. */}
          <TaskProvenanceChip
            compact
            origin={task.origin ?? null}
            sourceType={task.sourceType ?? null}
            sourceUrl={task.sourceUrl ?? null}
            sourceLabel={task.sourceLabel ?? null}
            className="max-w-[150px]"
          />
        </div>
        <ScopeTagsDisplay
          entityType="task"
          entityId={task.id}
          className="mt-1"
        />
      </div>
    </div>
  );
}

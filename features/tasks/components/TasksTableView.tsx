"use client";

import { TASKS_DRILL } from "./tasksDrill";
import {
  TASK_GROUPABLE_COLUMN_IDS,
  columnIdToGroupBy,
  groupByToColumnId,
  taskBandKey,
  taskBandLabel,
} from "./tasksGrouping";
import { getStore } from "@/lib/redux/store-singleton";
import { useTasksRead } from "@/features/tasks/hooks/useTasksRead";
import React from "react";
import { assignAsk, assignDisabledReason } from "./taskAssign";
import { dateInputValue } from "@/features/admin/spend-approvals/ApprovalStatusSelect";
import { CalendarDays, CheckCircle2, CircleDashed, Flag, Folder, FolderInput, RotateCcw, Trash2, UserMinus, UserPlus } from "lucide-react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectFilteredTasks,
  selectProjects,
  UNASSIGNED_PROJECT_ID,
} from "@/features/tasks/redux/selectors";
import {
  selectSelectedTaskId,
  setSelectedTaskId,
  selectFilterOrgId,
  setFilterOrgId,
  selectGroupBy,
  setGroupBy,
} from "@/features/tasks/redux/taskUiSlice";
import {
  deleteTaskThunk,
  moveTaskThunk,
  toggleTaskCompleteThunk,
  updateTaskFieldThunk,
} from "@/features/tasks/redux/thunks";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import { bulkCountLabel, type EntityBulkAction } from "@/lib/entity-list/selection";
import { TASK_LABEL_OPTIONS } from "@/features/tasks/services/taskService";
import { Button } from "@/components/ui/button";
import { keyFieldsAiVariant } from "@/features/marketing/lib/copy-payloads";
import {
  TASKS_LOCATION,
  buildTaskListPayload,
  taskListHuman,
  taskRow,
  taskSummary,
} from "@/features/tasks/lib/copy";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { TaskProvenanceChip } from "@/features/tasks/components/TaskProvenanceChip";
import {
  TASK_TITLE_DOM_ATTR,
} from "@/features/tasks/components/TasksListContextMenu";
import {
  formatAbsoluteDate,
  formatRelativeTime,
  toEpochMs,
} from "@/utils/datetime";
import { formatDateOnly } from "@ai-matrx/kit/dates";
import type { TaskWithProject } from "@/features/tasks/types";
import { toast } from "@/lib/toast";
import { useUserConnections } from "@/features/messaging/hooks/useUserConnections";

type DueBucket = "Overdue" | "Today" | "Next 7 days" | "Later" | "No due date";

const DUE_BUCKET_OPTIONS: Array<{ value: DueBucket; label: string }> = [
  { value: "Overdue", label: "Overdue" },
  { value: "Today", label: "Due today" },
  { value: "Next 7 days", label: "Due within 7 days" },
  { value: "Later", label: "Later" },
  { value: "No due date", label: "No due date" },
];

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
  __none__: 3,
};

const LABEL_BY_VALUE = Object.fromEntries(
  TASK_LABEL_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

function dueBucket(
  task: TaskWithProject,
  todayStr: string,
  weekStr: string,
): DueBucket {
  if (!task.dueDate) return "No due date";
  if (task.dueDate < todayStr) return task.completed ? "Later" : "Overdue";
  if (task.dueDate === todayStr) return "Today";
  if (task.dueDate <= weekStr) return "Next 7 days";
  return "Later";
}

function priorityLabel(priority: TaskWithProject["priority"]): string {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  if (priority === "low") return "Low";
  return "—";
}

export default function TasksTableView() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectFilteredTasks);
  // The sidebar's "Group" choice draws the table's grouping bands (task rows under collapsible
  // bands); the table's own Group menu writes back to it. A column with no sidebar twin is held here
  // until the sidebar choice moves again.
  const groupBy = useAppSelector(selectGroupBy);
  const [ownColumn, setOwnColumn] = React.useState<{ from: string; id: string | null } | null>(null);
  const groupColumnId =
    ownColumn && ownColumn.from === groupBy ? ownColumn.id : groupByToColumnId(groupBy);
  const filterOrgId = useAppSelector(selectFilterOrgId);
  const tasksRead = useTasksRead();
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  // Local calendar days (toISOString() is the UTC day, one off east of UTC).
  const todayStr = dateInputValue(0);
  const weekStr = dateInputValue(7);

  // The people list is read only once something is ticked (nothing loads until engaged).
  const [assignEngaged, setAssignEngaged] = React.useState(false);
  const { connections: people, isLoading: peopleLoading } = useUserConnections({
    ...(filterOrgId ? { organizationId: filterOrgId } : {}),
    enabled: assignEngaged,
  });
  const allProjects = useAppSelector(selectProjects);

  const taskId = (task: TaskWithProject) => task.id;
  const taskName = (task: TaskWithProject) => task.title;

  // Batch verbs reuse the row UI's own doors (the complete toggle, the field
  // updater, the delete thunk) one row at a time, so refusals are skipped and
  // named. Every row keeps its checkbox; limits live inside each `run`.
  const priorityAction = (
    priority: "high" | "medium" | "low",
    label: string,
  ): EntityBulkAction<TaskWithProject> => ({
    id: `set-priority-${priority}`,
    label,
    icon: Flag,
    run: (selection) =>
      runPerRow(
        selection,
        async (id) => {
          await dispatch(
            updateTaskFieldThunk({ taskId: id, patch: { priority } }),
          ).unwrap();
        },
        { done: `Priority set to ${priority}`, noun: "task", labelOf: taskName },
        taskId,
      ),
  });

  const bulkActions: EntityBulkAction<TaskWithProject>[] = [
    {
      id: "mark-complete",
      label: "Mark complete",
      icon: CheckCircle2,
      run: (selection) =>
        runPerRow(
          selection,
          async (id, row) => {
            // A toggle: never run it blind on a row this screen no longer holds.
            if (!row) throw new Error("not on screen any more");
            if (row.completed) throw new Error("already complete");
            await dispatch(toggleTaskCompleteThunk({ taskId: id })).unwrap();
          },
          { done: "Marked complete", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    {
      id: "reopen",
      label: "Reopen",
      icon: RotateCcw,
      run: (selection) =>
        runPerRow(
          selection,
          async (id, row) => {
            if (!row) throw new Error("not on screen any more");
            if (!row.completed) throw new Error("already open");
            await dispatch(toggleTaskCompleteThunk({ taskId: id })).unwrap();
          },
          { done: "Reopened", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    priorityAction("high", "High priority"),
    priorityAction("medium", "Medium priority"),
    priorityAction("low", "Low priority"),
    {
      // The editor's own door (`updateTaskFieldThunk` with assignee_id): the server
      // sends the assignment notice per task, same as the row editor.
      id: "assign-to",
      label: "Assign to…",
      icon: UserPlus,
      // Never offered before the people read has answered: an empty list must not turn into a
      // dialog whose only way forward is to unassign.
      disabledReason: () => assignDisabledReason(peopleLoading, people),
      confirm: (selection) => ({
        title: `Assign ${bulkCountLabel(selection.count, "task")}?`,
        description: "Each task goes to the person you pick. They are told, same as one task.",
        confirmLabel: "Assign",
        ask: assignAsk(people),
      }),
      run: (selection, input) =>
        runPerRow(
          selection,
          async (id) => {
            const value = input?.value;
            if (!value) throw new Error("no person picked");
            await dispatch(
              updateTaskFieldThunk({ taskId: id, patch: { assignee_id: value } }),
            ).unwrap();
          },
          { done: "Assigned", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    {
      // Its own explicit verb, never a default of the picker above.
      id: "unassign",
      label: "Unassign",
      icon: UserMinus,
      confirm: (selection) => ({
        title: `Unassign ${bulkCountLabel(selection.count, "task")}?`,
        description: "Each task is left with nobody assigned.",
        confirmLabel: "Unassign",
      }),
      run: (selection) =>
        runPerRow(
          selection,
          async (id) => {
            await dispatch(
              updateTaskFieldThunk({ taskId: id, patch: { assignee_id: null } }),
            ).unwrap();
          },
          { done: "Unassigned", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    {
      id: "clear-due-date",
      label: "No due date",
      icon: CalendarDays,
      confirm: (selection) => ({
        title: `Clear the due date for ${bulkCountLabel(selection.count, "task")}?`,
        description: "Each task is left without a due date.",
        confirmLabel: "Clear due date",
      }),
      run: (selection) =>
        runPerRow(
          selection,
          async (id) => {
            await dispatch(updateTaskFieldThunk({ taskId: id, patch: { due_date: null } })).unwrap();
          },
          { done: "Due date cleared", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    {
      id: "set-due-date",
      label: "Due date…",
      icon: CalendarDays,
      confirm: (selection) => ({
        title: `Set a due date for ${bulkCountLabel(selection.count, "task")}?`,
        description: "Every selected task gets the same due date.",
        confirmLabel: "Set due date",
        ask: {
          kind: "date",
          label: "Due on",
          defaultValue: todayStr,
        },
      }),
      run: (selection, input) =>
        runPerRow(
          selection,
          async (id) => {
            const value = input?.value;
            if (!value) throw new Error("no date picked");
            await dispatch(
              updateTaskFieldThunk({ taskId: id, patch: { due_date: value } }),
            ).unwrap();
          },
          { done: "Due date set", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    {
      // The row's own move door (`moveTaskThunk`): counts and optimistic move kept honest.
      id: "move-to-project",
      label: "Move to project…",
      icon: FolderInput,
      confirm: (selection) => ({
        title: `Move ${bulkCountLabel(selection.count, "task")} to a project?`,
        description: "Tasks already in that project are skipped.",
        confirmLabel: "Move",
        ask: {
          kind: "choice",
          label: "Project",
          options: [
            { value: UNASSIGNED_PROJECT_ID, label: "No project" },
            ...allProjects
              .filter((p) => p.id !== UNASSIGNED_PROJECT_ID)
              .map((p) => ({ value: p.id, label: p.name })),
          ],
          defaultValue: UNASSIGNED_PROJECT_ID,
        },
      }),
      run: (selection, input) =>
        runPerRow(
          selection,
          async (id, row) => {
            const to = input?.value;
            if (!to) throw new Error("no project picked");
            if (!row) throw new Error("not on screen any more");
            if ((row.projectId || UNASSIGNED_PROJECT_ID) === to) {
              throw new Error("already in that project");
            }
            await dispatch(
              moveTaskThunk({
                taskId: id,
                fromProjectId: row.projectId ?? "",
                toProjectId: to,
              }),
            ).unwrap();
          },
          { done: "Moved", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
    {
      // The task's OWN delete door (`deleteTaskThunk`): optimistic slice removal,
      // subtasks leaving with their parent, project counts, rollback on refusal.
      // The built-in trash would skip all of that, so it is replaced by id.
      id: "move-to-trash",
      label: "Move to Trash",
      icon: Trash2,
      variant: "destructive",
      confirm: (selection) => {
        // Subtasks of the ticked parents leave with them: name how many, not just "subtasks".
        const ticked = new Set(selection.ids);
        const entities = (getStore()?.getState().tasks.entities ?? {}) as Record<
          string,
          { id: string; parent_task_id?: string | null } | undefined
        >;
        const subtasks = Object.values(entities).filter(
          (t) => t && t.parent_task_id && ticked.has(t.parent_task_id) && !ticked.has(t.id),
        ).length;
        return {
        title: `Move ${bulkCountLabel(selection.count, "task")} to Trash?`,
        description: subtasks
          ? `${bulkCountLabel(subtasks, "subtask")} go with them. They can be restored from Trash.`
          : "They can be restored from Trash.",
        confirmLabel: "Move to Trash",
        variant: "destructive",
        };
      },
      run: (selection) =>
        runPerRow(
          selection,
          async (id, row) => {
            // A subtask whose parent was trashed earlier in this run already left
            // with it; deleting it again is a silent no-op that must not count.
            if (!getStore()?.getState().tasks.entities[id]) {
              throw new Error("already moved to Trash with its parent");
            }
            await dispatch(
              deleteTaskThunk({
                taskId: id,
                projectId: row?.projectId ?? "",
                skipConfirm: true,
              }),
            ).unwrap();
          },
          { done: "Moved to Trash", noun: "task", labelOf: taskName },
          taskId,
        ),
    },
  ];

  // The task list is a live Redux slice (realtime + optimistic), so no refetch.
  const bulk = useTableBulkSelection<TaskWithProject>({
    token: "task",
    noun: "task",
    rows: tasks,
    getRowId: taskId,
    getRowName: taskName,
    actions: bulkActions,
    onRefresh: () => {},
    onRemoveRows: () => {},
  });

  const hasTicked = bulk.selectedIds.length > 0;
  React.useEffect(() => {
    if (hasTicked) setAssignEngaged(true);
  }, [hasTicked]);

  const columns = React.useMemo<MatrxColumnDef<TaskWithProject>[]>(
    () => [
      {
        id: "status",
        filter: "select",
        header: <span className="sr-only">Status</span>,
        label: "Status",
        accessorFn: (task) => (task.completed ? "Completed" : "Open"),
        sortValue: (task) => Number(task.completed),
        defaultSortDirection: "desc",
        filterOptions: [
          { value: "Open", label: "Open" },
          { value: "Completed", label: "Completed" },
        ],
        width: 56,
        cell: (task) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void dispatch(toggleTaskCompleteThunk({ taskId: task.id }))
                .unwrap()
                .catch((error) => {
                  console.error("Error changing task completion:", error);
                  toast.error("Could not update task completion");
                });
            }}
            className="text-muted-foreground/70 hover:text-primary transition-colors"
            title={task.completed ? "Mark incomplete" : "Mark complete"}
          >
            {task.completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <CircleDashed className="h-3.5 w-3.5" />
            )}
          </button>
        ),
      },
      {
        id: "title",
        header: "Task",
        accessorKey: "title",
        filter: "text",
        width: 420,
        minWidth: 240,
        cell: (task) => {
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              {/* THE DOOR LAW. The row already selects the task into the
                  detail pane; the name keeps cmd/middle-click to /tasks/{id}
                  and the hover peek. */}
              {/* One-line rows: the title truncates with an ellipsis (full title on hover) rather
                  than wrapping into a row that clips it mid-word. */}
              <span className="min-w-0" data-user-content {...{ [TASK_TITLE_DOM_ATTR]: task.id }}>
                <EntityRef
                  token="task"
                  id={task.id}
                  name={task.title}
                  showIcon={false}
                  onOpen={() => dispatch(setSelectedTaskId(task.id))}
                  className="text-[13px]"
                  labelClassName={
                    task.completed
                      ? "line-through text-muted-foreground"
                      : "font-medium text-foreground"
                  }
                />
              </span>
            </div>
          );
        },
      },
      {
        id: "project",
        header: "Project",
        accessorFn: (task) =>
          task.projectId === UNASSIGNED_PROJECT_ID || !task.projectId
            ? "Unassigned"
            : task.projectName,
        width: 150,
        minWidth: 110,
        cell: (task) =>
          task.projectId === UNASSIGNED_PROJECT_ID || !task.projectId ? (
            <span className="inline-flex min-w-0 max-w-[160px] items-center gap-1 text-sm text-muted-foreground">
              <Folder className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {task.projectId === UNASSIGNED_PROJECT_ID ? "Unassigned" : "—"}
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              <EntityRef
                token="project"
                id={task.projectId}
                name={task.projectName}
                className="max-w-[160px]"
              />
            </span>
          ),
      },
      {
        id: "labels",
        header: "Labels",
        accessorFn: (task) =>
          ((task.settings?.labels ?? []) as string[])
            .map((label) => LABEL_BY_VALUE[label] ?? label)
            .join(", "),
        width: 150,
        minWidth: 110,
        cell: (task) => {
          const labels = (task.settings?.labels ?? []) as string[];
          if (labels.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {labels.slice(0, 2).map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="h-4 shrink-0 px-1 text-[9px] font-normal"
                >
                  {LABEL_BY_VALUE[label] ?? label}
                </Badge>
              ))}
              {labels.length > 2 && (
                <span className="shrink-0 text-[9px] text-muted-foreground">
                  +{labels.length - 2}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "source",
        filter: "select",
        header: "Source",
        accessorFn: (task) => task.sourceLabel ?? task.origin ?? "",
        width: 200,
        minWidth: 140,
        cell: (task) => (
          <TaskProvenanceChip
            compact
            origin={task.origin ?? null}
            sourceType={task.sourceType ?? null}
            sourceUrl={task.sourceUrl ?? null}
            sourceLabel={task.sourceLabel ?? null}
            className="max-w-full"
          />
        ),
      },
      {
        id: "priority",
        filter: "select",
        header: "Priority",
        accessorFn: (task) => priorityLabel(task.priority),
        sortValue: (task) => PRIORITY_ORDER[task.priority ?? "__none__"] ?? 99,
        filterOptions: [
          { value: "High", label: "High" },
          { value: "Medium", label: "Medium" },
          { value: "Low", label: "Low" },
          { value: "—", label: "None" },
        ],
        width: 124,
        minWidth: 124,
        cell: (task) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            {task.priority && (
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  task.priority === "high" && "bg-red-500",
                  task.priority === "medium" && "bg-amber-500",
                  task.priority === "low" && "bg-green-500",
                )}
              />
            )}
            {priorityLabel(task.priority)}
          </span>
        ),
      },
      {
        id: "dueDate",
        format: { id: "date" },
        header: "Due",
        accessorFn: (task) => task.dueDate || null,
        sortValue: (task) => task.dueDate || "9999-12-31",
        filterValue: (task) => dueBucket(task, todayStr, weekStr),
        filter: "select",
        filterOptions: DUE_BUCKET_OPTIONS,
        width: 110,
        minWidth: 110,
        cell: (task) => {
          const isPastDue =
            !!task.dueDate && task.dueDate < todayStr && !task.completed;
          return (
            <span
              className={cn(
                "whitespace-nowrap text-xs",
                isPastDue
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {task.dueDate
                ? formatDateOnly(task.dueDate, { month: "short", day: "numeric" })
                : "—"}
            </span>
          );
        },
      },
      {
        id: "updated",
        header: "Updated",
        accessorFn: (task) => task.updatedAt,
        sortValue: (task) => toEpochMs(task.updatedAt),
        defaultSortDirection: "desc",
        filter: "date",
        width: 130,
        minWidth: 120,
        cell: (task) => (
          <span
            className="whitespace-nowrap text-xs text-muted-foreground"
            title={formatAbsoluteDate(task.updatedAt)}
          >
            {formatRelativeTime(task.updatedAt, { style: "long" })}
          </span>
        ),
      },
    ],
    [dispatch, todayStr, weekStr],
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      <MatrxDataTable<TaskWithProject>
        drill={TASKS_DRILL}
        grouping={{
          columnId: groupColumnId,
          groupableColumnIds: TASK_GROUPABLE_COLUMN_IDS,
          rowNoun: "task",
          order: "value-asc",
          emptyLabel: "No value",
          onColumnIdChange: (id) => {
            const twin = columnIdToGroupBy(id);
            if (twin) {
              setOwnColumn(null);
              dispatch(setGroupBy(twin));
            } else setOwnColumn({ from: groupBy, id });
          },
          readCell: (task, columnId) =>
            columnId === "status" || columnId === "priority" || columnId === "dueDate"
              ? taskBandKey(columnId, task, todayStr, weekStr)
              : task.projectId === UNASSIGNED_PROJECT_ID || !task.projectId
                ? "Unassigned"
                : task.projectName,
          renderLabel: (group) =>
            groupColumnId === "status" || groupColumnId === "priority" || groupColumnId === "dueDate"
              ? taskBandLabel(groupColumnId, String(group.value))
              : group.label,
        }}
        tableId="tasks-table"
        data={tasks}
        columns={columns}
        getRowId={(task) => task.id}
        defaultSort={{ id: "updated", direction: "desc" }}
        searchText={(task) => `${task.title} ${task.projectName ?? ""}`}
        zebra
        pageSize={0}
        fitToWidth="grow"
        frameHeight="fill"
        selectedId={selectedTaskId}
        selection={bulk.selection}
        detail={{ enabled: false }}
        onRowOpen={(task) => dispatch(setSelectedTaskId(task.id))}
        window={{}}
        // The sidebar search (one redux query shared with every task view) is
        // the page's single search box.
        toolbar={{ search: false }}
        getRowHref={(task) => `/tasks/${task.id}`}
        read={{
          status: tasksRead.status,
          error: tasksRead.error ?? undefined,
          onRetry: tasksRead.retry,
          what: "your tasks",
        }}
        emptyState={{
          title: "No tasks match these filters.",
          ...(filterOrgId
            ? {
                action: (
                  <Button
                    variant="outline"
                    onClick={() => dispatch(setFilterOrgId(null))}
                  >
                    View all organizations
                  </Button>
                ),
              }
            : {}),
        }}
        copy={{
          label: "Task",
          listLabel: "Task table",
          location: TASKS_LOCATION,
          rowKind: "task",
          listKind: "tasks-list",
          humanRow: taskSummary,
          agentRow: taskRow,
          listHuman: (visible) => taskListHuman(visible),
          listJson: (visible) => visible.map(taskRow),
          listAgent: (visible) => buildTaskListPayload({ tasks: visible }),
          aiVariants: (visible) => [
            keyFieldsAiVariant({
              kind: "tasks-list",
              location: TASKS_LOCATION,
              description:
                "The visible task rows projected to title, status, project, priority and due date.",
              visible,
              project: (task) => ({
                id: task.id,
                title: task.title,
                status: task.status,
                project: task.projectName,
                priority: task.priority ?? null,
                due_date: task.dueDate || null,
              }),
            }),
          ],
        }}
      />
    </div>
  );
}

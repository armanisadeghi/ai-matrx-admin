import type { TaskGroupBy } from "@/features/tasks/redux/taskUiSlice";
import type { TaskWithProject } from "@/features/tasks/types";
import {
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  normalizeTaskStatus,
} from "@/features/tasks/constants/status";

/**
 * THE SIDEBAR'S GROUP DRIVES THE TABLE'S GROUPING BANDS (the table's `grouping`: task rows under
 * collapsible bands, count and select-all per band) — the same bands the list view draws. The drill
 * rollup stays in the table's own Group-by menu. Scope has no column (a task can sit in several
 * scopes, which one row cannot band), so Scope and Flat leave the table ungrouped, as before.
 */
export const TASK_GROUP_PARAM = "group";

const COLUMN_BY_GROUP: Partial<Record<TaskGroupBy, string>> = {
  project: "project",
  status: "status",
  priority: "priority",
  dueDate: "dueDate",
};

export const TASK_GROUPABLE_COLUMN_IDS = Object.values(COLUMN_BY_GROUP) as string[];

const GROUP_VALUES: TaskGroupBy[] = ["project", "scope", "priority", "status", "dueDate", "none"];

export function groupByToColumnId(groupBy: TaskGroupBy): string | null {
  return COLUMN_BY_GROUP[groupBy] ?? null;
}

/** The table's own Group menu back to the sidebar: undefined when the column has no sidebar twin. */
export function columnIdToGroupBy(columnId: string | null): TaskGroupBy | undefined {
  if (columnId === null) return "none";
  return (Object.keys(COLUMN_BY_GROUP) as TaskGroupBy[]).find((g) => COLUMN_BY_GROUP[g] === columnId);
}

export function groupByFromParam(param: string | null): TaskGroupBy | undefined {
  return param && (GROUP_VALUES as string[]).includes(param) ? (param as TaskGroupBy) : undefined;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL: Record<string, string> = { high: "High", medium: "Medium", low: "Low", none: "No priority" };
const DUE_LABEL: Record<string, string> = {
  overdue: "Overdue",
  today: "Today",
  thisweek: "This week",
  later: "Later",
  nodate: "No due date",
};
const DUE_RANK: Record<string, number> = { overdue: 0, today: 1, thisweek: 2, later: 3, nodate: 4 };

/** Local YYYY-MM-DD, the day the due-date bands are measured from. */
export function todayAndWeek(now = new Date()): { today: string; week: string } {
  const week = new Date(now);
  week.setDate(week.getDate() + 7);
  return { today: now.toLocaleDateString("sv-SE"), week: week.toLocaleDateString("sv-SE") };
}

/**
 * The band a task sits in. The key leads with its rank, so the table's value-ascending band order
 * is the list view's order (High before Low, Overdue before Later); `taskBandLabel` says it in words.
 */
export function taskBandKey(
  groupBy: "priority" | "status" | "dueDate",
  task: Pick<TaskWithProject, "priority" | "status" | "dueDate">,
  today: string,
  week = today,
): string {
  if (groupBy === "priority") {
    const p = task.priority ?? "none";
    return `${PRIORITY_RANK[p] ?? 3}:${p}`;
  }
  if (groupBy === "status") {
    const s = normalizeTaskStatus(task.status);
    return `${String(TASK_STATUS_ORDER[s] ?? 99).padStart(2, "0")}:${s}`;
  }
  let key = "nodate";
  if (task.dueDate) {
    if (task.dueDate < today) key = "overdue";
    else if (task.dueDate === today) key = "today";
    else if (week > today && task.dueDate <= week) key = "thisweek";
    else key = "later";
  }
  return `${DUE_RANK[key]}:${key}`;
}

export function taskBandLabel(groupBy: "priority" | "status" | "dueDate", key: string): string {
  const word = key.slice(key.indexOf(":") + 1);
  if (groupBy === "priority") return PRIORITY_LABEL[word] ?? word;
  if (groupBy === "status") return TASK_STATUS_META[word as keyof typeof TASK_STATUS_META]?.label ?? word;
  return DUE_LABEL[word] ?? word;
}

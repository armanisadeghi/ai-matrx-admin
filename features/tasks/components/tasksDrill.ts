import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";
import type { TaskGroupBy } from "@/features/tasks/redux/taskUiSlice";

/**
 * LEVELS of the task table. A project asks which tasks are open and how late they run; a
 * status asks which projects hold them and how urgent they are; a priority asks what state
 * those tasks are in and where they live. Time comes last. Complete, Reopen and Trash stay
 * on the rows and in the bulk bar.
 */
export const TASKS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "task",
  countLabel: "Tasks",
  dimensions: ["status", "project", "priority", "dueDate", "updated"],
  measures: ["count"],
  levels: {
    project: {
      breakouts: ["status", "priority", "dueDate:month"],
      attributes: [],
      show: ["count"],
    },
    status: {
      breakouts: ["project", "priority", "dueDate:month"],
      attributes: [],
      show: ["count"],
    },
    priority: {
      breakouts: ["status", "project", "dueDate:month"],
      attributes: [],
      show: ["count"],
    },
  },
};

/** The sidebar's group-by as the table's drill Dimension (Scope and Flat have none: flat). */
const GROUP_BY_DIMENSION: Partial<Record<TaskGroupBy, string>> = {
  project: "project",
  status: "status",
  priority: "priority",
  dueDate: "dueDate:month",
};

/**
 * THE TABLE GROUPS AS THE SIDEBAR SAYS (live walk 2026-10-22): "Group: Project" in the sidebar,
 * flat rows in the table. The table's drill starts grouped by the sidebar's field; the person's own
 * drill choice in the address still wins, and the table remounts when the sidebar choice changes.
 */
export function tasksDrillFor(groupBy: TaskGroupBy): MatrxDataTableLocalDrillConfig {
  const by = GROUP_BY_DIMENSION[groupBy];
  if (!by) return TASKS_DRILL;
  return { ...TASKS_DRILL, question: { by: [by], show: ["count"], where: [] } };
}

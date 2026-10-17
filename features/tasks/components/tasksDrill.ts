import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

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

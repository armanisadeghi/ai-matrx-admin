import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the project list. An organization asks how much work its projects hold (open and
 * done tasks added up) and when they last moved. The project name is near-unique, so it is
 * the row, never a thing to group by.
 */
export const PROJECTS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "project",
  countLabel: "Projects",
  dimensions: ["org", "updated"],
  measures: ["count", "sum_open", "sum_done"],
  levels: {
    org: {
      breakouts: ["updated:month"],
      attributes: [],
      show: ["count", "sum_open", "sum_done"],
    },
  },
};

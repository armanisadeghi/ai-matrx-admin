import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the outreach lists. A status asks which kinds of list sit there and how many
 * people they hold; a kind asks the same by status. Time comes last. Open and Dial stay on
 * the rows.
 */
export const OUTREACH_LISTS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "list",
  countLabel: "Lists",
  dimensions: ["status", "list_kind", "started_at", "updated_at"],
  measures: ["count", "sum_members", "max_members"],
  levels: {
    status: {
      breakouts: ["list_kind", "started_at:month", "updated_at:month"],
      attributes: [],
      show: ["count", "sum_members", "max_members"],
    },
    list_kind: {
      breakouts: ["status", "started_at:month", "updated_at:month"],
      attributes: [],
      show: ["count", "sum_members", "max_members"],
    },
  },
};

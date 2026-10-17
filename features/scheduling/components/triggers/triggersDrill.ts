import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the workflow triggers. A workflow asks how its triggers are set up and how often
 * they ran; a state asks which workflows are paused; a kind asks what ran in the last week and
 * month; a creator asks what they own. Pause, resume and open stay on the rows.
 */
export const TRIGGERS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "trigger",
  countLabel: "Triggers",
  dimensions: ["workflow", "kind", "state", "created_by", "last_fired"],
  measures: ["count", "sum_runs_7d", "sum_runs_30d"],
  levels: {
    workflow: {
      breakouts: ["kind", "state", "created_by", "last_fired:month"],
      attributes: [],
      show: ["count", "sum_runs_7d", "sum_runs_30d"],
    },
    state: {
      breakouts: ["workflow", "kind", "created_by"],
      attributes: [],
      show: ["count", "sum_runs_7d", "sum_runs_30d"],
    },
    kind: {
      breakouts: ["state", "workflow", "created_by", "last_fired:month"],
      attributes: [],
      show: ["count", "sum_runs_7d", "sum_runs_30d"],
    },
    created_by: {
      breakouts: ["state", "kind", "workflow"],
      attributes: [],
      show: ["count", "sum_runs_7d", "sum_runs_30d"],
    },
  },
};

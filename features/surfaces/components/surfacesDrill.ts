import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the surfaces table. A client asks how ready its surfaces are and how many agents
 * and tools they carry; a readiness bucket asks who owns those surfaces; an executor asks
 * which clients it serves. Toggle and open stay on the rows.
 */
export const SURFACES_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "surface",
  countLabel: "Surfaces",
  dimensions: ["client_name", "readiness", "is_active", "executor_name", "sort_order"],
  measures: ["count", "sum_agentCount", "sum_toolCount", "sum_surfaceValueCount"],
  levels: {
    client_name: {
      breakouts: ["readiness", "is_active", "executor_name", "sort_order"],
      attributes: [],
      show: ["count", "sum_agentCount", "sum_toolCount", "sum_surfaceValueCount"],
    },
    readiness: {
      breakouts: ["client_name", "is_active", "executor_name"],
      attributes: [],
      show: ["count", "sum_agentCount", "sum_toolCount"],
    },
    executor_name: {
      breakouts: ["client_name", "readiness", "is_active"],
      attributes: [],
      show: ["count", "sum_agentCount", "sum_toolCount"],
    },
  },
};

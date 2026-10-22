import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the surfaces table. Readiness is the DERIVED fleet readiness
 * (surface declarations W0), never the typed column. A client asks how ready
 * its surfaces are and how much of what they declare is supplied and handled;
 * a readiness bucket asks which clients and sources sit in it; a source
 * (code vs database) asks how ready it is. Toggle and open stay on the rows.
 */
const FLEET_MEASURES = [
  "count",
  "sum_valuesOn",
  "sum_valuesSupplied",
  "sum_writeTargets",
  "sum_handledTargets",
  "sum_patchableTargets",
];

export const SURFACES_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "surface",
  countLabel: "Surfaces",
  dimensions: ["client_name", "readiness", "situation", "declaredBy", "is_active", "executor_name"],
  measures: [...FLEET_MEASURES, "sum_agentCount", "sum_toolCount"],
  levels: {
    client_name: {
      breakouts: ["readiness", "situation", "declaredBy", "is_active", "executor_name"],
      attributes: [],
      show: FLEET_MEASURES,
    },
    readiness: {
      breakouts: ["client_name", "declaredBy", "situation", "is_active"],
      attributes: [],
      show: FLEET_MEASURES,
    },
    situation: {
      breakouts: ["client_name", "readiness", "declaredBy"],
      attributes: [],
      show: ["count", "sum_valuesOn", "sum_valuesSupplied"],
    },
    declaredBy: {
      breakouts: ["readiness", "client_name", "situation"],
      attributes: [],
      show: FLEET_MEASURES,
    },
    executor_name: {
      breakouts: ["client_name", "readiness", "is_active"],
      attributes: [],
      show: ["count", "sum_agentCount", "sum_toolCount"],
    },
  },
};

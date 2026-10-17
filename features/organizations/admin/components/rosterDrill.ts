import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the member roster. A role asks which statuses and tiers its members hold and how
 * many files they keep; a status asks the same by role; a tier asks who holds it. Spend is
 * left out: it prints in the viewer's cost unit, so adding it up here would guess a currency.
 */
export const ROSTER_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "member",
  countLabel: "Members",
  dimensions: ["role", "status", "tier", "last-active"],
  measures: ["count", "sum_files"],
  hide: ["spend"],
  levels: {
    role: {
      breakouts: ["status", "tier", "last-active:month"],
      attributes: [],
      show: ["count", "sum_files"],
    },
    status: {
      breakouts: ["role", "tier", "last-active:month"],
      attributes: [],
      show: ["count", "sum_files"],
    },
    tier: {
      breakouts: ["role", "status", "last-active:month"],
      attributes: [],
      show: ["count", "sum_files"],
    },
  },
};

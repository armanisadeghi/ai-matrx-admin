import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the question desk. A verdict asks which kinds of question and which doors reached
 * it; a kind asks how its questions were answered; a door asks what it was asked and how
 * those came out.
 */
export const ASK_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "question",
  countLabel: "Questions",
  dimensions: ["verdict", "kind", "door"],
  measures: ["count"],
  levels: {
    verdict: {
      breakouts: ["kind", "door"],
      attributes: [],
      show: ["count"],
    },
    kind: {
      breakouts: ["verdict", "door"],
      attributes: [],
      show: ["count"],
    },
    door: {
      breakouts: ["verdict", "kind"],
      attributes: [],
      show: ["count"],
    },
  },
};

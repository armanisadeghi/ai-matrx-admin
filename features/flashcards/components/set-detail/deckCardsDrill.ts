import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of a deck's cards. A mastery tier asks which kinds of card sit there; a kind asks how well it is known. Reorder and open stay on the rows.
 */
export const DECK_CARDS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "card",
  countLabel: "Cards",
  dimensions: ["mastery", "kind"],
  measures: ["count"],
  levels: {
    mastery: {
      breakouts: ["kind"],
      attributes: [],
      show: ["count"],
    },
    kind: {
      breakouts: ["mastery"],
      attributes: [],
      show: ["count"],
    },
  },
};

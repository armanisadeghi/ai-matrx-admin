import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the war-room threads. A war room asks which kinds of thread it holds and how many
 * are pinned; a type asks which rooms use it; pinned splits both. Time comes last.
 */
export const THREADS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "thread",
  countLabel: "Threads",
  dimensions: ["roomTitle", "anchorType", "isPinned", "updatedAt", "createdAt"],
  measures: ["count"],
  levels: {
    roomTitle: {
      breakouts: ["anchorType", "isPinned", "updatedAt:month"],
      attributes: [],
      show: ["count"],
    },
    anchorType: {
      breakouts: ["roomTitle", "isPinned", "updatedAt:month"],
      attributes: [],
      show: ["count"],
    },
    isPinned: {
      breakouts: ["roomTitle", "anchorType", "updatedAt:month"],
      attributes: [],
      show: ["count"],
    },
  },
};

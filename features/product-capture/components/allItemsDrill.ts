import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the captured products. A status asks how much media its products carry and when
 * they were captured; a capture month asks how those products stand. The organization column
 * holds an id and is drawn by its tag, so it is not offered as a thing to group by.
 */
export const ALL_ITEMS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "product",
  countLabel: "Products",
  dimensions: ["status", "createdAt"],
  measures: ["count", "sum_photoCount", "sum_videoCount", "sum_audioCount"],
  levels: {
    status: {
      breakouts: ["createdAt:month"],
      attributes: [],
      show: ["count", "sum_photoCount", "sum_videoCount", "sum_audioCount"],
    },
  },
};

import type { MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";

/**
 * LEVELS of the shortcut list. A category asks how its shortcuts show up (display, auto-run,
 * chat); a display mode asks which categories use it; auto-run asks what kind of shortcut
 * fires by itself. Edit, duplicate and promote stay on the rows.
 */
export const SHORTCUTS_DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  rowNoun: "shortcut",
  countLabel: "Shortcuts",
  dimensions: ["category", "displayMode", "autoRun", "allowChat"],
  measures: ["count"],
  levels: {
    category: {
      breakouts: ["displayMode", "autoRun", "allowChat"],
      attributes: [],
      show: ["count"],
    },
    displayMode: {
      breakouts: ["category", "autoRun", "allowChat"],
      attributes: [],
      show: ["count"],
    },
    autoRun: {
      breakouts: ["category", "displayMode", "allowChat"],
      attributes: [],
      show: ["count"],
    },
  },
};

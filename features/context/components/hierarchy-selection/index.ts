// Hierarchy Selection System — Single source of truth for org/project/task selection
//
// 5 variants, one data hook, one type system.
// Use these components EVERYWHERE a user needs to pick organizational context.
//
// Variants:
//   HierarchyTree       — Expandable tree sidebar with search
//   HierarchyCascade    — Cascading dropdowns (horizontal or vertical)
//   HierarchyBreadcrumb — Clickable breadcrumb trail showing current path
//   HierarchyCommand    — Command palette (searchable popover)
//   HierarchyPills      — Compact filter pills with dropdowns

export { HierarchyTree } from "./HierarchyTree";
export { HierarchyCascade } from "./HierarchyCascade";
export { HierarchyBreadcrumb } from "./HierarchyBreadcrumb";
export { HierarchyCommand } from "./HierarchyCommand";
export { HierarchyPills } from "./HierarchyPills";

export { useHierarchySelection } from "./useHierarchySelection";
export { useHierarchyReduxBridge } from "./useReduxBridge";

export type {
  HierarchySelection,
  HierarchySelectionProps,
  HierarchyLevel,
  HierarchyOption,
  UseHierarchySelectionReturn,
} from "./types";

export { EMPTY_SELECTION, LEVEL_CONFIG } from "./types";

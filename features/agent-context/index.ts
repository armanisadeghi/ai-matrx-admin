// Context Management — Feature Barrel

// Types
export * from "./types";

// Constants
export * from "./constants";

// Services
export { contextService } from "./service/contextService";
export { hierarchyService } from "./service/hierarchyService";
export { contextVariableService } from "./service/contextVariableService";

// Hooks — Context Items
export {
  useContextManifest,
  useContextItem,
  useContextItemValue,
  useContextVersionHistory,
  useContextDashboardStats,
  useContextCategoryHealth,
  useContextAttentionQueue,
  useContextAccessSummary,
  useContextTemplates,
  useContextTemplatesByIndustry,
  useContextAccessVolume,
  useContextUsageRankings,
  useCreateContextItem,
  useUpdateContextItem,
  useUpdateContextStatus,
  useCreateContextValue,
  useArchiveContextItem,
  useDuplicateContextItem,
  useApplyTemplate,
} from "./hooks/useContextItems";

// Hooks — Scope
export { useContextScope } from "./hooks/useContextScope";
export type { ScopeState } from "./hooks/useContextScope";

// Hooks — Filters, Keyboard
export { useContextFilters } from "./hooks/useContextFilters";
export { useContextKeyboard } from "./hooks/useContextKeyboard";

// Hooks — Hierarchy (React Query / admin view)
export {
  useHierarchyTree,
  useUserOrganizations,
  useOrgProjects,
  useProjectTasks,
  useAncestors,
  useCreateOrganization,
  useCreateProject,
  useCreateTask,
  useUpdateEntity,
  useDeleteEntity,
  useMoveProject,
  useMoveTask,
  filterHierarchyTree,
  countDescendants,
} from "./hooks/useHierarchy";

// Hooks — Nav tree (Redux-backed, single fetch, no duplicates)
export { useNavTree, useNavOrganizations } from "./hooks/useNavTree";

// Redux slice exports
export {
  selectNavTree,
  selectNavTreeStatus,
  selectNavOrganizations,
  selectFlatProjects,
  selectFullContext,
  selectFullContextStatus,
  invalidateNavTree,
  invalidateFullContext,
  invalidateAll,
} from "./redux/hierarchySlice";
export type {
  NavOrganization,
  NavProject,
  NavTask,
  /** @deprecated NavProject now includes open_task_count/open_tasks/scope_tags — use NavProject directly */
  NavProject as NavProjectWithTasks,
  NavTreeResponse,
  FullContextResponse,
  FlatProject,
  ProjectScopeTag,
  FullContextScopeType,
  FullContextScope,
} from "./redux/hierarchySlice";

// Thunks
export {
  fetchNavTree,
  fetchFullContext,
  invalidateAndRefetchNavTree,
  invalidateAndRefetchFullContext,
  invalidateAndRefetchAll,
} from "./redux/hierarchyThunks";

// Hooks — Context Variables
export {
  useScopeVariables,
  useResolvedVariables,
  useCreateContextVariable,
  useUpdateContextVariable,
  useDeleteContextVariable,
} from "./hooks/useContextVariables";

// Scope system (new)
export * from "./redux/scope";

// Hooks — Scope Assignments
export { useScopeAssignment } from "./hooks/useScopeAssignment";

// Components — Scope Admin
export { ScopeManagerPage } from "./components/scope-admin";
export { ScopePicker } from "./components/ScopePicker";
export { EntityFilterBar } from "./components/EntityFilterBar";

// Components
export {
  ContextStatusBadge,
  ContextStatusStepper,
} from "./components/ContextStatusBadge";
export { ContextValuePreview } from "./components/ContextValuePreview";
export { ContextScopeBar } from "./components/ContextScopeBar";
export { ContextEmptyState } from "./components/ContextEmptyState";
export { ContextItemCard } from "./components/ContextItemCard";
export { ContextItemTable } from "./components/ContextItemTable";
export { ContextKanban } from "./components/ContextKanban";
export { ContextDashboard } from "./components/ContextDashboard";
export { ContextItemList } from "./components/ContextItemList";
export { ContextItemForm } from "./components/ContextItemForm";
export { ContextItemDetail } from "./components/ContextItemDetail";
export { ContextVersionHistory } from "./components/ContextVersionHistory";
export { ContextTemplateBrowser } from "./components/ContextTemplateBrowser";
export { ContextAnalytics } from "./components/ContextAnalytics";
export { ContextVariablesPanel } from "./components/ContextVariablesPanel";
export { HierarchyExplorer } from "./components/HierarchyExplorer";
export { HierarchyTreePage } from "./components/HierarchyTreePage";
export { HierarchyEntityModal } from "./components/HierarchyEntityModal";
// Components — Context Hub
export { ContextHubDetail } from "./components/hub";

// Components — Hierarchy Selection (standardized system)
export {
  HierarchyTree,
  HierarchyCascade,
  HierarchyBreadcrumb,
  HierarchyCommand,
  HierarchyPills,
  useHierarchySelection,
  useHierarchyReduxBridge,
  EMPTY_SELECTION,
  LEVEL_CONFIG,
} from "./components/hierarchy-selection";
export type {
  HierarchySelection,
  HierarchySelectionProps,
  HierarchyLevel,
  HierarchyOption,
  UseHierarchySelectionReturn,
} from "./components/hierarchy-selection";

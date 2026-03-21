// Context Management — Feature Barrel

// Types
export * from './types';

// Constants
export * from './constants';

// Service
export { contextService } from './service/contextService';

// Hooks
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
} from './hooks/useContextItems';

export { useContextScope } from './hooks/useContextScope';
export { useContextFilters } from './hooks/useContextFilters';
export { useContextKeyboard } from './hooks/useContextKeyboard';

// Components
export { ContextStatusBadge, ContextStatusStepper } from './components/ContextStatusBadge';
export { ContextValuePreview } from './components/ContextValuePreview';
export { ContextScopeBar } from './components/ContextScopeBar';
export { ContextEmptyState } from './components/ContextEmptyState';
export { ContextItemCard } from './components/ContextItemCard';
export { ContextItemTable } from './components/ContextItemTable';
export { ContextKanban } from './components/ContextKanban';
export { ContextDashboard } from './components/ContextDashboard';
export { ContextItemList } from './components/ContextItemList';
export { ContextItemForm } from './components/ContextItemForm';
export { ContextItemDetail } from './components/ContextItemDetail';
export { ContextVersionHistory } from './components/ContextVersionHistory';
export { ContextTemplateBrowser } from './components/ContextTemplateBrowser';
export { ContextAnalytics } from './components/ContextAnalytics';

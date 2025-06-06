// Main custom node editor system exports
export { default as CustomNodeEditor } from './CustomNodeEditor';

// Default node editor that replicates WorkflowNodeEditor
export { default as DefaultNodeEditor } from './DefaultNodeEditor';
export type { TabConfig, CustomTabConfig } from './DefaultNodeEditor';

// Individual tabs that can be used separately or overridden
export { default as OverviewTab } from './tabs/OverviewTab';
export { default as ArgumentsTab } from './tabs/ArgumentsTab';
export { default as MappingsTab } from './tabs/MappingsTab';
export { default as DependenciesTab } from './tabs/DependenciesTab';
export { default as BrokersTab } from './tabs/BrokersTab';
export { default as AdminTab } from './tabs/AdminTab';

// Type exports
export type {
  NodeDataMethods,
  NodeDataContextValue,
  CustomNodeEditorComponentProps,
  CustomNodeEditorProps,
  CustomNodeEditorManagerProps,
  ValidationMode
} from './types';

// Utility exports
export { createNodeDataMethods } from './utils/node-data-methods';

// Component exports
export { default as ErrorDisplay } from './components/ErrorDisplay';
export { default as ChangesIndicator } from './components/ChangesIndicator'; 
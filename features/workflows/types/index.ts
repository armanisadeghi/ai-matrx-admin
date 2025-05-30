// Main exports for workflow editor types

// Core workflow types
export * from './workflow';
export * from './node-data';
export * from './broker';
export * from './validation';

// Existing Python API types (if it exists)
// export * from './python-api';

// Re-export commonly used types for convenience
export type {
  // Workflow types
  EnhancedWorkflowData,
  EnhancedWorkflowStep,
  WorkflowMetadata,
  UserInput,
} from './workflow';

export type {
  // Node types
  WorkflowNodeData,
  WorkflowNodeType,
  BaseWorkflowNodeData,
  RecipeNodeData,
  GenericFunctionNodeData,
  UserInputNodeData,
} from './node-data';

export type {
  // Broker types
  BrokerConnection,
  BrokerVisualization,
  BrokerEdge,
  WorkflowRelays,
} from './broker';

export type {
  // Validation types
  WorkflowValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
} from './validation';

// Factory functions
export {
  createEmptyWorkflow,
  createWorkflowMetadata,
} from './workflow';

export {
  createRecipeNodeData,
  createGenericFunctionNodeData,
  createUserInputNodeData,
} from './node-data';

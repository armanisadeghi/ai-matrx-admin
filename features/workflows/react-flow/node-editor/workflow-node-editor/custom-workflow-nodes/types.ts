'use client';

import { BaseNode, ArgumentOverride, ArgumentMapping, WorkflowDependency } from '@/features/workflows/types';

/**
 * Core interface for all node data operations
 * Provides simple, typed methods for manipulating node data
 */
export interface NodeDataMethods {
  // Basic node properties
  updateStepName: (stepName: string) => void;
  updateFunctionType: (functionType: string) => void;
  updateExecutionRequired: (required: boolean) => void;
  updateStatus: (status: string) => void;
  updateFunctionId: (functionId: string) => void;
  updateWorkflowId: (workflowId: string) => void;
  
  // Argument overrides management
  setArgumentValue: (argName: string, value: any) => void;
  setArgumentReady: (argName: string, ready: boolean) => void;
  setArgumentRequired: (argName: string, required: boolean) => void;
  removeArgumentOverride: (argName: string) => void;
  getArgumentOverride: (argName: string) => ArgumentOverride | undefined;
  getAllArgumentOverrides: () => ArgumentOverride[];
  
  // Argument mappings management
  addArgumentMapping: (targetArgName: string, sourceBrokerId: string) => void;
  updateArgumentMapping: (index: number, sourceBrokerId: string) => void;
  removeArgumentMapping: (index: number) => void;
  removeArgumentMappingsForArg: (argName: string) => void;
  getArgumentMappings: (argName?: string) => ArgumentMapping[];
  
  // Dependencies management
  addDependency: (sourceBrokerId: string, targetBrokerId?: string) => void;
  updateDependency: (index: number, field: 'source_broker_id' | 'target_broker_id', value: string) => void;
  removeDependency: (index: number) => void;
  getDependencies: () => WorkflowDependency[];
  
  // Return broker overrides management
  addReturnBrokerOverride: (brokerId: string) => void;
  updateReturnBrokerOverride: (index: number, brokerId: string) => void;
  removeReturnBrokerOverride: (index: number) => void;
  getReturnBrokerOverrides: () => string[];
  
  // Utility methods
  validateNode: () => boolean;
  resetNode: () => void;
  getNodeSnapshot: () => BaseNode;
  hasUnsavedChanges: () => boolean;
  
  // Computed properties helpers
  getEffectiveArgumentValue: (argName: string) => { value: any; ready: boolean };
  getArgumentsWithMappings: () => Array<{ 
    arg: any; 
    mappings: ArgumentMapping[]; 
    override?: ArgumentOverride;
  }>;
  getAllReturnBrokers: () => Array<{ id: string; type: 'default' | 'override' }>;
  getNodeValidationErrors: () => string[];
}

/**
 * Context value interface for node data management
 */
export interface NodeDataContextValue {
  node: BaseNode;
  methods: NodeDataMethods;
  validationErrors: string[];
  hasChanges: boolean;
}

/**
 * Props for custom node editor components
 */
export interface CustomNodeEditorComponentProps {
  node: BaseNode;
  onNodeUpdate: (node: BaseNode) => void;
}

/**
 * Validation mode for node updates
 */
export type ValidationMode = 'strict' | 'permissive';

/**
 * Props for the main CustomNodeEditor wrapper
 */
export interface CustomNodeEditorProps {
  node: BaseNode | null;
  onSave: (updatedNode: BaseNode) => void;
  onClose: () => void;
  open: boolean;
  component: React.ComponentType<CustomNodeEditorComponentProps>;
  autoSave?: boolean;
  validation?: ValidationMode;
  title?: string;
  width?: string;
  height?: string;
}

/**
 * Props for the CustomNodeEditorManager
 */
export interface CustomNodeEditorManagerProps {
  node: BaseNode;
  onSave: (updatedNode: BaseNode) => void;
  onClose: () => void;
  open: boolean;
  children: React.ReactNode;
  autoSave?: boolean;
  validation?: ValidationMode;
} 
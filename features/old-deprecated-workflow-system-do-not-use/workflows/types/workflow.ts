// Enhanced workflow types for the visual editor

import { WorkflowNodeData } from './node-data';
import { WorkflowRelays, BrokerConnection } from './broker';

// Enhanced workflow step that maps to both visual nodes and Python JSON
export interface EnhancedWorkflowStep {
  // Visual editor properties
  nodeId: string;              // ReactFlow node ID
  nodeType: string;            // ReactFlow node type
  position: { x: number; y: number };
  
  // Core workflow step properties (maps to Python JSON)
  step_name?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  
  // For function-based steps
  function_id?: string;
  override_data?: {
    step_name?: string;
    function_id: string;
    return_broker_override?: string | string[];
    arg_overrides?: ArgOverride[];
    arg_mapping?: { [key: string]: string };
  };
  
  // For workflow recipe executor steps
  function_type?: string;
  arg_mapping?: { [key: string]: string };
  arg_overrides?: ArgOverride[];
  return_broker_override?: string | string[];
  recipe_dependencies?: string[];
  
  // Enhanced visual data
  nodeData: WorkflowNodeData;
}

export interface ArgOverride {
  name: string;
  value?: any;
  default_value?: any;
  ready?: boolean;
  required?: boolean;
}

export interface UserInput {
  broker_id: string;
  value: any;
  description?: string;
  inputType?: 'text' | 'number' | 'json' | 'file' | 'selection';
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version?: string;
  created_date?: string;
  updated_date?: string;
  tags?: string[];
  author?: string;
}

// Enhanced workflow data that includes both visual and execution information
export interface EnhancedWorkflowData {
  // Visual editor state
  visualNodes: EnhancedWorkflowStep[];
  visualEdges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: any;
  }>;
  
  // Broker system
  brokerConnections: Map<string, BrokerConnection>;
  workflow_relays?: WorkflowRelays;
  user_inputs?: UserInput[];
  
  // Workflow metadata
  workflow_metadata: WorkflowMetadata;
  
  // Execution state
  executionHistory?: WorkflowExecution[];
  currentExecution?: WorkflowExecution;
}

export interface WorkflowExecution {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  step_results: { [stepName: string]: any };
}

// Conversion types for transforming between visual and Python JSON
export interface ConversionContext {
  brokerIdMap: Map<string, string>;    // Maps visual broker IDs to actual broker IDs
  stepNameMap: Map<string, string>;    // Maps node IDs to step names
  userInputMap: Map<string, UserInput>;
}

export interface ConversionResult {
  success: boolean;
  pythonWorkflow?: PythonWorkflowData;  // From python-api.ts
  errors: string[];
  warnings: string[];
  context: ConversionContext;
}

// Import from existing python-api.ts
export interface PythonWorkflowData {
  steps: PythonWorkflowStep[];
  workflow_relays?: WorkflowRelays;
  user_inputs?: UserInput[];
  workflow_metadata?: WorkflowMetadata;
}

export interface PythonWorkflowStep {
  // Common fields
  step_name?: string;
  status?: string;
  
  // For function-based steps
  function_id?: string;
  override_data?: {
    step_name?: string;
    function_id: string;
    return_broker_override?: string | string[];
    arg_overrides?: ArgOverride[];
    arg_mapping?: { [key: string]: string };
  };
  
  // For workflow recipe executor steps
  function_type?: string;
  arg_mapping?: { [key: string]: string };
  arg_overrides?: ArgOverride[];
  return_broker_override?: string | string[];
  recipe_dependencies?: string[];
}

// Workflow template types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  workflowData: EnhancedWorkflowData;
}

export interface WorkflowTemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: WorkflowTemplate[];
}

// Validation types
export interface WorkflowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  type: 'missing_required_field' | 'invalid_broker_connection' | 'circular_dependency' | 'invalid_function_id';
  message: string;
  nodeId?: string;
  stepName?: string;
  field?: string;
}

export interface ValidationWarning {
  type: 'unused_broker' | 'missing_optional_field' | 'performance_concern';
  message: string;
  nodeId?: string;
  stepName?: string;
}

export interface ValidationSuggestion {
  type: 'optimization' | 'best_practice' | 'alternative_approach';
  message: string;
  nodeId?: string;
  actionable: boolean;
}

// Factory functions
export const createEmptyWorkflow = (name: string = 'New Workflow'): EnhancedWorkflowData => ({
  visualNodes: [],
  visualEdges: [],
  brokerConnections: new Map(),
  workflow_metadata: {
    id: `workflow-${Date.now()}`,
    name,
    description: '',
    version: '1.0',
    created_date: new Date().toISOString(),
    tags: [],
  },
  user_inputs: [],
});

export const createWorkflowMetadata = (overrides?: Partial<WorkflowMetadata>): WorkflowMetadata => ({
  id: `workflow-${Date.now()}`,
  name: 'New Workflow',
  description: '',
  version: '1.0',
  created_date: new Date().toISOString(),
  tags: [],
  ...overrides,
}); 
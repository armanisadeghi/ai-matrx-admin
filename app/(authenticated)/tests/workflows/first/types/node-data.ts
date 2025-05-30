// Node data interfaces for different workflow step types

import { ValidationRule } from './validation';
import { ArgOverride } from './workflow';

// Base interface for all workflow nodes
export interface BaseWorkflowNodeData {
  // Core identification
  stepName: string;
  stepType: 'recipe' | 'function' | 'userInput';
  
  // For recipe steps
  functionType?: string;       // e.g., "workflow_recipe_executor.recipe_runner"
  recipeId?: string;
  recipeDependencies?: string[];
  
  // For function steps  
  functionId?: string;         // UUID of registered function
  functionName?: string;       // Display name from database
  
  // Common workflow properties
  argMapping: { [key: string]: string };           // param -> broker_id
  argOverrides: ArgOverride[];                     // Static values/overrides
  returnBrokerOverride?: string | string[];        // Output broker(s)
  status: 'pending' | 'running' | 'completed' | 'failed';
  
  // UI State
  brokerInputs: { [paramName: string]: string };  // Visual broker connections
  brokerOutputs: { [resultName: string]: string }; // Visual broker outputs
  
  // Visual properties
  label: string;
  subLabel?: string;
  description?: string;
}

// Specific node data interfaces

export interface RecipeNodeData extends BaseWorkflowNodeData {
  stepType: 'recipe';
  functionType: 'workflow_recipe_executor.recipe_runner';
  recipeId: string;
  modelOverride?: string;
  version?: string;
  recipeDependencies?: string[];
}

export interface IterativeRecipeNodeData extends BaseWorkflowNodeData {
  stepType: 'recipe';
  functionType: 'workflow_recipe_executor.iterative_recipe_preparer' | 'workflow_recipe_executor.iterative_recipe_runner';
  recipeId: string;
  maxCount?: number;
  modelOverride?: string;
  version?: string;
  batchConfigsBrokerId?: string;  // For iterative runner
}

export interface ExtractorNodeData extends BaseWorkflowNodeData {
  stepType: 'recipe';
  functionType: 'workflow_recipe_executor.extractor';
  extractionConfig?: {
    extract: Array<{
      path: string;
      fields: string[];
      flatten?: boolean;
      select_all?: boolean;
    }>;
  };
}

export interface ResultsProcessorNodeData extends BaseWorkflowNodeData {
  stepType: 'recipe';
  functionType: 'workflow_recipe_executor.results_processor';
  processingConfig?: any;
}

export interface GenericFunctionNodeData extends BaseWorkflowNodeData {
  stepType: 'function';
  functionId: string;
  functionName: string;
  functionArgs?: FunctionArgument[];  // From database definition
}

export interface UserInputNodeData extends BaseWorkflowNodeData {
  stepType: 'userInput';
  inputType: 'text' | 'number' | 'json' | 'file' | 'selection';
  defaultValue?: any;
  validationRules?: ValidationRule[];
  isRequired: boolean;
  outputBrokerId: string;
}

// Specialized function node data (for common functions)
export interface TextOperationsNodeData extends BaseWorkflowNodeData {
  stepType: 'function';
  functionId: string;
  functionName: 'orchestrate_text_operations';
  instructions: TextOperation[];
}

export interface TextOperation {
  operation: 'marker_extract_recursive' | 'literal_replace' | 'regex_replace' | 'json_extract';
  params: {
    marker_pairs?: string[][];
    search_text?: string;
    replacement?: string;
    pattern?: string;
    json_path?: string;
  };
}

// Supporting types
export interface FunctionArgument {
  id: string;
  name: string;
  required: boolean;
  data_type: 'str' | 'int' | 'float' | 'bool' | 'list' | 'dict';
  ready: boolean;
  default_value?: any;
  description?: string;
}

export interface ValidationRuleDifferent {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// Union type for all node data types
export type WorkflowNodeData = 
  | RecipeNodeData 
  | IterativeRecipeNodeData 
  | ExtractorNodeData 
  | ResultsProcessorNodeData 
  | GenericFunctionNodeData 
  | UserInputNodeData
  | TextOperationsNodeData;

// Node type mapping for ReactFlow
export type WorkflowNodeType = 
  | 'recipe'
  | 'iterativeRecipe' 
  | 'extractor'
  | 'resultsProcessor'
  | 'genericFunction'
  | 'userInput'
  | 'textOperations'
  // Keep existing integration node types
  | 'agent'
  | 'api'
  | 'database'
  | 'email'
  | 'fileOperation'
  | 'authentication'
  | 'webhook'
  | 'personalTask'
  | 'calendarEvent'
  | 'transform'
  | 'conditional'
  | 'loop'
  | 'delay'
  | 'tool'
  | 'trigger';

// Factory functions for creating new node data
export const createRecipeNodeData = (overrides?: Partial<RecipeNodeData>): RecipeNodeData => ({
  stepName: 'New Recipe',
  stepType: 'recipe',
  functionType: 'workflow_recipe_executor.recipe_runner',
  recipeId: '',
  argMapping: {},
  argOverrides: [],
  status: 'pending',
  brokerInputs: {},
  brokerOutputs: {},
  label: 'Recipe Node',
  ...overrides,
});

export const createGenericFunctionNodeData = (overrides?: Partial<GenericFunctionNodeData>): GenericFunctionNodeData => ({
  stepName: 'New Function',
  stepType: 'function',
  functionId: '',
  functionName: '',
  argMapping: {},
  argOverrides: [],
  status: 'pending',
  brokerInputs: {},
  brokerOutputs: {},
  label: 'Function Node',
  ...overrides,
});

export const createUserInputNodeData = (overrides?: Partial<UserInputNodeData>): UserInputNodeData => ({
  stepName: 'User Input',
  stepType: 'userInput',
  inputType: 'text',
  isRequired: true,
  outputBrokerId: '',
  argMapping: {},
  argOverrides: [],
  status: 'pending',
  brokerInputs: {},
  brokerOutputs: {},
  label: 'User Input',
  ...overrides,
}); 
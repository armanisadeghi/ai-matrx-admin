import { Viewport } from "reactflow";

// Updated types for workflow data
type ArgOverride = {
  name: string;
  value?: any;
  default_value?: any;
  ready?: boolean;
  required?: boolean;
};

type ArgMapping = {
  [key: string]: string;
};

type OverrideData = {
  step_name?: string;
  function_id: string;
  return_broker_override?: string | string[];
  arg_overrides?: ArgOverride[];
  arg_mapping?: ArgMapping;
};

type WorkflowStep = {
  // Common fields
  step_name?: string;
  status?: string;
  
  // For function-based steps
  function_id?: string;
  override_data?: OverrideData;
  
  // For workflow recipe executor steps
  function_type?: string;
  arg_mapping?: ArgMapping;
  arg_overrides?: ArgOverride[];
  return_broker_override?: string | string[];
  recipe_dependencies?: string[];
};

type SimpleRelay = {
  source: string;
  targets: string[];
};

type WorkflowRelays = {
  simple_relays?: SimpleRelay[];
  bidirectional_relays?: any[]; // Define more specifically if needed
  relay_chains?: any[]; // Define more specifically if needed
};

type UserInput = {
  broker_id: string;
  value: any;
};

type CoreWorkflowData = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  created_date?: string;
  auto_execute?: boolean;
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
  viewport?: Viewport;
};

type CompleteWorkflowData = {
  steps: WorkflowStep[];
  workflow_relays?: WorkflowRelays;
  user_inputs?: UserInput[];
  core_workflow_data?: CoreWorkflowData;
};

// Standalone user inputs type for when used separately
type StandaloneUserInputs = UserInput[];
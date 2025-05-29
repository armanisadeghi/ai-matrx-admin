// Simple types for workflow data

type ArgOverride = {
    name: string;
    default_value?: any;
    ready?: boolean;
    required?: boolean;
  };
  
  type ArgMapping = {
    [key: string]: string;
  };
  
  type OverrideData = {
    function_id: string;
    return_broker_override?: string;
    arg_overrides?: ArgOverride[];
    arg_mapping?: ArgMapping;
  };
  
  type WorkflowStep = {
    function_id: string;
    override_data?: OverrideData;
  };
  
  type UserInput = {
    broker_id: string;
    value: any;
  };
  
  type WorkflowData = {
    steps: WorkflowStep[];
    user_inputs: UserInput[];
  };
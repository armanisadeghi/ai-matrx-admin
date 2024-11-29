// src/redux/features/functions/functionsTypes.ts

export interface Function {
  id: string;
  name: string;
  module_path: string;
  class_name: string | null;
  description: string;
  tags: string[];
  args: Arg[];
  returns: Return[];
}

export interface Arg {
  id: string;
  function_id: string;
  name: string;
  required: boolean;
  default: any | null;
  data_type: string;
  ready: boolean;
}

export interface Return {
  id: string;
  function_id: string;
  name: string;
  data_type: string;
}

export interface FunctionsState {
  functions: { [id: string]: Function };
  loading: boolean;
  error: string | null;
}

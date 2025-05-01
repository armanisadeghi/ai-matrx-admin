export interface SqlFunction {
  id?: string;
  name: string;
  schema: string;
  arguments: string;
  argument_types?: string[];
  argument_names?: string[];
  argument_defaults?: string[];
  returns: string;
  language?: string;
  description?: string;
  security_type?: 'SECURITY DEFINER' | 'SECURITY INVOKER';
  definition?: string;
  owner?: string;
  created?: string;
  last_modified?: string;
}

export interface SqlFunctionFilter {
  name?: string;
  schema?: string;
  returnType?: string;
  argumentType?: string;
  securityType?: 'SECURITY DEFINER' | 'SECURITY INVOKER';
}

export interface SqlFunctionSort {
  field: 'name' | 'schema' | 'returns' | 'arguments' | 'security_type';
  direction: 'asc' | 'desc';
} 
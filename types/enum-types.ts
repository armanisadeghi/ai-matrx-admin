export interface DatabaseEnum {
  id?: string;
  name: string;
  schema: string;
  owner?: string;
  values: string[];
  description?: string;
  created?: string;
  last_modified?: string;
  usage_count?: number;
}

export interface EnumValue {
  value: string;
  sort_order?: number;
}

export interface EnumFilter {
  name?: string;
  schema?: string;
  hasValue?: string;
}

export interface EnumSort {
  field: 'name' | 'schema' | 'values_count' | 'usage_count';
  direction: 'asc' | 'desc';
}

export interface CreateEnumRequest {
  name: string;
  schema: string;
  values: string[];
  description?: string;
}

export interface UpdateEnumRequest {
  schema: string;
  name: string;
  valuesToAdd?: string[];
  valuesToRename?: Array<{ oldValue: string; newValue: string }>;
  description?: string;
}

export interface EnumUsage {
  table_name: string;
  column_name: string;
  schema: string;
  constraint_name?: string;
} 
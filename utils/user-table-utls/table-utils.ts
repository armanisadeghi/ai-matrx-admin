import { SupabaseClient } from '@supabase/supabase-js';

// Valid data types according to the backend schema
export const VALID_DATA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'date',
  'datetime',
  'json',
  'array'
] as const;

export type ValidDataType = typeof VALID_DATA_TYPES[number];

// Mapping common variations to valid data types
const DATA_TYPE_MAPPING: Record<string, ValidDataType> = {
  // Common variations for string
  'text': 'string',
  'varchar': 'string',
  'char': 'string',
  'str': 'string',
  
  // Common variations for number
  'float': 'number',
  'double': 'number',
  'decimal': 'number',
  'numeric': 'number',
  
  // Common variations for integer
  'int': 'integer',
  'bigint': 'integer',
  'smallint': 'integer',
  
  // Common variations for boolean
  'bool': 'boolean',
  
  // Common variations for date/time
  'timestamp': 'datetime',
  'timestamptz': 'datetime',
  'time': 'datetime',
  'timetz': 'datetime',
  
  // Common variations for json
  'jsonb': 'json',
  
  // Common variations for array
  'arrays': 'array'
};

export interface FieldDefinition {
  field_name: string;
  display_name: string;
  data_type: string;
  field_order: number;
  is_required: boolean;
  default_value?: any;
}

export interface TableField extends FieldDefinition {
  id: string;
}

export interface CreateTableParams {
  tableName: string;
  description?: string;
  isPublic?: boolean;
  authenticatedRead?: boolean;
  fields?: FieldDefinition[] | null;
}

export interface CreateTableResult {
  success: boolean;
  tableId?: string;
  error?: string;
}

export interface AddColumnParams {
  tableId: string;
  fieldName: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  defaultValue?: any;
}

export interface AddColumnResult {
  success: boolean;
  columnId?: string;
  error?: string;
}

export interface AddRowParams {
  tableId: string;
  data: Record<string, any>;
}

export interface AddRowResult {
  success: boolean;
  rowId?: string;
  error?: string;
}

export interface GetTableResult {
  success: boolean;
  table?: {
    id: string;
    name: string;
    description: string;
    is_public: boolean;
    authenticated_read: boolean;
  };
  fields?: TableField[];
  error?: string;
}

/**
 * Normalize a data type string to ensure it's one of the valid types
 */
export function normalizeDataType(dataType: string): ValidDataType {
  dataType = dataType.toLowerCase().trim();
  
  // If it's already a valid type, return it
  if (VALID_DATA_TYPES.includes(dataType as ValidDataType)) {
    return dataType as ValidDataType;
  }
  
  // Check if we have a mapping for this type
  if (dataType in DATA_TYPE_MAPPING) {
    return DATA_TYPE_MAPPING[dataType];
  }
  
  // Default to string if unknown
  console.warn(`Unknown data type: ${dataType}, defaulting to string`);
  return 'string';
}

/**
 * Create a new user-generated table
 */
export async function createTable(
  supabase: SupabaseClient,
  params: CreateTableParams
): Promise<CreateTableResult> {
  try {
    const { tableName, description = '', isPublic = false, authenticatedRead = false, fields = null } = params;
    
    if (!tableName.trim()) {
      return { success: false, error: 'Table name is required' };
    }
    
    // Normalize data types in fields if provided
    const normalizedFields = fields?.map(field => ({
      ...field,
      data_type: normalizeDataType(field.data_type)
    }));
    
    // Call the RPC function
    const { data, error } = await supabase.rpc('create_new_user_table_dynamic', {
      p_table_name: tableName,
      p_description: description,
      p_is_public: isPublic,
      p_authenticated_read: authenticatedRead,
      p_initial_fields: normalizedFields
    });
    
    if (error) {
      console.error("Supabase RPC error:", error);
      return { success: false, error: error.message };
    }
    
    if (!data || !data.success) {
      console.error("API response error:", data);
      return { success: false, error: data?.error || 'Failed to create table' };
    }
    
    return { success: true, tableId: data.table_id };
  } catch (err) {
    console.error('Error creating table:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Add a column to an existing table
 */
export async function addColumn(
  supabase: SupabaseClient,
  params: AddColumnParams
): Promise<AddColumnResult> {
  try {
    const { tableId, fieldName, displayName, dataType, isRequired, defaultValue } = params;
    
    if (!fieldName.trim()) {
      return { success: false, error: 'Field name is required' };
    }
    
    if (!displayName.trim()) {
      return { success: false, error: 'Display name is required' };
    }
    
    // Normalize the data type
    const normalizedDataType = normalizeDataType(dataType);
    
    // Format default value based on data type
    let formattedDefaultValue = null;
    if (defaultValue !== undefined && defaultValue !== null) {
      switch (normalizedDataType) {
        case 'number':
          formattedDefaultValue = typeof defaultValue === 'number' 
            ? defaultValue 
            : parseFloat(String(defaultValue));
          break;
        case 'integer':
          formattedDefaultValue = typeof defaultValue === 'number' 
            ? Math.floor(defaultValue) 
            : parseInt(String(defaultValue));
          break;
        case 'boolean':
          formattedDefaultValue = typeof defaultValue === 'boolean' 
            ? defaultValue 
            : String(defaultValue).toLowerCase() === 'true';
          break;
        default:
          formattedDefaultValue = defaultValue;
      }
    }
    
    // Call the RPC function
    const { data, error } = await supabase.rpc('add_column_to_user_table', {
      p_table_id: tableId,
      p_field_name: fieldName,
      p_display_name: displayName,
      p_data_type: normalizedDataType,
      p_is_required: isRequired,
      p_default_value: formattedDefaultValue
    });
    
    if (error) {
      console.error("Supabase RPC error:", error);
      return { success: false, error: error.message };
    }
    
    if (!data || !data.success) {
      console.error("API response error:", data);
      return { success: false, error: data?.error || 'Failed to add column' };
    }
    
    return { success: true, columnId: data.column_id };
  } catch (err) {
    console.error('Error adding column:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get table details including fields
 */
export async function getTableDetails(
  supabase: SupabaseClient,
  tableId: string
): Promise<GetTableResult> {
  try {
    const { data, error } = await supabase.rpc('get_user_table_complete', {
      p_table_id: tableId
    });
    
    if (error) {
      console.error("Supabase RPC error:", error);
      return { success: false, error: error.message };
    }
    
    if (!data || !data.success) {
      console.error("API response error:", data);
      return { success: false, error: data?.error || 'Failed to load table details' };
    }
    
    return { 
      success: true, 
      table: data.table,
      fields: data.fields
    };
  } catch (err) {
    console.error('Error loading table details:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Add a row of data to a table
 */
export async function addRow(
  supabase: SupabaseClient,
  params: AddRowParams
): Promise<AddRowResult> {
  try {
    const { tableId, data } = params;
    
    // Call the RPC function
    const { data: result, error } = await supabase.rpc('add_data_row_to_user_table', {
      p_table_id: tableId,
      p_data: data
    });
    
    if (error) {
      console.error("Supabase RPC error:", error);
      return { success: false, error: error.message };
    }
    
    if (!result || !result.success) {
      console.error("API response error:", result);
      return { success: false, error: result?.error || 'Failed to add row' };
    }
    
    return { success: true, rowId: result.row_id };
  } catch (err) {
    console.error('Error adding row:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: errorMessage };
  }
} 
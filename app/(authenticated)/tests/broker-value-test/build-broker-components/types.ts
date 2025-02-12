// First, let's define our component schema system
type FieldType = 
  | 'text'
  | 'number'
  | 'select'
  | 'boolean'
  | 'color'
  | 'size'
  | 'orientation'
  | 'options';

interface FieldSchema {
  type: FieldType;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  dependsOn?: {
    field: string;
    value: any;
  };
}

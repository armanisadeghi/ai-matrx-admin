export type ComponentType = 
  | 'input' 
  | 'textarea' 
  | 'select' 
  | 'multiselect' 
  | 'radio' 
  | 'checkbox' 
  | 'slider' 
  | 'number' 
  | 'date'
  | 'switch'
  | 'button'
  | 'rangeSlider'
  | 'numberPicker'
  | 'jsonField'
  | 'fileUpload';

export interface FieldOption {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  iconName?: string;
}

export interface ComponentProps {
  // Numbers and sliders
  min?: number;
  max?: number;
  step?: number;
  
  // Textarea
  rows?: number;
  
  // Date
  minDate?: string;
  maxDate?: string;
  
  // For switch component
  onLabel?: string;
  offLabel?: string;
}

export interface FieldDefinition {
  // Core field properties
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  group?: string;
  iconName?: string;

  // Basic component properties
  component: ComponentType;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: any;
  
  // Options for select, multiselect, radio, checkbox
  options?: FieldOption[];
  
  // Component-specific properties 
  componentProps: ComponentProps;
  
  // Option for including "Other" input field
  includeOther?: boolean;
}

// Function to normalize a field definition by adding missing properties
export function normalizeFieldDefinition(field: Partial<FieldDefinition>): FieldDefinition {
  // Create default component props based on component type
  const componentType = field.component || 'input';
  const defaultComponentProps: ComponentProps = {
    // Number defaults
    min: 0,
    max: 100,
    step: 1,
    
    // Textarea defaults
    rows: 3,
    
    // Date defaults
    minDate: '',
    maxDate: '',
    
    // Switch defaults
    onLabel: 'Yes',
    offLabel: 'No'
  };
  
  // Merge with provided componentProps
  const mergedComponentProps = {
    ...defaultComponentProps,
    ...(field.componentProps || {})
  };
  
  // Create the normalized field with all properties
  return {
    // Core defaults
    id: field.id || 'temp-id', // Should be replaced with UUID in practice
    label: field.label || 'Untitled Field',
    description: field.description || '',
    helpText: field.helpText || '',
    group: field.group || 'default',
    iconName: field.iconName || '',
    
    // Component defaults
    component: componentType,
    required: field.required !== undefined ? field.required : false,
    disabled: field.disabled !== undefined ? field.disabled : false,
    placeholder: field.placeholder || '',
    defaultValue: field.defaultValue !== undefined ? field.defaultValue : '',
    
    // Options (empty array if not provided)
    options: field.options || [],
    
    // Component props
    componentProps: mergedComponentProps,
    
    // Other option
    includeOther: field.includeOther !== undefined ? field.includeOther : false
  };
} 
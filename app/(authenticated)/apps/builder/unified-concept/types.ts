export type ComponentType = 
  | 'input' 
  | 'textarea' 
  | 'select' 
  | 'multiselect' 
  | 'radio' 
  | 'checkbox' 
  | 'slider' 
  | 'number' 
  | 'date';

export interface FieldOption {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  iconName?: string;
}

export interface ComponentProps {
  // Text inputs
  maxLength?: number;
  minLength?: number;
  
  // Numbers and sliders
  min?: number;
  max?: number;
  step?: number;
  
  // Textarea
  rows?: number;
  
  // Date
  minDate?: string;
  maxDate?: string;
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
} 
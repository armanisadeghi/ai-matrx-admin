/**
 * Variable Component Types
 * 
 * Defines custom input components for prompt variables.
 * All components ultimately return a text value.
 */

export type VariableComponentType = 
  | 'textarea'    // Default - multi-line text
  | 'toggle'      // On/Off with custom labels
  | 'radio'       // Single select from options
  | 'checkbox'    // Multi-select from options
  | 'select'      // Dropdown single select
  | 'number';     // Number input with optional min/max/step

/**
 * Configuration for custom variable components
 */
export interface VariableCustomComponent {
  /** Type of component to render */
  type: VariableComponentType;
  
  /** Options for radio, checkbox, and select components */
  options?: string[];
  
  /** Custom labels for toggle [off, on] - defaults to ['No', 'Yes'] */
  toggleValues?: [string, string];
  
  /** Minimum value for number input */
  min?: number;
  
  /** Maximum value for number input */
  max?: number;
  
  /** Step increment for number input - defaults to 1 */
  step?: number;
}

/**
 * Extended prompt variable with optional custom component
 */
export interface PromptVariableWithComponent {
  name: string;
  defaultValue: string;
  customComponent?: VariableCustomComponent;
}


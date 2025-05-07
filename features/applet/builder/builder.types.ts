import { FieldBuilder } from "@/lib/redux/app-builder/types";
import { AppletLayoutOption } from "../layouts/options/layout.types";
import { AppletSourceConfig } from "@/lib/redux/app-builder/service/customAppletService";

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

  options?: FieldOption[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

export type AppletContainer = {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  hideDescription?: boolean;
  helpText?: string;
  fields: FieldDefinition[];
};

export interface Broker {
  id: string;
  name: string;
  required: boolean;
  dataType: string;
  defaultValue: string;
  inputComponent: string;
}

export interface BrokerMapping {
  appletId: string;
  fieldId: string;
  brokerId: string;
}

export type SourceConfig = {
  sourceConfig?: AppletSourceConfig[];
  brokerMappings?: BrokerMapping[];
}


export type CustomApplet = {
  id: string;
  name: string;
  description?: string;
  slug: string;
  appletIcon?: string;
  appletSubmitText?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  layoutType?: AppletLayoutOption;
  containers?: AppletContainer[];
  dataSourceConfig?: SourceConfig;
  resultComponentConfig?: any;
  nextStepConfig?: any;
  compiledRecipeId?: string;
  subcategoryId?: string;
  imageUrl?: string;
  appId?: string;
};

export type AppLayoutOptions = "tabbedApplets" | "singleDropdown" | "multiDropdown" | "singleDropdownWithSearch" | "icons";


export type CustomAppRuntimeConfig = {
  id: string;
  name: string;
  description: string;
  slug: string;
  mainAppIcon?: string;
  mainAppSubmitIcon?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  appletList?: { appletId: string; label: string }[];
  extraButtons?: {
      label: string;
      actionType: string;
      knownMethod: string;
  }[];
  layoutType?: AppLayoutOptions;
  imageUrl?: string;
};







// Function to normalize a field definition by adding missing properties
export function normalizeFieldDefinition(field: Partial<FieldDefinition> | Partial<FieldBuilder>): FieldDefinition {
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

export type CustomActionButton = {
  label: string;
  actionType: string;
  knownMethod: string;
}


export type CustomAppConfig = {
  id?: string;
  name: string;
  description: string;
  slug: string;
  mainAppIcon?: string;
  mainAppSubmitIcon?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  appletList?: { appletId: string; label: string }[];
  extraButtons?: CustomActionButton[];
  layoutType?: AppLayoutOptions;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  isPublic?: boolean;
  authenticatedRead?: boolean;
  publicRead?: boolean;
};

export type CustomAppletConfig = {
  id: string;
  name: string;
  description?: string;
  slug: string;
  appletIcon?: string;
  appletSubmitText?: string;
  creator?: string;
  primaryColor?: string;
  accentColor?: string;
  layoutType?: AppletLayoutOption;
  containers?: AppletContainer[];
  dataSourceConfig?: any;
  resultComponentConfig?: any;
  nextStepConfig?: any;
  compiledRecipeId?: string;
  subcategoryId?: string;
  imageUrl?: string;
  appId?: string;
};

export type ComponentGroup = {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  hideDescription?: boolean;
  helpText?: string;
  fields: FieldDefinition[];
  isPublic?: boolean;
  authenticatedRead?: boolean;
  publicRead?: boolean;
};



import { FieldBuilder } from "@/lib/redux/app-builder/types";
import { ReactNode } from "react";


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
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  minDate?: string;
  maxDate?: string;
  onLabel?: string;
  offLabel?: string;
  multiSelect?: boolean;
  maxItems?: number;
  minItems?: number;
  gridCols?: number;
  autoComplete?: string;
  direction?: "vertical" | "horizontal";
  customContent?: ReactNode;
  showSelectAll?: boolean;
  width?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxLength?: number;
  spellCheck?: boolean;
}

export interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  group?: string;
  iconName?: string;
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


export interface WorkflowSourceConfig {
  sourceType: "workflow";
  id: string;
  workflowId: string;
  [key: string]: any;
}

export interface ApiSourceConfig {
  sourceType: "api";
  id: string;
  [key: string]: any;
}

export interface DatabaseSourceConfig {
  sourceType: "database";
  id: string;
  [key: string]: any;
}

export interface OtherSourceConfig {
  sourceType: "other";
  id: string;
  [key: string]: any;
}

export interface NeededBroker {
  id: string;
  name: string;
  required: boolean;
  dataType: string;
  defaultValue: string;
}

export interface RecipeSourceConfig {
  id: string;
  compiledId: string;
  version: number;
  neededBrokers: NeededBroker[];
}

export interface AppletSourceConfig {
  sourceType?: "recipe" | "workflow" | "api" | "database" | "other" | string;
  config?: RecipeSourceConfig | WorkflowSourceConfig | ApiSourceConfig | DatabaseSourceConfig | OtherSourceConfig;
}


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

export type AppletLayoutOption =
    | "horizontal"
    | "vertical"
    | "stepper"
    | "flat"
    | "open"
    | "oneColumn"
    | "twoColumn"
    | "threeColumn"
    | "fourColumn"
    | "tabs"
    | "accordion"
    | "minimalist"
    | "floatingCard"
    | "sidebar"
    | "carousel"
    | "cardStack"
    | "contextual"
    | "chat"
    | "mapBased"
    | "fullWidthSidebar"
    | "input-bar";


export type AppLayoutOptions = "tabbedApplets" | "singleDropdown" | "multiDropdown" | "singleDropdownWithSearch" | "icons";



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
  appletList?: { appletId: string; label: string; slug: string }[];
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
  brokerMap?: BrokerMapping[];
};



export function normalizeFieldDefinition(field: Partial<FieldDefinition> | Partial<FieldBuilder>): FieldDefinition {
  const componentType = field.component || 'textarea';
  const defaultComponentProps: ComponentProps = {
    min: 0,
    max: 100,
    step: 1,
    rows: 3,
    minDate: '',
    maxDate: '',
    onLabel: 'Yes',
    offLabel: 'No',
    multiSelect: false,
    maxItems: undefined,
    minItems: 0,
    gridCols: 1,
    autoComplete: 'off',
    direction: 'vertical',
    customContent: undefined,
    showSelectAll: false,
    width: '100%',
    valuePrefix: '',
    valueSuffix: '',
    maxLength: undefined,
    spellCheck: false
  };
  
  const mergedComponentProps = {
    ...defaultComponentProps,
    ...(field.componentProps || {})
  };
  
  return {
    id: field.id || 'temp-id',
    label: field.label || 'Untitled Field',
    description: field.description || '',
    helpText: field.helpText || '',
    group: field.group || 'default',
    iconName: field.iconName || '',
    component: componentType,
    required: field.required !== undefined ? field.required : false,
    disabled: field.disabled !== undefined ? field.disabled : false,
    placeholder: field.placeholder || '',
    defaultValue: field.defaultValue !== undefined ? field.defaultValue : '',
    options: field.options || [],
    componentProps: mergedComponentProps,
    includeOther: field.includeOther !== undefined ? field.includeOther : false
  };
}

export type ComponentGroup = AppletContainer & {
  isPublic?: boolean;
  authenticatedRead?: boolean;
  publicRead?: boolean;
};


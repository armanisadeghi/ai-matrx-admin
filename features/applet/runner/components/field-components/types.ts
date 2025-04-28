// types.ts - Updated with new field configurations
import { ReactNode } from "react";

export interface AppletListItemConfig {
    value: string;
    label: string;
    icon?: ReactNode;
}

// Base configuration for all field components
export interface BaseFieldProps {
    id: string;
    label: string;
    placeholder?: string;
    isLast?: boolean;
    actionButton?: ReactNode;
    defaultValue?: any;
    onValueChange?: (value: any) => void;
}

// Common field display properties
export interface FieldDisplayProps {
    subtitle?: string;
    helpText?: string;
    width?: string;
}
// Button type configurations
export interface ButtonFieldConfig extends FieldDisplayProps {
    values: string[];
    title?: string;
    width?: string;
    gridCols?: string;
    buttonClassName?: string;
}

// Updated Select type configurations
export interface SelectOption extends FieldDisplayProps {
    value: string;
    label: string;
    icon?: ReactNode;
    group?: string;
}

export interface SelectFieldConfig extends FieldDisplayProps {
    options: SelectOption[];
    inputPlaceholder?: string;
    emptyMessage?: string;
    width?: string;
    showGroups?: boolean;
}

// Input type configurations
export interface InputFieldConfig extends FieldDisplayProps {
    type?: string;
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
    autoComplete?: string;
    width?: string;
    inputClassName?: string;
}

// Textarea type configurations
export interface TextareaFieldConfig extends FieldDisplayProps {
    rows?: number;
    maxLength?: number;
    resize?: "none" | "vertical" | "horizontal" | "both";
    width?: string;
    textareaClassName?: string;
}

// Number input configurations
export interface NumberInputFieldConfig extends InputFieldConfig {
    iconSize?: number;
    subtitle?: string; // Add subtitle property here
    helpText?: string; // Also add helpText for consistency
}

// Single checkbox configuration
export interface CheckboxFieldConfig extends FieldDisplayProps {
    checkboxLabel?: string;
    required?: boolean;
    defaultChecked?: boolean;
    value?: string;
    customCssClass?: string;
}

// Checkbox group configurations
export interface CheckboxOption extends FieldDisplayProps {
    id: string;
    label: string;
    value: string;
    checked?: boolean;
}

export interface CheckboxGroupFieldConfig extends FieldDisplayProps {
    options: CheckboxOption[];
    includeOther?: boolean;
    otherPlaceholder?: string;
    width?: string;
    direction?: "vertical" | "horizontal";
    checkboxClassName?: string;
    minOptionWidth?: number;
}

// Radio group configurations
export interface RadioOption extends FieldDisplayProps {
    id: string;
    label: string;
    value: string;
    description?: string;
}

export interface RadioGroupFieldConfig extends FieldDisplayProps {
    options: RadioOption[];
    includeOther?: boolean;
    otherPlaceholder?: string;
    width?: string;
    direction?: "vertical" | "horizontal";
    radioClassName?: string;
}

// Slider configurations
export interface SliderFieldConfig extends FieldDisplayProps {
    min?: number;
    max?: number;
    step?: number;
    showMarks?: boolean;
    markCount?: number;
    showInput?: boolean;
    showMinMaxLabels?: boolean;
    minLabel?: string;
    maxLabel?: string;
    valuePrefix?: string;
    valueSuffix?: string;
    width?: string;
    trackClassName?: string;
    thumbClassName?: string;
    range?: boolean;
    sliderClassName?: string;
}

// MultiSelect configurations
export interface MultiSelectFieldConfig extends FieldDisplayProps {
    options: SelectOption[];
    maxItems?: number;
    showSearch?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
    createNewOption?: boolean;
    createNewMessage?: string;
    width?: string;
    maxHeight?: string;
    chipClassName?: string;
    dropdownClassName?: string;
    showSelectAll?: boolean;
    allowClear?: boolean;
}

// Generic field props with configuration type
export interface FieldProps<T = {}> extends BaseFieldProps {
    customConfig?: T;
    customContent?: ReactNode;
    isMobile?: boolean;
}

// Legacy types for backward compatibility
export interface CommandItemConfig {
    label: string;
    value: string;
    icon?: ReactNode;
}

export interface CommandGroupConfig {
    heading: string;
    items: CommandItemConfig[];
}

// Field configuration with broker ID
export interface GroupFieldConfig {
    brokerId: string;
    label: string;
    placeholder?: string;
    helpText?: string;
    type: "button" | "select" | "input" | "textarea" | "number" | "date" | "checkbox" | "radio" | "slider" | "multiselect";
    customConfig?:
        | ButtonFieldConfig
        | SelectFieldConfig
        | InputFieldConfig
        | TextareaFieldConfig
        | NumberInputFieldConfig
        | CheckboxFieldConfig
        | CheckboxGroupFieldConfig
        | RadioGroupFieldConfig
        | SliderFieldConfig
        | MultiSelectFieldConfig;
    isRequired?: boolean;
    isMobile?: boolean;
}

export interface GroupConfig {
    tab: AppletListItemConfig;
    fields: GroupFieldConfig[];
    title?: string;
    description?: string;
}

export interface AppletContainersConfig {
    id: string;
    label: string;
    placeholder: string;
    description?: string;
    fields: GroupFieldConfig[];
}

export interface AvailableAppletConfigs {
    [key: string]: AppletContainersConfig[];
}

export interface HeaderExtraButtonsConfig {
    label: string;
    icon?: ReactNode;
    actionType?: "button" | "link" | "redux" | "none";
    onClick?: () => void;
    route?: string;
    reduxAction?: string;
    knownMethod?: "renderChat" | "changeApplet" | "renderModal" | "none";
}

export interface CustomAppConfig {
    name: string;
    description: string;
    slug: string;
    icon: string;
    creator: string;
    primaryColor: string;
    accentColor: string;
    appletList: AppletListItemConfig[];
    extraButtons: HeaderExtraButtonsConfig[];
}

// Group configuration
// Group component props
export interface FieldGroupProps {
    id: string;
    label: string;
    placeholder?: string;
    groups: GroupConfig[];
    activeTab?: string;
    onTabChange?: (tabValue: string) => void;
    onSubmit?: () => void;
    submitButtonText?: string;
    cancelButtonText?: string;
    onCancel?: () => void;
    isExpanded?: boolean;
    width?: string;
    maxHeight?: string;
    isMobile?: boolean;
}

// types.ts
import { ReactNode } from "react";

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

// Button type configurations
export interface ButtonFieldConfig {
    values: string[];
    title?: string;
    width?: string;
    gridCols?: string;
    buttonClassName?: string;
}

// Updated Select type configurations
export interface SelectOption {
    value: string;
    label: string;
    icon?: ReactNode;
    group?: string;
}

export interface SelectFieldConfig {
    options: SelectOption[];
    inputPlaceholder?: string;
    emptyMessage?: string;
    width?: string;
    showGroups?: boolean;
}

// Input type configurations
export interface InputFieldConfig {
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
export interface TextareaFieldConfig {
    rows?: number;
    maxLength?: number;
    resize?: "none" | "vertical" | "horizontal" | "both";
    width?: string;
    textareaClassName?: string;
}

// Generic field props with configuration type
export interface FieldProps<T = {}> extends BaseFieldProps {
    customConfig?: T;
    customContent?: ReactNode;
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

// Tab configuration
export interface TabConfig {
    value: string;
    label: string;
    icon?: ReactNode;
}

// Field configuration with broker ID
export interface GroupFieldConfig {
    brokerId: string;
    label: string;
    placeholder?: string;
    type: "button" | "select" | "input" | "textarea" | "number" | "date";
    customConfig?: ButtonFieldConfig | SelectFieldConfig | InputFieldConfig | TextareaFieldConfig;
    isRequired?: boolean;
    helpText?: string;
}

export interface SearchGroupConfig {
    id: string;
    label: string;
    placeholder: string;
    fields: GroupFieldConfig[];
}

export interface TabSearchConfig {
    [key: string]: SearchGroupConfig[];
}



// Group configuration
export interface GroupConfig {
    tab: TabConfig;
    fields: GroupFieldConfig[];
    title?: string;
    description?: string;
}

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
}

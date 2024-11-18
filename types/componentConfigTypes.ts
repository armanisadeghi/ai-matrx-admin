// types.ts
import { Card } from "@/components/ui";
import { HTMLMotionProps } from "framer-motion";
import React from "react";


export type FormLayoutOptions = 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
export type FormColumnOptions = number | 'auto' | { xs: number, sm: number, md: number, lg: number, xl: number };
export type FormDirectionOptions = 'row' | 'column' | 'row-reverse' | 'column-reverse';

export interface FlexAnimatedFormProps {
    fields: FlexFormField[];
    formState: FormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
    className?: string;
    isFullPage?: boolean;
    columns?: number | 'auto' | { xs: number, sm: number, md: number, lg: number, xl: number };
    layout?: 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
    enableSearch?: boolean;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
}


// Core Types
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentDensity = 'compact' | 'normal' | 'comfortable';
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
export type ComponentState = 'idle' | 'loading' | 'success' | 'error' | 'disabled';
export type AnimationPreset = 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';


// Base Props Interface
export interface BaseMatrxProps {
    // Core UI Props
    className?: string;
    style?: React.CSSProperties;
    id?: string;

    // State Props
    busy?: boolean;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    loading?: boolean;

    // Styling Props
    size?: ComponentSize;
    density?: ComponentDensity;
    variant?: ComponentVariant;
    fullWidth?: boolean;

    // Animation Props
    animation?: AnimationPreset;
    disableAnimation?: boolean;
    animationDelay?: number;

    // State & Error Handling
    state?: ComponentState;
    error?: string;
    hint?: string;
    valid?: boolean;

    // Accessibility Props
    'aria-label'?: string;
    'aria-describedby'?: string;
    tabIndex?: number;

    // Event Handlers
    onClick?: (event: React.MouseEvent) => void;
    onFocus?: (event: React.FocusEvent) => void;
    onBlur?: (event: React.FocusEvent) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
}

export interface FormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    section?: string;
    min?: number;
    max?: number;
    step?: number;
    accept?: string;
    multiple?: boolean;
    src?: string;
    alt?: string;
    jsonSchema?: object;
}

export interface AnimatedCheckboxProps extends BaseMatrxProps {
    field: FormField;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    error?: string;
    hint?: string;
}

// Component Specific Props
export interface MatrxButtonProps extends BaseMatrxProps {
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
    children?: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface MatrxButtonGroupProps extends BaseMatrxProps {
    children: React.ReactNode;
    orientation?: 'horizontal' | 'vertical';
    attached?: boolean;
}

export interface MatrxInputProps extends BaseMatrxProps {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    hideLabel?: boolean;
}

export interface MatrxInputGroupProps extends BaseMatrxProps {
    children: React.ReactNode;
    label?: string;
    orientation?: 'horizontal' | 'vertical';
    attached?: boolean;
}

export interface MatrxRadioProps extends BaseMatrxProps {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    layout?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
    showSelectAll?: boolean;
    optionClassName?: string;
}

export interface MatrxRadioGroupProps extends BaseMatrxProps {
    children: React.ReactNode;
    label?: string;
    layout?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
    showSelectAll?: boolean;
}

export interface SelectOption {
    label: string;
    value: string;
    disabled?: boolean;
    description?: string;
    icon?: React.ReactNode;
}

export interface MatrxSelectProps extends BaseMatrxProps {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    options?: SelectOption[];
    hideLabel?: boolean;
    placeholder?: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    allowClear?: boolean;
    searchable?: boolean;
}

export interface MatrxSelectGroupProps extends BaseMatrxProps {
    children: React.ReactNode;
    label?: string;
    orientation?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
}

export interface MatrxBaseInputProps extends BaseMatrxProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof BaseMatrxProps> {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
}

export type TextareaMode = 'plain' | 'outlined' | 'filled' | 'markdown' | 'rich';
export type TextareaSize = 'compact' | 'default' | 'large' | 'article' | 'custom';

export interface MatrxTextareaProps extends BaseMatrxProps {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    // Textarea-specific styling
    mode?: TextareaMode;
    contentSize?: TextareaSize;
    // Behavior props
    maxLength?: number;
    showCount?: boolean;
    autoResize?: boolean;
    minRows?: number;
    maxRows?: number;
    hideLabel?: boolean;
    characterLimit?: number;
    wordLimit?: number;
    toolbar?: boolean;
    placeholder?: string;
}


export interface MatrxJsonItemProps extends BaseMatrxProps {
    keyName: string;
    value: any;
    isExpanded: boolean;
    onToggle: (key: string) => void;
    isKeyExpanded: (key: string) => boolean;
    path: string;
    isLastItem: boolean;
}

export interface JsonItemConfig {
    arrayThreshold: number;  // Maximum array items before collapsing
    truncateThreshold: number;  // Maximum object entries before truncating
    indentSize: string;  // Tailwind padding size for indentation
}

export interface MatrxJsonViewerProps extends BaseMatrxProps {
    data: any;
    initialExpanded?: boolean;
    maxHeight?: string;
    hideControls?: boolean;
    onCopy?: (data: string) => void;
    onExpandChange?: (expanded: boolean) => void;
}

export interface MatrxFullJsonViewerProps extends MatrxJsonViewerProps {
    title?: string;
    hideTitle?: boolean;
    cardProps?: React.ComponentProps<typeof Card>;
}


// Utility Types
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type MatrxComponentProps<T> = BaseMatrxProps & T;

// Form State Type
export interface FormState {
    [key: string]: any;
}

export type FormFieldType =
    'text'
    | 'email'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'password'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
    | 'tel'
    | 'url'
    | 'color'
    | 'slider'
    | 'switch'
    | 'json'
    | 'file'
    | 'image'
    | 'rating';

export interface FlexFormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    section?: string;
    min?: number;
    max?: number;
    step?: number;
    accept?: string;
    multiple?: boolean;
    src?: string;
    alt?: string;
    jsonSchema?: object;
}



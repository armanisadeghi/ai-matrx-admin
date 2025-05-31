// types.ts
import { Card } from "@/components/ui";
import React, { MutableRefObject } from "react";
import { MatrxVariant } from "@/components/matrx/ArmaniForm/field-components/types";
import { EntityKeys } from "@/types/entityTypes";
import { EntityStateField, MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { FormDensity } from "@/components/matrx/ArmaniForm/ArmaniForm";
import { UnifiedCrudHandlers } from "@/components/matrx/Entity";
import { ENTITY_FORM_COMPONENTS } from "@/app/entities/forms";
import type { EntityFormType } from "@/app/entities/forms";

export interface LayoutProps {
    selectedEntity: EntityKeys | null;
    isExpanded?: boolean;
    setIsExpanded?: (expanded: boolean) => void;
    handleEntityChange: (value: EntityKeys) => void;
    QuickReferenceComponent: React.ReactNode;
    rightColumnRef: MutableRefObject<HTMLDivElement | null>;
    selectHeight: number;
    density: ComponentDensity;
    animationPreset: AnimationPreset;
    formOptions?: any;
    splitRatio?: number;
    onCreateEntityClick?: () => void;
    floatingLabel?: boolean;
}

export const COMPONENT_STATES = ["idle", "loading", "success", "error", "disabled"] as const;
export type ComponentState = (typeof COMPONENT_STATES)[number];

export interface ResponsiveColumns {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export const FORM_VARIATIONS = [
    "fullWidthSinglePage",
    "fullWidthMultiStep",
    "twoColumnSinglePage",
    "threeColumnSinglePage",
    "restrictedWidthSinglePage",
    "singlePageModal",
    "multiStepModal",
] as const;

export type FormVariationOptions = (typeof FORM_VARIATIONS)[number];

// Component Display Options
export const ANIMATION_PRESETS = ["none", "subtle", "smooth", "energetic", "playful", "feedback", "error"] as const;
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export const DENSITIES = ["compact", "normal", "comfortable"] as const;
export type ComponentDensity = (typeof DENSITIES)[number];

export const COMPONENT_SIZES = ["default", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "icon"] as const;
export type ComponentSize = (typeof COMPONENT_SIZES)[number];

export const TEXT_SIZES = ["default", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "hideText"] as const;
export type TextSizeOptions = (typeof TEXT_SIZES)[number];

// Layout Options
export const PAGE_LAYOUTS = ["split", "sideBySide", "stacked", "resizable", "newSplit"] as const;
export type PageLayoutOptions = (typeof PAGE_LAYOUTS)[number];

export const FORM_LAYOUTS = [
    "grid",
    "sections",
    "accordion",
    "tabs",
    "masonry",
    "carousel",
    "timeline",
    "TrialFieldTabsLayout",
    "TrialFloatingLayout",
    "TrialListGroupLayout",
    "TrialSplitLayout",
    "TrialCardListLayout",
    "ZigzagLayout",
    "TrialStackedLayout",
] as const;
export type FormLayoutOptions = (typeof FORM_LAYOUTS)[number];
export type LayoutVariant = FormLayoutOptions;

export const FORM_DIRECTIONS = ["row", "column", "row-reverse", "column-reverse"] as const;
export type FormDirectionOptions = (typeof FORM_DIRECTIONS)[number];

export const FORM_COLUMNS = [1, 2, 3, 4, 5, 6, "auto"] as const;
export type FormColumnsOptions = (typeof FORM_COLUMNS)[number];
export type GridColumnOptions = FormColumnsOptions | ResponsiveColumns;

export const ENTITY_SELECT_STYLES = ["default", "minimal", "compact", "card", "prominent", "inline", "floating"] as const;
export type EntitySelectStyle = (typeof ENTITY_SELECT_STYLES)[number];

export const ENTITY_SELECT_VARIANTS = ["default", "grid", "chips", "command", "carousel", "tree"] as const;
export type EntitySelectVariant = (typeof ENTITY_SELECT_VARIANTS)[number];

// Column Configuration
export type FormColumnWidthOptions =
    | number
    | "auto"
    | {
          xs: number;
          sm: number;
          md: number;
          lg: number;
          xl: number;
      };

// Inline Entity Options
export const INLINE_ENTITY_COMPONENT_STYLES = ["accordion", "tabs", "list"] as const;
export type InlineEntityComponentStyles = (typeof INLINE_ENTITY_COMPONENT_STYLES)[number];

export const INLINE_ENTITY_COLUMNS = [1, 2, 3, 4, 5, 6, "auto"] as const;
export type InlineEntityColumnsOptions = (typeof INLINE_ENTITY_COLUMNS)[number];

// Component Types
export const QUICK_REFERENCE_COMPONENT_TYPES = [
    "cards",
    "cardsEnhanced",
    "accordion",
    "accordionEnhanced",
    "list",
    "select",
    "default",
    "dynamic",
    "LIST_WITH_RELATED",
] as const;
export type QuickReferenceComponentType = (typeof QUICK_REFERENCE_COMPONENT_TYPES)[number];

export type ComponentVariant = MatrxVariant;

// Type for select options with proper handling of number values
export interface SelectOption<T = string | number> {
    label: string;
    value: T;
    key: string;
    disabled?: boolean;
    description?: string;
    icon?: React.ReactNode;
}

// Improved utility function with proper key generation
export const createSelectOptions = <T extends string | number>(values: readonly T[]): SelectOption<T>[] => {
    return values.map((value) => ({
        label: value.toString(),
        value: value,
        key: `option-${value}`,
    }));
};

// Define option creators for string-only options
export const createStringSelectOptions = createSelectOptions<string>;
// Define option creators for number|string options
export const createMixedSelectOptions = createSelectOptions<string | number>;

// String-only options
export const animationPresetOptions = createStringSelectOptions(ANIMATION_PRESETS);
export const densityOptions = createStringSelectOptions(DENSITIES);
export const componentSizeOptions = createStringSelectOptions(COMPONENT_SIZES);
export const textSizeOptions = createStringSelectOptions(TEXT_SIZES);
export const formLayoutOptions = createStringSelectOptions(FORM_LAYOUTS);
export const formDirectionOptions = createStringSelectOptions(FORM_DIRECTIONS);
export const pageLayoutOptions = createStringSelectOptions(PAGE_LAYOUTS);
export const inlineEntityStyleOptions = createStringSelectOptions(INLINE_ENTITY_COMPONENT_STYLES);
export const componentStateOptions = createStringSelectOptions(COMPONENT_STATES);
export const quickReferenceComponentOptions = createStringSelectOptions(QUICK_REFERENCE_COMPONENT_TYPES);
export const formVariationOptions = createStringSelectOptions(FORM_VARIATIONS);
export const entityFormTypeOptions = createStringSelectOptions(Object.keys(ENTITY_FORM_COMPONENTS) as EntityFormType[]);

// Mixed number|string options
export const formColumnOptions = createMixedSelectOptions(FORM_COLUMNS);
export const inlineEntityColumnOptions = createMixedSelectOptions(INLINE_ENTITY_COLUMNS);
export const entitySelectStyleOptions = createSelectOptions(ENTITY_SELECT_STYLES);
export const entitySelectVariantOptions = createSelectOptions(ENTITY_SELECT_VARIANTS);

export type inlineEntityOptions = {
    showInlineEntities: boolean;
    inlineEntityStyle: InlineEntityComponentStyles;
    inlineEntityColumns: InlineEntityColumnsOptions;
    editableInlineEntities: boolean;
};

export interface EntityFormState {
    [key: string]: any;
}

export interface ArmaniFormProps {
    entityKey: EntityKeys;
    matrxRecordId: MatrxRecordId;
    dynamicFieldInfo: EntityStateField[];
    formData: EntityFormState;
    onUpdateField: (name: string, value: any) => void;
    unifiedCrudHandlers?: UnifiedCrudHandlers;
    onSubmitUpdate?: (data: FormState) => void;
    onSubmitCreate?: (data: FormState) => void;
    onSubmitDelete?: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
    isFullPage?: boolean;
    columns?: FormColumnsOptions;
    layout?: FormLayoutOptions;
    enableSearch?: boolean;
    direction?: FormDirectionOptions;
    density?: FormDensity;
    animationPreset?: AnimationPreset;
    size?: TextSizeOptions;
    variant?: MatrxVariant;
    floatingLabel?: boolean;
    className?: string;
}

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
    "aria-label"?: string;
    "aria-describedby"?: string;
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
    type?: "button" | "submit" | "reset";
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface MatrxButtonGroupProps extends BaseMatrxProps {
    children: React.ReactNode;
    orientation?: "horizontal" | "vertical";
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
    orientation?: "horizontal" | "vertical";
    attached?: boolean;
}

export interface MatrxRadioProps extends BaseMatrxProps {
    field: FormField;
    value: string;
    onChange: (value: string) => void;
    layout?: "horizontal" | "vertical" | "grid";
    columns?: number;
    showSelectAll?: boolean;
    optionClassName?: string;
}

export interface MatrxRadioGroupProps extends BaseMatrxProps {
    children: React.ReactNode;
    label?: string;
    layout?: "horizontal" | "vertical" | "grid";
    columns?: number;
    showSelectAll?: boolean;
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
    orientation?: "horizontal" | "vertical" | "grid";
    columns?: number;
}

export interface MatrxBaseInputProps extends BaseMatrxProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof BaseMatrxProps> {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
}

export type TextareaMode = "plain" | "outlined" | "filled" | "markdown" | "rich";
export type TextareaSize = "compact" | "default" | "large" | "article" | "custom";

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
    arrayThreshold: number; // Maximum array items before collapsing
    truncateThreshold: number; // Maximum object entries before truncating
    indentSize: string; // Tailwind padding size for indentation
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
    | "text"
    | "email"
    | "number"
    | "select"
    | "textarea"
    | "checkbox"
    | "radio"
    | "password"
    | "date"
    | "time"
    | "datetime-local"
    | "month"
    | "week"
    | "tel"
    | "url"
    | "color"
    | "slider"
    | "switch"
    | "json"
    | "file"
    | "image"
    | "rating";

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

interface FlexAnimatedFormProps {
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
    columns?: number | "auto" | { xs: number; sm: number; md: number; lg: number; xl: number };
    layout?: "grid" | "sections" | "accordion" | "tabs" | "masonry" | "carousel" | "timeline";
    enableSearch?: boolean;
    direction?: "row" | "column" | "row-reverse" | "column-reverse";
}

// Re-export for consistency with other types
export type { EntityFormType };

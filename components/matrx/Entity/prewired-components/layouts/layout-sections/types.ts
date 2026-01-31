import {
    FormColumnsOptions,
    FormDirectionOptions,
    FormLayoutOptions, InlineEntityColumnsOptions, inlineEntityOptions, InlineEntityComponentStyles,
    TextSizeOptions
} from "@/types/componentConfigTypes";

// Types
export type LayoutVariant = 'split' | 'sideBySide' | 'stacked';
export type ComponentDensity = 'compact' | 'normal' | 'comfortable';
export type AnimationPreset = 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type QuickReferenceComponentType =
    | 'cards'
    | 'cardsEnhanced'
    | 'accordion'
    | 'accordionEnhanced'
    | 'list'
    | 'select';

// Props Interface
export interface EntityLayoutProps {
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    layoutVariant?: LayoutVariant;
    size?: ComponentSize;
    quickReferenceType?: QuickReferenceComponentType;
    formOptions?: {
        size?: ComponentSize;
        formLayout?: FormLayoutOptions;
        formColumns?: FormColumnsOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
    };
}

export interface ArmaniLayoutProps {
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    layoutVariant?: LayoutVariant;
    size?: ComponentSize;
    splitRatio?: number;
    quickReferenceType?: QuickReferenceComponentType;
    formOptions?: {
        size?: ComponentSize;
        formLayout?: FormLayoutOptions;
        formColumns?: FormColumnsOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
        floatingLabel?: boolean;
        showLabel?: boolean;
        textSize?: TextSizeOptions;
        inlineEntityOptions?: {
            showInlineEntities: boolean;
            inlineEntityStyle: InlineEntityComponentStyles;
            inlineEntityColumns: InlineEntityColumnsOptions;
            editableInlineEntities: boolean;
        };
    };
}

import {FormColumnOptions, FormDirectionOptions, FormLayoutOptions} from "@/types/componentConfigTypes";

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
        formColumns?: FormColumnOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
    };
}

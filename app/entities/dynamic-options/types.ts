import { SmartCrudWrapperProps } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper';
import { MatrxVariant } from '@/components/ui/types';
import { EntityAnyFieldKey, EntityKeys } from '@/types/entityTypes';
import { EntityFormType } from '../forms';

export const COMPONENT_STATES = ['idle', 'loading', 'success', 'error', 'disabled'] as const;
export type ComponentState = (typeof COMPONENT_STATES)[number];

export interface ResponsiveColumns {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export const FORM_VARIATIONS = [
    'fullWidthSinglePage',
    'fullWidthMultiStep',
    'twoColumnSinglePage',
    'threeColumnSinglePage',
    'restrictedWidthSinglePage',
    'singlePageModal',
    'multiStepModal',
] as const;

export type FormVariationOptions = (typeof FORM_VARIATIONS)[number];


export const COMPONENT_SIZES = ['default', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'icon'] as const;
export type ComponentSize = (typeof COMPONENT_SIZES)[number];

export const TEXT_SIZES = ['default', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'hideText'] as const;
export type TextSizeOptions = (typeof TEXT_SIZES)[number];

export const FORM_LAYOUTS = [
    'grid',
    'sections',
    'accordion',
    'tabs',
    'masonry',
    'carousel',
    'timeline',
    'TrialFieldTabsLayout',
    'TrialFloatingLayout',
    'TrialListGroupLayout',
    'TrialSplitLayout',
    'TrialCardListLayout',
    'ZigzagLayout',
    'TrialStackedLayout',
] as const;
export type FormLayoutOptions = (typeof FORM_LAYOUTS)[number];
export type LayoutVariant = FormLayoutOptions;

export const FORM_DIRECTIONS = ['row', 'column', 'row-reverse', 'column-reverse'] as const;
export type FormDirectionOptions = (typeof FORM_DIRECTIONS)[number];

export const FORM_COLUMNS = [1, 2, 3, 4, 5, 6, 'auto'] as const;
export type FormColumnsOptions = (typeof FORM_COLUMNS)[number];
export type GridColumnOptions = FormColumnsOptions | ResponsiveColumns;

export const ENTITY_SELECT_STYLES = ['default', 'minimal', 'compact', 'card', 'prominent', 'inline', 'floating'] as const;
export type EntitySelectStyle = (typeof ENTITY_SELECT_STYLES)[number];

export const ENTITY_SELECT_VARIANTS = ['default', 'grid', 'chips', 'command', 'carousel', 'tree'] as const;
export type EntitySelectVariant = (typeof ENTITY_SELECT_VARIANTS)[number];

// Column Configuration
export type FormColumnWidthOptions =
    | number
    | 'auto'
    | {
          xs: number;
          sm: number;
          md: number;
          lg: number;
          xl: number;
      };

// Inline Entity Options
export const INLINE_ENTITY_COMPONENT_STYLES = ['accordion', 'tabs', 'list'] as const;
export type InlineEntityComponentStyles = (typeof INLINE_ENTITY_COMPONENT_STYLES)[number];

export const INLINE_ENTITY_COLUMNS = [1, 2, 3, 4, 5, 6, 'auto'] as const;
export type InlineEntityColumnsOptions = (typeof INLINE_ENTITY_COLUMNS)[number];

// Component Types
export const QUICK_REFERENCE_COMPONENT_TYPES = [
    'cards',
    'cardsEnhanced',
    'accordion',
    'accordionEnhanced',
    'list',
    'select',
    'default',
    'LIST_WITH_RELATED',
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

export interface PlaceholderStyles {
    size: ComponentSize;
    textSize: TextSizeOptions;
    variant: MatrxVariant;
}

export interface SelectionStyles {
    selectHeight: any;
    textSize: any;
    selectPosition: 'default' | 'sideBySide' | 'popper' | 'item-aligned';
    [key: string]: any;
}

export interface QuickReferenceStyles {
    size: any;
    [key: string]: any;
}

export interface FormStyles {
    size: any;
    [key: string]: any;
}

export interface FieldStyles {
    size: any;
    textSize: any;
    showLabel: boolean;
    floatingLabel: boolean;

    [key: string]: any;
}

export interface FieldVisibilityOptions<TEntity extends EntityKeys = EntityKeys> {
    excludeFields?: EntityAnyFieldKey<TEntity>[];
    defaultShownFields?: EntityAnyFieldKey<TEntity>[];
}

export interface ResizableLayoutProps {
    leftColumnWidth?: number; // This will determine both left and right column widths
    topLeftHeight?: number; // This will determine both top and bottom heights
    minColumnWidth?: number; // Minimum width for both columns
    minSectionHeight?: number; // Minimum height for sections
    leftColumnCollapsible?: boolean;
    quickRefCollapsible?: boolean; // Quick reference is collapsible by default
    forceCustomSizes?: boolean; // If true, enables all legacy size controls
}


// OFFICIAL ========================================

export const PAGE_LAYOUTS = ['split', 'sideBySide', 'stacked', 'resizable'] as const;
export type PageLayoutOptions = (typeof PAGE_LAYOUTS)[number];

// Component Display Options
export const ANIMATION_PRESETS = ['none', 'subtle', 'smooth', 'energetic', 'playful', 'feedback', 'error'] as const;
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export const DENSITIES = ['compact', 'normal', 'comfortable'] as const;
export type ComponentDensity = (typeof DENSITIES)[number];

// ========================================


// entityKey: EntityKeys; Removed because it is not involved in the layout and UI (Everything here should apply to any Entity and how it's representted in the UI)
// layoutState: UnifiedLayoutState; Removed because we want this to be a stable structure that doesn't cause re-renders
// handlers: UnifiedLayoutHandlers; Removed because we want this to be a stable structure that doesn't cause re-renders
// activeRecordId?: MatrxRecordId; Removed to focus on the layout and UI (Things that don't change often)

export interface EntityLayoutProps {
    globalStyleConfig?: {
        density: ComponentDensity;
        animationPreset: AnimationPreset;
    };

    pageLayoutComponent: PageLayoutOptions;
    pageLayoutOptions?: Record<string, any>;
    pageLayoutStyles: Record<string, any>;

    // Component options for Selecting the Main Entity within a module
    entitySelectionComponent: 'string';
    entitySelectionOptions?: Record<string, any>;
    entitySelectionStyles: SelectionStyles;

    // Component options for Quick Reference selection, which is a list of records
    quickRefComponent: 'string';
    quickRefOptions?: Record<string, any>;
    quickRefStyles: QuickReferenceStyles;

    // Component options for how an individual record will be displayed
    formComponent: EntityFormType;
    formOptions?: Record<string, any>;
    formStyles: FormStyles;

    // Component options for each inidividual field from the Entiti's Field Schema
    fieldComponentSet: 'string';
    fieldOptions?: Record<string, any>;
    fieldStyles: FieldStyles;

    // Component options for each related entity (Related to the Primary Entity)
    entitiesToHide: EntityKeys[];
    relatedComponentSet: Record<string, any>;
    relatedOptions?: Record<string, any>;
    relatedStyles?: Record<string, any>;

    // Additional options for the UI
    smartCrudOptions: SmartCrudWrapperProps;
    fieldVisibilityOptions: FieldVisibilityOptions;

    // Global options for the layout
    componentRefs?: Record<string, any>;
}

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

// Mixed number|string options
export const formColumnOptions = createMixedSelectOptions(FORM_COLUMNS);
export const inlineEntityColumnOptions = createMixedSelectOptions(INLINE_ENTITY_COLUMNS);
export const entitySelectStyleOptions = createSelectOptions(ENTITY_SELECT_STYLES);
export const entitySelectVariantOptions = createSelectOptions(ENTITY_SELECT_VARIANTS);

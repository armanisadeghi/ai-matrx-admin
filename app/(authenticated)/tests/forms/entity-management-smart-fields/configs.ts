import {EntityRecordHeader} from "@/components/matrx/Entity/headers/EntityPageHeader";
import {
    DynamicLayoutOptions,
    DynamicStyleOptions,
    FormComponentOptions,
    FormStyleOptions, InlineEntityOptions
} from "@/components/matrx/Entity/prewired-components/layouts/EntitySmartLayoutCombined";
import { EntityKeys } from "@/types/entityTypes";


export const entitySelectionProps: EntityRecordHeaderProps = {
    entityName: 'registeredFunction',
    entityPrettyName: 'Registered Function',
    backUrl: '/tests',
    backLabel: 'Back to Tests',
    primaryKeyField: 'id',
    primaryKeyValue: '1',
    fieldPrettyName: 'Test Field'
}


interface EntityRecordHeaderProps {
    entityName: EntityKeys;
    entityPrettyName?: string;
    backUrl?: string;
    backLabel?: string;
    primaryKeyField: string;
    primaryKeyValue: string;
    fieldPrettyName?: string;
}


export const DEFAULT_FORM_COMPONENT_OPTIONS: FormComponentOptions = {
    quickReferenceType: 'list',
    formLayoutType: 'split',
    entitySelectionComponent: EntityRecordHeader
};


// Form Style Default Options
export const DEFAULT_FORM_STYLE_OPTIONS: FormStyleOptions = {
    splitRatio: 20,
    formLayout: 'grid',
    formColumns: 2,
    formDirection: 'row',
    formEnableSearch: false,
    formIsSinglePage: true,
    formIsFullPage: true,
    floatingLabel: true,
    showLabel: true,
    textSize: 'md'
};

// Inline Entity Default Options
export const DEFAULT_INLINE_ENTITY_OPTIONS: InlineEntityOptions = {
    showInlineEntities: true,
    inlineEntityStyle: 'accordion',
    inlineEntityColumns: 2,
    editableInlineEntities: false
};

// Dynamic Style Default Options
export const DEFAULT_DYNAMIC_STYLE_OPTIONS: DynamicStyleOptions = {
    size: 'md',
    density: 'normal',
    animationPreset: 'subtle',
    variant: 'default'
};

// Combined Dynamic Layout Default Options
export const ENTITY_PAGE_DEFAULTS: DynamicLayoutOptions = {
    componentOptions: DEFAULT_FORM_COMPONENT_OPTIONS,
    formStyleOptions: DEFAULT_FORM_STYLE_OPTIONS,
    inlineEntityOptions: DEFAULT_INLINE_ENTITY_OPTIONS
};





/*
export const ENTITY_PAGE_DEFAULTS: DynamicLayoutOptions = {
    layout: 'split' as PageLayoutOptions,
    density: 'normal' as ComponentDensity,
    animation: 'subtle' as AnimationPreset,
    size: 'md' as ComponentSize,
    quickReferenceType: 'list' as QuickReferenceComponentType,
    isFullScreen: false,
    splitRatio: 20,
    formOptions: {
        formLayout: 'grid' as FormLayoutOptions,
        formColumns: '2' as FormColumnsOptions,
        formDirection: 'row' as FormDirectionOptions,
        formEnableSearch: false,
        formVariation: 'fullWidthSinglePage' as FormVariationOptions,
        floatingLabel: true,
        showLabel: true,
        textSize: 'md' as TextSizeOptions,
    },
    inlineEntityOptions: {
        showInlineEntities: true,
        inlineEntityStyle: 'accordion' as InlineEntityComponentStyles,
        inlineEntityColumns: '2' as InlineEntityColumnsOptions,
        editableInlineEntities: false,
    },
};


interface SimpleFormProps {
    primaryEntityKey: EntityKeys;
    foreignEntityKeys: EntityKeys[] | null;
    inverseEntityKeys: EntityKeys[] | null;
    manyToManyEntityKeys: EntityKeys[] | null;
    primaryActiveRecordId: MatrxRecordId | null;
    foreignActiveRecordIds: Record<EntityKeys, MatrxRecordId> | null;
    formMode: 'display' | 'create' | 'edit' | 'view';
    onSubmitUpdate?: (data: FormState) => void;
    onSubmitCreate?: (data: FormState) => void;
    onSubmitDelete?: () => void;
    dynamicLayoutOptions: DynamicLayoutOptions;
    dynamicStyleOptions: DynamicStyleOptions;
}


*/

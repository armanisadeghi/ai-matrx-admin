import {EntityRecordHeader} from "@/components/matrx/Entity/headers/EntityPageHeader";
import {
    DynamicLayoutOptions,
    DynamicStyleOptions,
    FormComponentOptions,
    FormFieldFiltering,
    FormStyleOptions, InlineEntityOptions,
    ResizableThreePaneLayoutProps, SelectComponentProps, UnifiedCrudHandlers, UnifiedLayoutHandlers, UnifiedLayoutProps
} from "@/components/matrx/Entity/prewired-components/layouts/types";
import { EntityKeys } from "@/types/entityTypes";
import {
    SmartCrudWrapperProps
} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper";
import {ComponentDensity, QuickReferenceComponentType, PageLayoutOptions} from "@/types/componentConfigTypes";
import { EntityFormType } from "../forms";

export const SMART_CRUD_PROP_DEFAULTS: Partial<SmartCrudWrapperProps> = {
    options: {
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
        showConfirmation: true
    },
    layout: {
        buttonLayout: 'row',
        buttonSize: 'icon',
        buttonSpacing: 'normal'
    }
}


export const DEFAULT_FORM_COMPONENT_OPTIONS: FormComponentOptions = {
    quickReferenceType: 'cards', // cards, cardsEnhanced, accordion, accordionEnhanced, list, select, default, LIST_WITH_RELATED
    formLayoutType: 'split', //formLayoutType?: "split" | "sideBySide" | "stacked" | "resizable"
    entitySelectionComponent: EntityRecordHeader,
    quickReferenceCrudWrapperProps: SMART_CRUD_PROP_DEFAULTS
};


// Form Style Default Options
export const DEFAULT_FORM_STYLE_OPTIONS: FormStyleOptions = {
    splitRatio: 20,
    formLayout: 'grid',
    formColumns: 2,
    formDirection: 'row',
    formEnableSearch: true,
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

export const DEFAULT_RESIZABLE_LAYOUT_OPTIONS: ResizableThreePaneLayoutProps = {
    leftColumnWidth: 25,
    topLeftHeight: 15,
    minColumnWidth: 10,
    minSectionHeight: 10,
    leftColumnCollapsible: false,
    quickRefCollapsible: true,
    forceCustomSizes: false
};


// selectComponentOptions?: SelectComponentProps

export const DEFAULT_SELECT_COMPONENT_OPTIONS: SelectComponentProps = {
    selectContentPosition: 'sideBySide',
}



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


export function getUnifiedLayoutProps(options?: {
    entityKey?: EntityKeys;
    formComponent?: EntityFormType;
    quickReferenceType?: QuickReferenceComponentType | string;
    formLayoutType?: PageLayoutOptions;
    density?: ComponentDensity;
    isExpanded?: boolean;
    handlers?: UnifiedLayoutHandlers;
}): UnifiedLayoutProps {

    const {
        entityKey = 'registeredFunction',
        formComponent = 'DEFAULT',
        quickReferenceType = 'cards',
        formLayoutType = 'split',
        density = 'normal',
        isExpanded = false,
        handlers = {}
    } = options || {};

    return {
        layoutState: {
            selectedEntity: entityKey,
            isExpanded: isExpanded,
            selectHeight: 0
        },
        handlers: handlers,
        dynamicStyleOptions: {
            ...DEFAULT_DYNAMIC_STYLE_OPTIONS,
            density: density
        },
        dynamicLayoutOptions: {
            componentOptions: {
                ...DEFAULT_FORM_COMPONENT_OPTIONS,
                quickReferenceType: quickReferenceType as QuickReferenceComponentType,
                formLayoutType: formLayoutType as PageLayoutOptions,
            },
            formStyleOptions: DEFAULT_FORM_STYLE_OPTIONS,
            inlineEntityOptions: DEFAULT_INLINE_ENTITY_OPTIONS,
        },
        resizableLayoutOptions: DEFAULT_RESIZABLE_LAYOUT_OPTIONS,
        selectComponentOptions: DEFAULT_SELECT_COMPONENT_OPTIONS,
        formComponent: formComponent,
    };
}

export function getUpdatedUnifiedLayoutProps(
    existingProps: UnifiedLayoutProps,
    overrides?: {
        entityKey?: EntityKeys;
        formComponent?: EntityFormType;
        quickReferenceType?: QuickReferenceComponentType | string;
        isExpanded?: boolean;
        handlers?: UnifiedLayoutHandlers;
        entitiesToHide?: EntityKeys[];
        fieldFiltering?: FormFieldFiltering;
        density?: ComponentDensity;
        [key: string]: any;
    }
): UnifiedLayoutProps {
    const {
        entityKey = existingProps.layoutState.selectedEntity,
        formComponent = existingProps.formComponent,
        isExpanded = existingProps.layoutState.isExpanded,
        handlers = existingProps.handlers,
        entitiesToHide = existingProps.entitiesToHide,
        fieldFiltering = existingProps.dynamicLayoutOptions?.formStyleOptions?.fieldFiltering,
        density = existingProps.dynamicStyleOptions?.density,
        ...otherOverrides
    } = overrides || {};

    // Handle quickReferenceType from either direct param or nested structure
    const finalQuickReferenceType = 
        overrides?.quickReferenceType || 
        otherOverrides?.dynamicLayoutOptions?.componentOptions?.quickReferenceType ||
        existingProps.dynamicLayoutOptions?.componentOptions?.quickReferenceType;

    // Deep merge for dynamicLayoutOptions
    const mergedDynamicLayoutOptions = {
        ...existingProps.dynamicLayoutOptions,
        componentOptions: {
            ...existingProps.dynamicLayoutOptions?.componentOptions,
            ...otherOverrides?.dynamicLayoutOptions?.componentOptions,
            quickReferenceType: finalQuickReferenceType as QuickReferenceComponentType,
        },
        formStyleOptions: {
            ...existingProps.dynamicLayoutOptions?.formStyleOptions,
            ...otherOverrides?.dynamicLayoutOptions?.formStyleOptions,
            fieldFiltering: {
                ...existingProps.dynamicLayoutOptions?.formStyleOptions?.fieldFiltering,
                ...otherOverrides?.dynamicLayoutOptions?.formStyleOptions?.fieldFiltering,
                ...fieldFiltering, // Use fieldFiltering directly here
            }
        },
        inlineEntityOptions: {
            ...existingProps.dynamicLayoutOptions?.inlineEntityOptions,
            ...otherOverrides?.dynamicLayoutOptions?.inlineEntityOptions,
        },
    };

    return {
        ...existingProps,
        layoutState: {
            ...existingProps.layoutState,
            selectedEntity: entityKey,
            isExpanded: isExpanded,
        },
        handlers: handlers,
        dynamicStyleOptions: {
            ...existingProps.dynamicStyleOptions,
            ...otherOverrides?.dynamicStyleOptions,
        },
        dynamicLayoutOptions: mergedDynamicLayoutOptions,
        resizableLayoutOptions: {
            ...existingProps.resizableLayoutOptions,
            ...otherOverrides?.resizableLayoutOptions,
        },
        selectComponentOptions: {
            ...existingProps.selectComponentOptions,
            ...otherOverrides?.selectComponentOptions,
        },
        formComponent: formComponent,
        entitiesToHide: Array.isArray(existingProps.entitiesToHide)
            ? [...existingProps.entitiesToHide, ...(entitiesToHide || [])]
            : entitiesToHide || [],
    };
}


export const getSimplifiedLayoutProps = ({
    entityKey,
    handlers,
    defaultShownFields,
    isExpanded = true,
    quickReferenceType = 'LIST',
    density = 'compact',
    size = 'sm',
    excludeFields = ['id'],
    formComponent = 'MINIMAL' as EntityFormType,
}) => {
    if (!entityKey || !handlers || !defaultShownFields) {
        throw new Error('Required parameters missing: entityKey, handlers, and defaultShownFields are required');
    }

    const initialLayoutProps = getUnifiedLayoutProps({
        entityKey,
        formComponent,
        quickReferenceType,
        isExpanded,
        handlers,
    });

    const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
        formComponent,
        dynamicStyleOptions: {
            density,
            size,
        },
        dynamicLayoutOptions: {
            formStyleOptions: {
                fieldFiltering: {
                    excludeFields,
                    defaultShownFields,
                },
            },
        },
    });

    return layoutProps;
};

// Usage example:
// const layoutProps = getSimplifiedLayoutProps({
//     entityKey: 'dataBroker',
//     handlers: {},
//     defaultShownFields: ['name', 'defaultValue', 'dataType', 'defaultComponent']
//     // Optional props will use defaults if not provided
// });
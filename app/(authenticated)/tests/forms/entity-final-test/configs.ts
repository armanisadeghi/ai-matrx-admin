import {EntityRecordHeader} from "@/components/matrx/Entity/headers/EntityPageHeader";
import {
    DynamicLayoutOptions,
    DynamicStyleOptions,
    FormComponentOptions,
    FormStyleOptions, InlineEntityOptions,
    ResizableThreePaneLayoutProps, SelectComponentProps, UnifiedCrudHandlers, UnifiedLayoutHandlers, UnifiedLayoutProps
} from "@/components/matrx/Entity/prewired-components/layouts/types";
import { EntityKeys } from "@/types/entityTypes";
import {
    SmartCrudWrapperProps
} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper";
import {QuickReferenceComponentType} from "@/types";

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
    defaultFormComponent?: 'default' | 'ArmaniFormSmart';
    quickReferenceType?: QuickReferenceComponentType | string;
    isExpanded?: boolean;
    handlers?: UnifiedLayoutHandlers;
}): UnifiedLayoutProps {
    const {
        entityKey = 'registeredFunction',
        defaultFormComponent = 'ArmaniFormSmart',
        quickReferenceType = 'CARDS',
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
        dynamicStyleOptions: DEFAULT_DYNAMIC_STYLE_OPTIONS,
        dynamicLayoutOptions: {
            componentOptions: {
                ...DEFAULT_FORM_COMPONENT_OPTIONS,
                quickReferenceType: quickReferenceType  as QuickReferenceComponentType,
            },
            formStyleOptions: DEFAULT_FORM_STYLE_OPTIONS,
            inlineEntityOptions: DEFAULT_INLINE_ENTITY_OPTIONS,
        },
        resizableLayoutOptions: DEFAULT_RESIZABLE_LAYOUT_OPTIONS,
        selectComponentOptions: DEFAULT_SELECT_COMPONENT_OPTIONS,
        defaultFormComponent: defaultFormComponent,
    };
}

export function getUpdatedUnifiedLayoutProps(
    existingProps: UnifiedLayoutProps,
    overrides?: {
        entityKey?: EntityKeys;
        defaultFormComponent?: 'default' | 'ArmaniFormSmart';
        quickReferenceType?: QuickReferenceComponentType | string;
        isExpanded?: boolean;
        handlers?: UnifiedLayoutHandlers;
        [key: string]: any; // Allow overriding any key in the existingProps
    }
): UnifiedLayoutProps {
    const {
        entityKey = existingProps.layoutState.selectedEntity,
        defaultFormComponent = existingProps.defaultFormComponent,
        quickReferenceType = existingProps.dynamicLayoutOptions.componentOptions.quickReferenceType,
        isExpanded = existingProps.layoutState.isExpanded,
        handlers = existingProps.handlers,
        ...otherOverrides
    } = overrides || {};

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
            ...otherOverrides.dynamicStyleOptions,
        },
        dynamicLayoutOptions: {
            ...existingProps.dynamicLayoutOptions,
            componentOptions: {
                ...existingProps.dynamicLayoutOptions.componentOptions,
                ...otherOverrides.componentOptions,
                quickReferenceType: quickReferenceType as QuickReferenceComponentType,
            },
            formStyleOptions: {
                ...existingProps.dynamicLayoutOptions.formStyleOptions,
                ...otherOverrides.formStyleOptions,
            },
            inlineEntityOptions: {
                ...existingProps.dynamicLayoutOptions.inlineEntityOptions,
                ...otherOverrides.inlineEntityOptions,
            },
        },
        resizableLayoutOptions: {
            ...existingProps.resizableLayoutOptions,
            ...otherOverrides.resizableLayoutOptions,
        },
        selectComponentOptions: {
            ...existingProps.selectComponentOptions,
            ...otherOverrides.selectComponentOptions,
        },
        defaultFormComponent: defaultFormComponent,
    };
}

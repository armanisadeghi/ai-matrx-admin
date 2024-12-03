import {EntityRecordHeader} from "@/components/matrx/Entity/headers/EntityPageHeader";
import {
    DynamicLayoutOptions,
    DynamicStyleOptions,
    FormComponentOptions,
    FormStyleOptions, InlineEntityOptions,
    ResizableThreePaneLayoutProps, SelectComponentProps
} from "@/components/matrx/Entity/prewired-components/layouts/types";
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
    formLayoutType: 'split', //formLayoutType?: "split" | "sideBySide" | "stacked" | "resizable"
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

export const DEFAULT_RESIZABLE_LAYOUT_OPTIONS: ResizableThreePaneLayoutProps = {
    leftColumnWidth: 20,
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


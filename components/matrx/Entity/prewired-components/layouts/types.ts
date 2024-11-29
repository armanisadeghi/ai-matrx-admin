import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnsOptions, FormDirectionOptions,
    FormLayoutOptions, InlineEntityColumnsOptions, InlineEntityComponentStyles,
    PageLayoutOptions,
    QuickReferenceComponentType, TextSizeOptions
} from "@/types/componentConfigTypes";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import React from "react";
import {EntityError} from "@/lib/redux/entity/types/stateTypes";

export interface FormComponentOptions {
    entitySelectionComponent?: any;
    quickReferenceType?: QuickReferenceComponentType;
    formLayoutType?: PageLayoutOptions;
}

export interface FormStyleOptions {
    splitRatio?: number;
    formLayout?: FormLayoutOptions;
    formColumns?: FormColumnsOptions;
    formDirection?: FormDirectionOptions;
    formEnableSearch?: boolean;
    formIsSinglePage?: boolean;
    formIsFullPage?: boolean;
    floatingLabel?: boolean;
    showLabel?: boolean;
    textSize?: TextSizeOptions;
}

export interface InlineEntityOptions {
    showInlineEntities: boolean;
    inlineEntityStyle: InlineEntityComponentStyles;
    inlineEntityColumns: InlineEntityColumnsOptions;
    editableInlineEntities: boolean;
}

export interface DynamicStyleOptions {
    size?: ComponentSize;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    variant?: MatrxVariant;

}

export interface DynamicLayoutOptions {
    componentOptions?: FormComponentOptions;
    styleOptions?: FormStyleOptions;
    inlineEntityOptions?: InlineEntityOptions;
}


export interface UnifiedLayoutProps {
    layoutState: {
        selectedEntity: EntityKeys | null;
        isExpanded: boolean;
        rightColumnRef: React.RefObject<HTMLDivElement>;
        selectHeight: number;
    };
    handlers: {
        setIsExpanded: (value: boolean) => void;
        handleEntityChange: (value: EntityKeys) => void;
        onCreateEntityClick: () => void;
        handleRecordLoad?: (record: EntityData<EntityKeys>) => void;
        handleError?: (error: EntityError) => void;
        handleRecordLabelChange?: (label: string) => void;
    };
    QuickReferenceComponent: React.ReactNode;
    formStyleOptions: FormStyleOptions;
    inlineEntityOptions: InlineEntityOptions;
    dynamicStyleOptions: DynamicStyleOptions;
}

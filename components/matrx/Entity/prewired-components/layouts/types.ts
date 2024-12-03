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
    formStyleOptions?: FormStyleOptions;
    inlineEntityOptions?: InlineEntityOptions;
}

export interface UnifiedLayoutState {
    selectedEntity: EntityKeys | null;
    isExpanded: boolean;
    rightColumnRef?: React.RefObject<HTMLDivElement>;
    quickRefRef?: React.RefObject<HTMLDivElement>;
    selectHeight?: number;
}

export interface UnifiedLayoutHandlers {
    setIsExpanded?: (value: boolean) => void;
    handleEntityChange?: (value: EntityKeys) => void;
    onCreateEntityClick?: () => void;
    handleRecordLoad?: (record: EntityData<EntityKeys>) => void;
    handleError?: (error: EntityError) => void;
    handleRecordLabelChange?: (label: string) => void;
}


export interface ResizableThreePaneLayoutProps {
    leftColumnWidth?: number; // This will determine both left and right column widths
    topLeftHeight?: number; // This will determine both top and bottom heights
    minColumnWidth?: number; // Minimum width for both columns
    minSectionHeight?: number; // Minimum height for sections
    leftColumnCollapsible?: boolean;
    quickRefCollapsible?: boolean; // Quick reference is collapsible by default
    forceCustomSizes?: boolean; // If true, enables all legacy size controls
    legacyOptions?: {
        leftColumnMaxWidth?: number;
        rightColumnWidth?: number;
        rightColumnMinWidth?: number;
        rightColumnMaxWidth?: number;
        rightColumnCollapsible?: boolean;
        topLeftMaxHeight?: number;
        bottomLeftHeight?: number;
        bottomLeftMinHeight?: number;
        bottomLeftMaxHeight?: number;
    };
}

export interface SelectComponentProps {
    selectContentPosition?: 'default' | 'sideBySide' | 'popper' | 'item-aligned';
}

export interface UnifiedLayoutProps {
    layoutState: UnifiedLayoutState;
    handlers: UnifiedLayoutHandlers;
    dynamicStyleOptions: DynamicStyleOptions;
    dynamicLayoutOptions: DynamicLayoutOptions;
    quickReferenceComponentName?: QuickReferenceComponentType;
    QuickReferenceComponent?: React.ReactNode;
    resizableLayoutOptions?: ResizableThreePaneLayoutProps;
    selectComponentOptions?: SelectComponentProps;
    className?: string;
}




import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnsOptions,
    FormDirectionOptions,
    FormLayoutOptions,
    InlineEntityColumnsOptions,
    InlineEntityComponentStyles,
    PageLayoutOptions,
    QuickReferenceComponentType,
    TextSizeOptions,
} from '@/types/componentConfigTypes';
import { MatrxVariant } from '@/components/matrx/ArmaniForm/field-components/types';
import { EntityAnyFieldKey, EntityData, EntityKeys } from '@/types/entityTypes';
import React from 'react';
import { EntityError, MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { SmartCrudWrapperProps } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper';
import { QuickRefVariant } from '@/app/entities/quick-reference/dynamic-quick-ref/quick-ref-item';
import { EntityFormType } from '@/app/entities/forms';

export interface UnifiedLayoutHandlers {
    setIsExpanded?: (value: boolean) => void;
    handleEntityChange?: (value: EntityKeys) => void;
    onCreateEntityClick?: () => void;
    handleRecordLoad?: (record: EntityData<EntityKeys>) => void;
    handleError?: (error: EntityError) => void;
    handleRecordLabelChange?: (label: string) => void;
}

export interface UnifiedCrudHandlers {
    handleCreate?: (tempRecordId: MatrxRecordId, options?: { showToast?: boolean }) => void;
    handleUpdate?: (options?: { showToast?: boolean }) => void;
    handleDelete?: (options?: { showToast?: boolean }) => void;
    handleFieldUpdate?: (fieldName: string, value: any) => void;
    handleFetchOne?: (matrxRecordId: MatrxRecordId, options?: { showToast?: boolean }) => void;
    handleFetchOneWithFkIfk?: (matrxRecordId: MatrxRecordId, options?: { showToast?: boolean }) => void;
}
export interface UnifiedStepHandlers {
    currentStep?: number;
    setCurrentStep?: (step: number) => void;
    onNextStep?: () => void;
    onPrevStep?: () => void;
}

export interface FormFieldFiltering<TEntity extends EntityKeys = EntityKeys> {
    excludeFields?: EntityAnyFieldKey<TEntity>[];
    defaultShownFields?: EntityAnyFieldKey<TEntity>[];
}

export interface FormStyleOptions {
    splitRatio?: number;
    formLayout?: FormLayoutOptions;
    formColumns?: FormColumnsOptions;
    formDirection?: FormDirectionOptions;
    formIsSinglePage?: boolean;
    formIsFullPage?: boolean;
    floatingLabel?: boolean;
    showLabel?: boolean;
    textSize?: TextSizeOptions;
    formEnableSearch?: boolean;
    fieldFiltering?: FormFieldFiltering;
}

export interface InlineEntityOptions {
    showInlineEntities: boolean;
    inlineEntityStyle: InlineEntityComponentStyles;
    inlineEntityColumns: InlineEntityColumnsOptions;
    editableInlineEntities: boolean;
}

export interface DynamicStyleOptions {
    size?: ComponentSize;
    textSize?: TextSizeOptions;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    variant?: MatrxVariant;
}

export interface UnifiedLayoutState {
    selectedEntity: EntityKeys | null;
    isExpanded: boolean;
    rightColumnRef?: React.RefObject<HTMLDivElement>;
    quickRefRef?: React.RefObject<HTMLDivElement>;
    selectHeight?: number;
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

export interface FormComponentOptions {
    entitySelectionComponent?: any;
    quickReferenceType?: QuickReferenceComponentType;
    quickReferenceCrudWrapperProps?: SmartCrudWrapperProps | Partial<SmartCrudWrapperProps>;
    formLayoutType?: PageLayoutOptions;
}

export interface QuickRefOptions {
    mainComponent?: QuickReferenceComponentType;
    itemComponent?: QuickRefVariant;
    QuickReferenceComponent?: React.ReactNode;
}

export interface DynamicLayoutOptions {
    componentOptions?: FormComponentOptions;
    formStyleOptions?: FormStyleOptions;
    inlineEntityOptions?: InlineEntityOptions;
}

export interface UnifiedLayoutProps {
    activeRecordId?: MatrxRecordId;
    layoutState: UnifiedLayoutState;
    handlers: UnifiedLayoutHandlers;

    dynamicStyleOptions: DynamicStyleOptions;
    dynamicLayoutOptions: DynamicLayoutOptions;

    quickReferenceComponentName?: QuickReferenceComponentType;
    QuickReferenceComponent?: React.ReactNode;

    resizableLayoutOptions?: ResizableThreePaneLayoutProps;
    selectComponentOptions?: SelectComponentProps;

    formComponent: EntityFormType;
    
    unifiedCrudHandlers?: UnifiedCrudHandlers;
    unifiedStepHandlers?: UnifiedStepHandlers;
    className?: string;
    entitiesToHide?: EntityKeys[];
    smartCrudOptions?: SmartCrudWrapperProps;
    quickRefOptions?: QuickRefOptions;
}

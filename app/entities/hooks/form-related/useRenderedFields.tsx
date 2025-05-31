'use client';

import React, { useMemo } from 'react';
import { useEntityCrud } from '@/lib/redux/entity/hooks/useEntityCrud';
import { useFieldVisibility } from './useFieldVisibility';
import { useFieldRenderer } from './useFieldRenderer';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys } from '@/types/entityTypes';

export interface RenderedFieldsOptions {
    showRelatedFields?: boolean;
    onFieldChange?: (fieldName: string, value: unknown) => void;
    forceEnable?: boolean;
}

export interface RenderedFieldsResult {
    nativeFields: React.ReactElement[];
    relationshipFields: React.ReactElement[];
    allFields: React.ReactElement[];
    visibleFieldsInfo: {
        visibleNativeFields: any[];
        visibleRelationshipFields: any[];
        visibleFields: any[];
        searchTerm: string;
        setSearchTerm: (term: string) => void;
        carouselActiveIndex: number;
        setCarouselActiveIndex: (index: number) => void;
        toggleField: (field: any) => void;
        selectAllFields: () => void;
        clearAllFields: () => void;
        isSearchEnabled: boolean;
        selectOptions: any;
    };
}

/**
 * Utility hook that encapsulates the complete field resolution and rendering logic.
 * Takes unified props and returns fully resolved and rendered native and relationship fields.
 * 
 * @param unifiedLayoutProps - The unified layout props containing all configuration
 * @param options - Optional configuration for field rendering
 * @returns Object containing rendered fields and field visibility information
 */
export function useRenderedFields(
    unifiedLayoutProps: UnifiedLayoutProps,
    options: RenderedFieldsOptions = {}
): RenderedFieldsResult {
    const { showRelatedFields = true, onFieldChange, forceEnable } = options;
    
    // Extract entity key from unified props
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as EntityKeys | null;
    
    // Get CRUD handlers and record data
    const { activeRecordCrud } = useEntityCrud(entityKey);
    const recordId = activeRecordCrud.recordId;
    
    // Get field visibility information
    const fieldVisibilityInfo = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const {
        visibleNativeFields,
        visibleRelationshipFields,
        visibleFields,
        searchTerm,
        setSearchTerm,
        carouselActiveIndex,
        setCarouselActiveIndex,
        toggleField,
        selectAllFields,
        clearAllFields,
        isSearchEnabled,
        selectOptions,
    } = fieldVisibilityInfo;
    
    // Get field renderer functions
    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer(
        entityKey,
        recordId,
        unifiedLayoutProps,
        {
            onFieldChange,
            forceEnable,
        }
    );
    
    // Render native fields
    const renderedNativeFields = useMemo(() => 
        visibleNativeFields.map(getNativeFieldComponent),
        [visibleNativeFields, getNativeFieldComponent]
    );
    
    // Render relationship fields
    const renderedRelationshipFields = useMemo(() => 
        visibleRelationshipFields.map(getRelationshipFieldComponent),
        [visibleRelationshipFields, getRelationshipFieldComponent]
    );
    
    // Combine all rendered fields
    const allRenderedFields = useMemo(() => [
        ...renderedNativeFields,
        ...renderedRelationshipFields
    ], [renderedNativeFields, renderedRelationshipFields]);
    
    return useMemo(() => ({
        nativeFields: renderedNativeFields,
        relationshipFields: renderedRelationshipFields,
        allFields: allRenderedFields,
        visibleFieldsInfo: {
            visibleNativeFields,
            visibleRelationshipFields,
            visibleFields,
            searchTerm,
            setSearchTerm,
            carouselActiveIndex,
            setCarouselActiveIndex,
            toggleField,
            selectAllFields,
            clearAllFields,
            isSearchEnabled,
            selectOptions,
        }
    }), [
        renderedNativeFields,
        renderedRelationshipFields,
        allRenderedFields,
        visibleNativeFields,
        visibleRelationshipFields,
        visibleFields,
        searchTerm,
        setSearchTerm,
        carouselActiveIndex,
        setCarouselActiveIndex,
        toggleField,
        selectAllFields,
        clearAllFields,
        isSearchEnabled,
        selectOptions,
    ]);
} 
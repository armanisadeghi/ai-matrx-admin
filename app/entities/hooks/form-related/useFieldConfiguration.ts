'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, EntityAnyFieldKey } from '@/types/entityTypes';
import { processFormConfig } from '@/lib/redux/entity/utils/processFormConfig';

export interface FieldState<TEntity extends EntityKeys = EntityKeys> {
    visibleFields: EntityAnyFieldKey<TEntity>[];
    selectedFields: Set<EntityAnyFieldKey<TEntity>>;
    showRelatedFields?: boolean;
}

export function useFieldConfiguration<TEntity extends EntityKeys>(
    entityKey: TEntity, 
    unifiedLayoutProps: UnifiedLayoutProps, 
    showRelatedFields = true,
    fieldState?: FieldState<TEntity>
) {
    const store = useAppStore();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const config = useMemo(
        () => processFormConfig<TEntity>(unifiedLayoutProps),
        [unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions, unifiedLayoutProps.entitiesToHide]
    );
    const { entitiesToHide, enableSearch, excludeFields, defaultShownFields } = config;

    const { fieldGroups, displayNames } = useMemo(
        () => ({
            fieldGroups: selectors.selectFieldNameGroupsWithHidden(store.getState(), entitiesToHide),
            displayNames: selectors.selectFieldDisplayNames(store.getState()),
        }),
        [selectors, store, entitiesToHide]
    );

    const { nativeFields, relationshipFields } = fieldGroups;

    const allowedFields = useMemo(() => {
        // First, get all available fields based on showRelatedFields
        const allFields = showRelatedFields ? [...nativeFields, ...relationshipFields] : [...nativeFields];
        
        // Filter out excluded fields
        const filteredFields = allFields.filter((field) => !excludeFields.has(field));
        
        // If we have visible fields in fieldState, order the allowed fields accordingly
        if (fieldState?.visibleFields?.length) {
            // Create a Set of filtered fields for O(1) lookup
            const filteredFieldsSet = new Set(filteredFields);
            
            // Start with visible fields that exist in filtered fields
            const orderedFields = fieldState.visibleFields.filter(field => filteredFieldsSet.has(field));
            
            // Add remaining filtered fields that weren't in visible fields
            const remainingFields = filteredFields.filter(field => !orderedFields.includes(field));
            
            return [...orderedFields, ...remainingFields];
        }
        
        return filteredFields;
    }, [
        nativeFields, 
        relationshipFields, 
        showRelatedFields, 
        excludeFields, 
        fieldState?.visibleFields
    ]);

    return useMemo(
        () => ({
            allowedFields,
            nativeFields,
            relationshipFields,
            fieldDisplayNames: displayNames,
            enableSearch,
            defaultShownFields,
        }),
        [allowedFields, nativeFields, relationshipFields, displayNames, enableSearch, defaultShownFields]
    );
}
// app/entities/layout/MergedEntityLayout.ts

'use client';

import { useState, useMemo, useCallback } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, EntityAnyFieldKey } from '@/types/entityTypes';
import { useFieldConfiguration } from './useFieldConfiguration';

export interface FieldState<TEntity extends EntityKeys = EntityKeys> {
    selectedFields: Set<EntityAnyFieldKey<TEntity>>;
    showRelatedFields?: boolean;
}

export function useFieldVisibility<TEntity extends EntityKeys>(entityKey: TEntity, unifiedLayoutProps: UnifiedLayoutProps, showRelatedFields = true) {
    const { allowedFields, nativeFields, relationshipFields, fieldDisplayNames, enableSearch, defaultShownFields } = useFieldConfiguration<TEntity>(
        entityKey,
        unifiedLayoutProps,
        showRelatedFields
    );

    const [selectedFields, setSelectedFields] = useState<Set<EntityAnyFieldKey<TEntity>>>(() => {
        const initialFields = defaultShownFields.length 
            ? defaultShownFields.filter((field) => allowedFields.includes(field)) 
            : allowedFields;
        return new Set(initialFields);
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

    // Filter fields based on search
    const visibleFields = useMemo(() => {
        const searchQuery = searchTerm.toLowerCase().trim();

        if (enableSearch && searchQuery) {
            return allowedFields.filter((field: EntityAnyFieldKey<TEntity>) => {
                const fieldName = String(field).toLowerCase();
                const displayName = (fieldDisplayNames.get(field) || String(field)).toLowerCase();
                return fieldName.includes(searchQuery) || displayName.includes(searchQuery);
            }) as EntityAnyFieldKey<TEntity>[];
        }

        return Array.from(selectedFields);
    }, [enableSearch, searchTerm, allowedFields, selectedFields, fieldDisplayNames]);

    // Derive native and relationship visible fields
    const visibleNativeFields = useMemo(
        () => visibleFields.filter((field: EntityAnyFieldKey<TEntity>) => nativeFields.includes(field)),
        [visibleFields, nativeFields]
    );

    const visibleRelationshipFields = useMemo(
        () => (showRelatedFields ? visibleFields.filter((field: EntityAnyFieldKey<TEntity>) => relationshipFields.includes(field)) : []),
        [visibleFields, relationshipFields, showRelatedFields]
    );

    const selectOptions = useMemo(
        () =>
            allowedFields.map((fieldName) => ({
                value: fieldName,
                label: fieldDisplayNames.get(fieldName) || String(fieldName),
            })),
        [allowedFields, fieldDisplayNames]
    );

    const toggleField = useCallback(
        (fieldName: EntityAnyFieldKey<TEntity>) => {
            if (!allowedFields.includes(fieldName)) return;

            setSelectedFields((prev) => {
                const newSelected = new Set(prev);
                if (newSelected.has(fieldName)) {
                    newSelected.delete(fieldName);
                } else {
                    newSelected.add(fieldName);
                }
                return newSelected;
            });
        },
        [allowedFields]
    );

    const selectAllFields = useCallback(() => {
        setSelectedFields(new Set(allowedFields));
    }, [allowedFields]);

    const clearAllFields = useCallback(() => {
        setSelectedFields(new Set());
    }, []);

    return {
        allowedFields,
        visibleFields,
        visibleNativeFields,
        visibleRelationshipFields,
        searchTerm,
        setSearchTerm,
        carouselActiveIndex,
        setCarouselActiveIndex,
        toggleField,
        selectOptions,
        isSearchEnabled: enableSearch,
        selectAllFields,
        clearAllFields,
    };
}

export type UseFieldVisibilityReturn = ReturnType<typeof useFieldVisibility>;
// lib/redux/entity/hooks/useFieldVisibility.ts

'use client';



// REPLACED ================================================================================================





import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/lib/redux/hooks';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, EntityAnyFieldKey } from '@/types/entityTypes';

export interface FieldState<TEntity extends EntityKeys = EntityKeys> {
    visibleFields: EntityAnyFieldKey<TEntity>[];
    selectedFields: Set<EntityAnyFieldKey<TEntity>>;
    showRelatedFields?: boolean;
}

export function useFieldVisibility<TEntity extends EntityKeys>(entityKey: TEntity, unifiedLayoutProps: UnifiedLayoutProps, showRelatedFields = true) {
    const store = useAppStore();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const formStyleOptions = useMemo(
        () => unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions || {},
        [unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions]
    );
    const entitiesToHide = useMemo(() => unifiedLayoutProps.entitiesToHide || [], [unifiedLayoutProps.entitiesToHide]);
    const enableSearch = useMemo(() => formStyleOptions.formEnableSearch ?? false, [formStyleOptions.formEnableSearch]);

    const [searchTerm, setSearchTerm] = useState('');
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

    // Get fields from selectors
    const { nativeFields, relationshipFields } = selectors.selectFieldNameGroupsWithHidden(store.getState(), entitiesToHide);
    const fieldDisplayNames = selectors.selectFieldDisplayNames(store.getState());

    // Determine all available fields based on showRelatedFields
    const allFields = useMemo(
        () => (showRelatedFields ? [...nativeFields, ...relationshipFields] : [...nativeFields]),
        [nativeFields, relationshipFields, showRelatedFields]
    );

    // First, establish excluded fields and get allowed fields
    const excludeFields = new Set(formStyleOptions.fieldFiltering?.excludeFields || []);
    const allowedFields = useMemo(() => allFields.filter((field) => !excludeFields.has(field)), [allFields, excludeFields]);

    // Initialize visibility state
    const [fieldState, setFieldState] = useState<FieldState<TEntity>>(() => {
        const defaultShownFields = (formStyleOptions.fieldFiltering?.defaultShownFields || []) as EntityAnyFieldKey<TEntity>[];
        const initialFields = defaultShownFields.length
            ? defaultShownFields.filter((field: EntityAnyFieldKey<TEntity>) => allowedFields.includes(field as EntityAnyFieldKey<TEntity>))
            : allowedFields;

        return {
            visibleFields: initialFields,
            selectedFields: new Set(initialFields),
        };
    });

    // Filter fields based on search
    const visibleFields = useMemo(() => {
        const searchQuery = searchTerm.toLowerCase().trim();

        if (enableSearch && searchQuery) {
            return allowedFields.filter((field: EntityAnyFieldKey<TEntity>) =>
                String(field).toLowerCase().includes(searchQuery)
            ) as EntityAnyFieldKey<TEntity>[];
        }

        return Array.from(fieldState.selectedFields);
    }, [enableSearch, searchTerm, allowedFields, fieldState.selectedFields]);

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

            setFieldState((prev) => {
                const newSelected = new Set(prev.selectedFields);
                if (newSelected.has(fieldName)) {
                    newSelected.delete(fieldName);
                } else {
                    newSelected.add(fieldName);
                }

                return {
                    visibleFields: Array.from(newSelected),
                    selectedFields: newSelected,
                };
            });
        },
        [allowedFields]
    );

    const selectAllFields = useCallback(() => {
        setFieldState((prev) => ({
            ...prev,
            visibleFields: allowedFields,
            selectedFields: new Set(allowedFields)
        }));
    }, [allowedFields]);
    
    const clearAllFields = useCallback(() => {
        setFieldState((prev) => ({
            ...prev,
            visibleFields: [],
            selectedFields: new Set()
        }));
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

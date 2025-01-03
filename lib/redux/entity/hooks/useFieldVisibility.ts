'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from "@/lib/redux/hooks";
import { createEntitySelectors } from "@/lib/redux/entity/selectors";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { EntityKeys } from "@/types/entityTypes";

export function useFieldVisibility<TEntity extends EntityKeys>(
    entityKey: TEntity,
    unifiedLayoutProps: UnifiedLayoutProps
) {
    const store = useAppStore();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions || {};
    const dynamicFieldInfo = selectors.selectFieldInfo(store.getState());
    const enableSearch = formStyleOptions.formEnableSearch ?? false;
    const [searchTerm, setSearchTerm] = useState("");
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

    // First, exclude the fields that should never be shown
    const excludeFields = new Set(formStyleOptions.fieldFiltering?.excludeFields || []);
    
    // Then, get all available fields minus excluded ones
    const allowedFields = useMemo(() => {
        const baseFields = formStyleOptions.fieldFiltering?.allowedFieldsOverride ||
            dynamicFieldInfo.map(field => field.name);
        return baseFields.filter(field => !excludeFields.has(field));
    }, [dynamicFieldInfo, formStyleOptions.fieldFiltering?.allowedFieldsOverride, excludeFields]);

    // Get the default shown fields, ensuring they're in the allowed set
    const defaultShownFields = useMemo(() => {
        const defaultFields = formStyleOptions.fieldFiltering?.defaultShownFields || [];
        return defaultFields.filter(field => 
            allowedFields.includes(field) && !excludeFields.has(field)
        );
    }, [allowedFields, formStyleOptions.fieldFiltering?.defaultShownFields, excludeFields]);

    // Get field info for allowed fields
    const allowedFieldsInfo = useMemo(() =>
        dynamicFieldInfo.filter(field => 
            allowedFields.includes(field.name) && !excludeFields.has(field.name)
        ),
        [dynamicFieldInfo, allowedFields, excludeFields]
    );

    // Initialize field state with default shown fields
    const [fieldState, setFieldState] = useState(() => ({
        visibleFields: defaultShownFields,
        selectedFields: new Set(defaultShownFields)
    }));

    // Filter fields based on search
    const filteredFields = useMemo(() => {
        const searchQuery = searchTerm.toLowerCase().trim();

        if (enableSearch && searchQuery) {
            return allowedFields.filter(field =>
                field.toLowerCase().includes(searchQuery)
            );
        }

        return Array.from(fieldState.selectedFields);
    }, [enableSearch, searchTerm, allowedFields, fieldState.selectedFields]);

    // Get visible field info
    const visibleFieldsInfo = useMemo(() =>
        dynamicFieldInfo.filter(field => 
            filteredFields.includes(field.name) && !excludeFields.has(field.name)
        ),
        [dynamicFieldInfo, filteredFields, excludeFields]
    );

    const toggleField = (fieldName: string) => {
        if (!allowedFields.includes(fieldName) || excludeFields.has(fieldName)) return;

        setFieldState(prev => {
            const newSelected = new Set(prev.selectedFields);
            if (newSelected.has(fieldName)) {
                newSelected.delete(fieldName);
            } else {
                newSelected.add(fieldName);
            }

            return {
                visibleFields: Array.from(newSelected),
                selectedFields: newSelected
            };
        });
    };

    const selectAllFields = () => {
        setFieldState({
            visibleFields: allowedFields,
            selectedFields: new Set(allowedFields)
        });
    };

    const clearAllFields = () => {
        setFieldState({
            visibleFields: [],
            selectedFields: new Set()
        });
    };

    return {
        visibleFieldsInfo,
        allowedFieldsInfo,
        visibleFields: filteredFields,
        selectedFields: fieldState.selectedFields,
        allAllowedFields: allowedFields,
        searchTerm,
        setSearchTerm,
        carouselActiveIndex,
        setCarouselActiveIndex,
        toggleField,
        selectAllFields,
        clearAllFields,
        isSearchEnabled: enableSearch
    };
}
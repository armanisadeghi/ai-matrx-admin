'use client';

import React, { useState, useMemo } from 'react';
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { createEntitySelectors } from "@/lib/redux/entity/selectors";
import { getEntitySlice } from "@/lib/redux/entity/entitySlice";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { EntityKeys } from "@/types/entityTypes";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";

export function useFieldVisibility<TEntity extends EntityKeys>(
    entityKey: TEntity,
    unifiedLayoutProps: UnifiedLayoutProps
) {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions || {};
    const dynamicFieldInfo = selectors.selectFieldInfo(store.getState());
    const enableSearch = formStyleOptions.formEnableSearch ?? false;
    const [searchTerm, setSearchTerm] = useState("");
    const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

    const allowedFields = useMemo(() =>
            formStyleOptions.fieldFiltering?.allowedFieldsOverride ||
            dynamicFieldInfo.map(field => field.name),
        [dynamicFieldInfo, formStyleOptions.fieldFiltering?.allowedFieldsOverride]
    );

    const finalAllowedFields = useMemo(() => {
        const excludeFields = new Set(formStyleOptions.fieldFiltering?.excludeFields || []);
        return allowedFields.filter(field => !excludeFields.has(field));
    }, [allowedFields, formStyleOptions.fieldFiltering?.excludeFields]);

    const allowedFieldsInfo = useMemo(() =>
            dynamicFieldInfo.filter(field => finalAllowedFields.includes(field.name)),
        [dynamicFieldInfo, finalAllowedFields]
    );

    const [fieldState, setFieldState] = useState(() => {
        const defaultShownFields = formStyleOptions.fieldFiltering?.defaultShownFields;
        const initialFields = defaultShownFields?.length
                              ? defaultShownFields.filter(field => finalAllowedFields.includes(field))
                              : finalAllowedFields;

        return {
            visibleFields: initialFields,
            selectedFields: new Set(initialFields)
        };
    });

    const filteredFields = useMemo(() => {
        const searchQuery = searchTerm.toLowerCase().trim();

        if (enableSearch && searchQuery) {
            return finalAllowedFields.filter(field =>
                field.toLowerCase().includes(searchQuery)
            );
        }

        return Array.from(fieldState.selectedFields);
    }, [enableSearch, searchTerm, finalAllowedFields, fieldState.selectedFields]);

    const visibleFieldsInfo = useMemo(() =>
            dynamicFieldInfo.filter(field => filteredFields.includes(field.name)),
        [dynamicFieldInfo, filteredFields]
    );

    const toggleField = (fieldName: string) => {
        if (!finalAllowedFields.includes(fieldName)) return;

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
            visibleFields: finalAllowedFields,
            selectedFields: new Set(finalAllowedFields)
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
        allAllowedFields: finalAllowedFields,
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

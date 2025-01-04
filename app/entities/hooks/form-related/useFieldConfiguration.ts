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

export function useFieldConfiguration<TEntity extends EntityKeys>(entityKey: TEntity, unifiedLayoutProps: UnifiedLayoutProps, showRelatedFields = true) {
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
        const allFields = showRelatedFields ? [...nativeFields, ...relationshipFields] : [...nativeFields];
        return allFields.filter((field) => !excludeFields.has(field));
    }, [nativeFields, relationshipFields, showRelatedFields, excludeFields]);

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

'use client';

import React, { useMemo } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { EntityKeys } from '@/types/entityTypes';
import EntityFormMinimalAnyRecord from './EntityFormMinimalAnyRecord';


const EntityFormRecordSelections = <TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);

    if (!selectedRecordIds?.length) {
        return null;
    }

    return (
        <div className='w-full space-y-4'>
            {selectedRecordIds.map((recordId) => (
                <EntityFormMinimalAnyRecord<TEntity>
                    key={recordId}
                    recordId={recordId}
                    unifiedLayoutProps={unifiedLayoutProps}
                />
            ))}
        </div>
    );
};

export default EntityFormRecordSelections;
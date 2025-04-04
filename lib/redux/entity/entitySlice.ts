// entitySliceRegistry.ts
'use client';

import { createEntitySlice } from './slice';
import { EntityKeys, AutomationEntities, AutomationEntity } from '@/types/entityTypes';
import { EntityFieldRecord, EntityMetadata } from '@/lib/redux/entity/types/stateTypes';
import { createInitialState } from '@/lib/redux/entity/utils/initialize';
import { createEntitySelectors } from './selectors';
import { useAppDispatch } from '@/lib/redux/hooks';
import { PayloadAction } from '@reduxjs/toolkit';



export const initializeEntitySlice = <TEntity extends EntityKeys>(entityKey: TEntity, schema: AutomationEntity<TEntity>) => {
    if (!schema) {
        throw new Error(`Schema not provided for entity: ${entityKey}`);
    }
    const metadata: EntityMetadata = {
        ...schema,
        entityName: entityKey,
        uniqueTableId: schema.uniqueTableId,
        uniqueEntityId: schema.uniqueEntityId,
        displayName: schema.displayName,
        schemaType: schema.schemaType,
        primaryKeyMetadata: schema.primaryKeyMetadata,
        displayFieldMetadata: schema.displayFieldMetadata,
        entityFields: schema.entityFields as EntityFieldRecord,
        relationships: schema.relationships,
    };

    return {
        initialState: createInitialState<TEntity>(metadata),
    };
};

export const entitySliceRegistry = new Map<
    EntityKeys,
    {
        actions: ReturnType<typeof createEntitySlice>['actions'];
        reducer: ReturnType<typeof createEntitySlice>['reducer'];
    }
>();

export function initializeEntitySlices(automationEntities: AutomationEntities) {
    Object.entries(automationEntities).forEach(([entityName, schema]) => {
        if (!entitySliceRegistry.has(entityName as EntityKeys)) {
            const { initialState } = initializeEntitySlice(entityName as EntityKeys, schema as AutomationEntity<EntityKeys>);
            const entitySlice = createEntitySlice(entityName as EntityKeys, initialState);
            entitySliceRegistry.set(entityName as EntityKeys, {
                actions: entitySlice.actions,
                reducer: entitySlice.reducer,
            });
        }
    });
}

export function getEntitySlice(entityKey: EntityKeys) {
    const slice = entitySliceRegistry.get(entityKey);
    if (!slice) {
        throw new Error(`Entity slice not found for key: ${entityKey}`);
    }
    return slice;
}

const entitySelectorsRegistry = new Map<EntityKeys, ReturnType<typeof createEntitySelectors>>();

export const getEntitySelectors = (entityKey: EntityKeys) => {
    let selectors = entitySelectorsRegistry.get(entityKey);
    if (!selectors) {
        selectors = createEntitySelectors(entityKey);
        entitySelectorsRegistry.set(entityKey, selectors);
    }
    return selectors;
};

// Helper types
export type EntitySliceActions = ReturnType<typeof createEntitySlice>['actions'];
export type ActionCreators = {
    [K in keyof EntitySliceActions]: EntitySliceActions[K] extends (state: any, action: PayloadAction<infer P>) => any
        ? (payload: P) => ReturnType<typeof useAppDispatch>
        : () => ReturnType<typeof useAppDispatch>;
};


// entitySliceRegistry.ts
'use client';

import {createEntitySlice} from './slice';
import {EntityKeys, AutomationEntities, AutomationEntity} from '@/types/entityTypes';
import {EntityMetadata} from "@/lib/redux/entity/types";
import {createInitialState, extractFieldsFromSchema} from "@/lib/redux/entity/initialize";

export const initializeEntitySlice = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    schema: AutomationEntity<TEntity>
) => {
    if (!schema) {
        throw new Error(`Schema not provided for entity: ${entityKey}`);
    }
    const metadata: EntityMetadata = {
        displayName: schema.entityNameFormats.pretty || entityKey,
        schemaType: schema.schemaType,
        primaryKeyMetadata: schema.primaryKeyMetadata,
        displayFieldMetadata: schema.displayFieldMetadata,
        fields: extractFieldsFromSchema(schema, entityKey),
        // @ts-ignore
        relationships: schema.relationships,
    };

    return {
        metadata,
        initialState: createInitialState<TEntity>(metadata)
    };
};


export const entitySliceRegistry = new Map<
    EntityKeys,
    {
        actions: ReturnType<typeof createEntitySlice>['actions'];
        reducer: ReturnType<typeof createEntitySlice>['reducer']
    }
>();


export function initializeEntitySlices(automationEntities: AutomationEntities) {
    Object.entries(automationEntities).forEach(([entityName, schema]) => {
        if (!entitySliceRegistry.has(entityName as EntityKeys)) {
            const {initialState} = initializeEntitySlice(entityName as EntityKeys, schema);
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



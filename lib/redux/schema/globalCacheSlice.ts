// lib/redux/slices/globalCacheSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    EntityKeys,
    UnifiedSchemaCache,
    AutomationEntities
} from "@/types/entityTypes";
import { SchemaEntity } from "@/types/schema";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {SchemaField} from "@/lib/redux/schema/concepts/types";


export interface GlobalCacheState {
    readonly schema: AutomationEntities;
    entityNames: EntityKeys[];
    entities: Partial<Record<EntityKeys, SchemaEntity>>;
    fields: Record<string, SchemaField>;
    fieldsByEntity: Partial<Record<EntityKeys, string[]>>;
    entityNameToCanonical: Record<string, EntityKeys>;
    fieldNameToCanonical: Record<EntityKeys, Record<string, string>>;
    entityNameFormats: Record<EntityKeys, Record<string, string>>;
    fieldNameFormats: Record<EntityKeys, Record<string, Record<string, string>>>;
    entityNameToDatabase: Record<EntityKeys, string>;
    entityNameToBackend: Record<EntityKeys, string>;
    fieldNameToDatabase: Record<EntityKeys, Record<string, string>>;
    fieldNameToBackend: Record<EntityKeys, Record<string, string>>;
    isInitialized?: boolean;
}


export function createGlobalCacheSlice(initialData: UnifiedSchemaCache) {

    const initialState: GlobalCacheState = {
        ...initialData,
        isInitialized: true
    };

    return createSlice({
        name: 'globalCache',
        initialState,
        reducers: {
            updateEntity: (state, action: PayloadAction<{
                entityName: EntityKeys;
                entity: SchemaEntity;
            }>) => {
                const { entityName, entity } = action.payload;
                state.entities[entityName] = entity;
                console.log(`Entity "${entityName}" updated in globalCacheSlice`);
            },

            updateField: (state, action: PayloadAction<{
                fieldId: string;
                field: SchemaField;
            }>) => {
                const { fieldId, field } = action.payload;
                state.fields[fieldId] = field;
                console.log(`Field "${fieldId}" updated in globalCacheSlice`);
            }
        },
    });
}

// Type guards
export const doesEntityExist = (
    state: GlobalCacheState,
    entityName: EntityKeys
): boolean => {
    const exists = entityName in state.entities;
    console.log(`Checking if entity "${entityName}" exists:`, exists);
    return exists;
}

export const doesFieldExist = (
    state: GlobalCacheState,
    fieldId: string
): boolean => {
    const exists = fieldId in state.fields;
    console.log(`Checking if field "${fieldId}" exists:`, exists);
    return exists;
}

// lib/redux/slices/globalCacheSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    EntityKeys,
    UnifiedSchemaCache,
    AutomationEntities
} from "@/types/entityTypes";
import {GlobalCacheState, SchemaEntity, SchemaField} from "@/types/schema";


const initialState: GlobalCacheState = {
    schema: {} as AutomationEntities,
    entityNames: [] as EntityKeys[],
    entities: {} as Partial<Record<EntityKeys, SchemaEntity>>,
    fields: {} as Record<string, SchemaField>,
    fieldsByEntity: {} as Partial<Record<EntityKeys, string[]>>,
    entityNameToCanonical: {} as Record<string, EntityKeys>,
    fieldNameToCanonical: {} as Record<EntityKeys, Record<string, string>>,
    entityNameFormats: {} as Record<EntityKeys, Record<string, string>>,
    fieldNameFormats: {} as Record<EntityKeys, Record<string, Record<string, string>>>,
    entityNameToDatabase: {} as Record<EntityKeys, string>,
    entityNameToBackend: {} as Record<EntityKeys, string>,
    fieldNameToDatabase: {} as Record<EntityKeys, Record<string, string>>,
    fieldNameToBackend: {} as Record<EntityKeys, Record<string, string>>,
    isInitialized: false
};


const globalCacheSlice = createSlice({
    name: 'globalCache',
    initialState,
    reducers: {
        initializeCache: (state, action: PayloadAction<UnifiedSchemaCache>) => {
            // @ts-ignore
            state.schema = action.payload.schema; // Full nested structure

            state.entityNames = action.payload.entityNames;  // List of entity names
            state.entities = action.payload.entities;  // Entity Objects, without fields

            state.fields = action.payload.fields;
            state.fieldsByEntity = action.payload.fieldsByEntity;
            state.entityNameToCanonical = action.payload.entityNameToCanonical;
            state.fieldNameToCanonical = action.payload.fieldNameToCanonical;
            state.entityNameFormats = action.payload.entityNameFormats;
            state.fieldNameFormats = action.payload.fieldNameFormats;
            state.entityNameToDatabase = action.payload.entityNameToDatabase;
            state.entityNameToBackend = action.payload.entityNameToBackend;
            state.fieldNameToDatabase = action.payload.fieldNameToDatabase;
            state.fieldNameToBackend = action.payload.fieldNameToBackend;
            state.isInitialized = true;
        },
        resetCache: () => initialState,

        updateEntity: (state, action: PayloadAction<{
            entityName: EntityKeys;
            entity: SchemaEntity
        }>) => {
            const { entityName, entity } = action.payload;
            state.entities[entityName] = entity;
        },

        updateField: (state, action: PayloadAction<{
            fieldId: string;
            field: SchemaField;
        }>) => {
            const { fieldId, field } = action.payload;
            state.fields[fieldId] = field;
        }
    }
});

export const {
    initializeCache,
    resetCache,
    updateEntity,
    updateField
} = globalCacheSlice.actions;

// Type guards
export const isGlobalCacheInitialized = (state: GlobalCacheState): boolean =>
    state.isInitialized;

export const doesEntityExist = (
    state: GlobalCacheState,
    entityName: EntityKeys
): boolean => entityName in state.entities;

export const doesFieldExist = (
    state: GlobalCacheState,
    fieldId: string
): boolean => fieldId in state.fields;

export default globalCacheSlice.reducer;

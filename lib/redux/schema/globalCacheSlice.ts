// lib/redux/slices/globalCacheSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EntityKeys, UnifiedSchemaCache, AutomationEntities } from '@/types/entityTypes';
import { SchemaEntity } from '@/types/schema';
import { SchemaField } from '@/lib/redux/schema/concepts/types';

export interface GlobalCacheState {
    schema: AutomationEntities;
    entityNames: EntityKeys[];
    entitiesWithoutFields: Partial<Record<EntityKeys, SchemaEntity>>;
    // fields: Record<string, SchemaField>;
    // fieldsByEntity: Partial<Record<EntityKeys, string[]>>;
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
        isInitialized: true,
    };

    return createSlice({
        name: 'globalCache',
        initialState,
        reducers: {
            updateEntity: (
                state,
                action: PayloadAction<{
                    entityName: EntityKeys;
                    entity: SchemaEntity;
                }>
            ) => {
                const { entityName, entity } = action.payload;
                state.entitiesWithoutFields[entityName] = entity;
                console.log(`Entity "${entityName}" updated in globalCacheSlice`);
            },

            updateField: (
                state,
                action: PayloadAction<{
                    entityName: EntityKeys;
                    fieldId: string;
                    field: SchemaField;
                }>
            ) => {
                const { entityName, fieldId, field } = action.payload;

                // Access the schema and the fields within the specific entity
                if (state.schema[entityName]) {
                    const entityFields = state.schema[entityName].entityFields;

                    if (entityFields) {
                        entityFields[fieldId] = field;
                        console.log(`Field "${fieldId}" updated in schema for entity "${entityName}"`);
                    } else {
                        console.error(`Entity fields not found for ${entityName}`);
                    }
                } else {
                    console.error(`Entity "${entityName}" not found in schema`);
                }
            },
        },
    });
}

// Type guards
export const doesEntityExist = (state: GlobalCacheState, entityName: EntityKeys): boolean => {
    const exists = entityName in state.entitiesWithoutFields;
    console.log(`Checking if entity "${entityName}" exists:`, exists);
    return exists;
};

export const doesFieldExist = (state: GlobalCacheState, entityName: EntityKeys, fieldId: string): boolean => {
    if (state.schema[entityName]) {
        const entityFields = state.schema[entityName].entityFields;
        const exists = fieldId in entityFields;
        console.log(`Checking if field "${fieldId}" exists in entity "${entityName}":`, exists);
        return exists;
    } else {
        console.log(`Entity "${entityName}" not found in schema.`);
        return false;
    }
};

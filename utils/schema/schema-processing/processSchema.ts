import {
    UnifiedSchemaCache,
    EntityKeys,
    AutomationSchema,
    AutomationEntities,
    SchemaEntity,
} from '@/types';
import { asEntityRelationships, entityRelationships } from '../fullRelationships';
import { initialAutomationTableSchema } from '../initialSchemas';
import { entityNameFormats, fieldNameFormats, entityNameToCanonical, fieldNameToCanonical } from '../lookupSchema';
import { processEntity } from './entityWithOverrides';
import { ENTITY_OVERRIDES } from './entityOverrides';
import { ENTITY_FIELD_OVERRIDES } from './fieldOverrides';
import { processEntityFields } from './entityFieldOverrides';
import { EntityOverrides } from './overrideTypes';

// Types remain the same
let globalCache: UnifiedSchemaCache | null = null;

// Part 1: Initialize name mappings
function initializeNameMappings<TEntity extends EntityKeys>() {
    const entityNameToDatabase = {} as Record<keyof AutomationSchema, string>;
    const entityNameToBackend = {} as Record<keyof AutomationSchema, string>;
    const fieldNameToDatabase = {} as Record<keyof AutomationSchema, Record<string, string>>;
    const fieldNameToBackend = {} as Record<keyof AutomationSchema, Record<string, string>>;

    // Build entity name mappings
    Object.entries(entityNameFormats).forEach(([canonicalName, formats]) => {
        const typedEntityName = canonicalName as EntityKeys;
        entityNameToDatabase[typedEntityName] = formats.database;
        entityNameToBackend[typedEntityName] = formats.backend;
    });

    // Build field name mappings
    Object.entries(fieldNameFormats).forEach(([entityName, fieldFormats]) => {
        const typedEntityName = entityName as EntityKeys;
        fieldNameToDatabase[typedEntityName] = {};
        fieldNameToBackend[typedEntityName] = {};

        Object.entries(fieldFormats).forEach(([fieldName, formats]) => {
            fieldNameToDatabase[typedEntityName][fieldName] = formats.database;
            fieldNameToBackend[typedEntityName][fieldName] = formats.backend;
        });
    });

    return {
        entityNameToDatabase,
        entityNameToBackend,
        fieldNameToDatabase,
        fieldNameToBackend,
    };
}

// Main initialization function
export function initializeSchemaSystem<TEntity extends EntityKeys>(trace: string[] = ['unknownCaller']): UnifiedSchemaCache {
    trace = [...trace, 'initializeSchemaSystem'];

    if (globalCache) {
        return globalCache;
    }

    const entityOverrides = ENTITY_OVERRIDES as Record<EntityKeys, EntityOverrides<EntityKeys>>;
    const fieldOverrides = ENTITY_FIELD_OVERRIDES;
    try {
        const processedSchema: Partial<AutomationEntities> = {};
        const entityNames: EntityKeys[] = [];
        const entitiesWithoutFields: Partial<Record<EntityKeys, SchemaEntity>> = {};

        // Part 1: Initialize name mappings
        const { entityNameToDatabase, entityNameToBackend, fieldNameToDatabase, fieldNameToBackend } = initializeNameMappings<TEntity>();

        // Process each entity
        Object.entries(initialAutomationTableSchema).forEach(([entityName, entityDef]) => {
            const typedEntityName = entityName as EntityKeys;
            entityNames.push(typedEntityName);

            // Part 2: Process Fields
            const processedFields = processEntityFields(typedEntityName, entityDef, fieldOverrides);

            // Part 3: Process Entity
            const { updatedEntity, updatedEntityWithFields } = processEntity(typedEntityName, entityDef, processedFields, entityOverrides);

            entitiesWithoutFields[entityName] = updatedEntity;
            processedSchema[entityName] = updatedEntityWithFields;
        });

        // Create and store global cache
        globalCache = {
            schema: processedSchema as AutomationEntities,
            entityNames,
            entitiesWithoutFields,
            entityNameToCanonical: { ...entityNameToCanonical },
            fieldNameToCanonical: { ...fieldNameToCanonical },
            entityNameFormats,
            fieldNameFormats,
            entityNameToDatabase,
            entityNameToBackend,
            fieldNameToDatabase,
            fieldNameToBackend,
            fullEntityRelationships: asEntityRelationships(entityRelationships),
        };

        return globalCache;
    } catch (error) {
        throw error;
    }
}

export function generateClientGlobalCache(): UnifiedSchemaCache {
    if (!globalCache) initializeSchemaSystem();

    if (!globalCache) throw new Error('Schema system not initialized');

    return globalCache;
}

export function getGlobalCache(trace: string[] = ['unknownCaller']): UnifiedSchemaCache | null {
    trace = [...trace, 'getGlobalCache'];

    if (!globalCache) {
        console.warn('Global cache is not initialized. Returning null.');
        return null;
    }

    return globalCache;
}

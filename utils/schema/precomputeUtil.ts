import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";

import {schemaLogger} from '@/lib/logger/schema-logger';
import {
    AllEntityNameVariations,
    AllFieldNameVariations,
    AutomationEntities,
    AutomationEntity,
    AutomationSchema,
    createFormattedRecord,
    DataFormat, EntityComponentProps, EntityDefaultFetchStrategy,
    EntityField,
    EntityFieldKeys,
    EntityKeys,
    EntityNameFormat,
    EntityNameFormats,
    EntityRecord, EntityRelationships, EntitySchemaType,
    FieldNameFormat,
    FieldNameFormats,
    isFetchStrategy,
    TypeBrand,
    UnifiedSchemaCache
} from "@/types/entityTypes";
import {
    entityNameFormats,
    entityNameToCanonical,
    fieldNameFormats,
    fieldNameToCanonical
} from "@/utils/schema/lookupSchema";
import {NameFormat} from "@/types/AutomationSchemaTypes";
import {createFieldId, EntityNameOfficial, relationships, SchemaEntity, SchemaField} from "@/types/schema";


/**
 * Initializes and processes the schema for client-side use
 */
function initializeAutomationSchema<TEntity extends EntityKeys>(
    initialSchema: AutomationSchema
): AutomationEntities {
    const processedSchema = {} as Record<EntityKeys, AutomationEntity<EntityKeys>>;

    for (const [entityKey, entity] of Object.entries(initialSchema)) {
        const typedEntityKey = entityKey as TEntity;

        // Process fields
        const processedFields: Record<string, EntityField<TEntity, any>> = {};
        for (const [fieldKey, field] of Object.entries(entity.entityFields)) {
            processedFields[fieldKey] = {...field};
        }

        // Validate fetch strategy
        if (!isFetchStrategy(entity.defaultFetchStrategy)) {
            throw new Error(`Invalid fetch strategy for entity ${entityKey}: ${entity.defaultFetchStrategy}`);
        }

        // Create the processed entity
        const processedEntity: AutomationEntity<TEntity> = {
            schemaType: entity.schemaType as EntitySchemaType<TEntity>,
            defaultFetchStrategy: entity.defaultFetchStrategy as EntityDefaultFetchStrategy<TEntity>,
            componentProps: entity.componentProps as EntityComponentProps<TEntity>,
            entityNameFormats: entity.entityNameFormats as EntityNameFormats<TEntity>,
            relationships: entity.relationships as EntityRelationships<TEntity>,
            entityFields: processedFields
        };

        processedSchema[typedEntityKey] = processedEntity;
    }

    return processedSchema as AutomationEntities;
}


// function normalizeSchema(originalSchema: AutomationEntities) {
//     const entityNames: EntityNameOfficial[] = [];
//     const entities: Partial<Record<EntityNameOfficial, SchemaEntity>> = {};
//     const fields: Record<string, SchemaField> = {};
//     const fieldsByEntity: Partial<Record<EntityNameOfficial, string[]>> = {};
//
//     Object.entries(originalSchema).forEach(([entityName, entityDef]) => {
//         const entity: SchemaEntity = {
//             entityName: entityName as EntityNameOfficial,
//             schemaType: entityDef.schemaType,
//             defaultFetchStrategy: entityDef.defaultFetchStrategy,
//             componentProps: entityDef.componentProps,
//             // Convert readonly array to mutable array
//             relationships: Array.from(entityDef.relationships) as EntityRelationships<EntityNameOfficial>,
//         };
//
//         entityNames.push(entityName as EntityNameOfficial);
//         entities[entityName as EntityNameOfficial] = entity;
//         fieldsByEntity[entityName as EntityNameOfficial] = [];
//
//         // Process fields
//         Object.entries(entityDef.entityFields).forEach(([fieldName, fieldDef]) => {
//             const fieldId = createFieldId(entityName as EntityNameOfficial, fieldName);
//
//             const field: SchemaField = {
//                 fieldName,
//                 entityName: entityName as EntityNameOfficial,
//                 ...fieldDef,
//                 // Convert readonly arrays to mutable arrays
//                 validationFunctions: Array.from(fieldDef.validationFunctions),
//                 exclusionRules: Array.from(fieldDef.exclusionRules),
//             };
//
//             fields[fieldId] = field;
//             fieldsByEntity[entityName as EntityNameOfficial]?.push(fieldId);
//         });
//     });
//
//     return {
//         entityNames,
//         entities,
//         fields,
//         fieldsByEntity,
//     };
// }


/**
 * Generates the client-side schema bundle
 */
export function generateClientGlobalCache(): UnifiedSchemaCache {
    if (!globalCache) throw new Error('Schema system not initialized');
    logSchemaCacheReport(globalCache);
    console.log('Client schema generated successfully');

    return globalCache;
}


/**
 * Type guard to ensure schema is properly initialized
 */
function isInitializedSchema(schema: unknown): schema is AutomationEntities {
    if (!schema || typeof schema !== 'object') return false;

    for (const [entityKey, entity] of Object.entries(schema)) {
        if (!entity.entityFields || !entity.entityNameFormats) return false;
    }

    return true;
}


function deepCopy<T>(data: T): T {
    if (data === null || typeof data !== 'object') {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => deepCopy(item)) as unknown as T;
    }

    const result: Record<string, unknown> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            result[key] = deepCopy((data as Record<string, unknown>)[key]);
        }
    }

    return result as T;
}

let globalCache: UnifiedSchemaCache | null = null;

export function initializeSchemaSystem<TEntity extends EntityKeys>(
    trace: string[] = ['unknownCaller']
): UnifiedSchemaCache {
    trace = [...trace, 'initializeSchemaSystem'];

    if (globalCache) {
        return globalCache;
    }

    try {
        // Initialize all caches and mappings
        const processedSchema: Partial<AutomationEntities> = {};
        const entityNames: EntityKeys[] = [];
        const entities: Partial<Record<EntityKeys, SchemaEntity>> = {};
        const fields: Record<string, SchemaField> = {};
        const fieldsByEntity: Partial<Record<EntityKeys, string[]>> = {};

        // Initialize reverse mapping objects
        const entityNameToDatabase = {} as Record<keyof AutomationSchema, string>;
        const entityNameToBackend = {} as Record<keyof AutomationSchema, string>;
        const fieldNameToDatabase = {} as Record<keyof AutomationSchema, Record<string, string>>;
        const fieldNameToBackend = {} as Record<keyof AutomationSchema, Record<string, string>>;

        // First pass: Build name mappings
        Object.entries(entityNameFormats).forEach(([canonicalName, formats]) => {
            const typedEntityName = canonicalName as EntityKeys;
            entityNameToDatabase[typedEntityName] = formats.database;
            entityNameToBackend[typedEntityName] = formats.backend;
        });

        Object.entries(fieldNameFormats).forEach(([entityName, fieldFormats]) => {
            const typedEntityName = entityName as EntityKeys;
            fieldNameToDatabase[typedEntityName] = {};
            fieldNameToBackend[typedEntityName] = {};

            Object.entries(fieldFormats).forEach(([fieldName, formats]) => {
                fieldNameToDatabase[typedEntityName][fieldName] = formats.database;
                fieldNameToBackend[typedEntityName][fieldName] = formats.backend;
            });
        });

        // Second pass: Process schema
        Object.entries(initialAutomationTableSchema).forEach(([entityName, entityDef]) => {
            const typedEntityName = entityName as TEntity;

            // Initialize entity level collections
            entityNames.push(typedEntityName);
            fieldsByEntity[typedEntityName] = [];

            // Process fields with proper typing
            const processedFields: Record<
                EntityFieldKeys<TEntity>,
                EntityField<TEntity, EntityFieldKeys<TEntity>>
            > = {};

            // Process entity fields
            Object.entries(entityDef.entityFields).forEach(([fieldName, fieldDef]) => {
                const typedFieldName = fieldName as EntityFieldKeys<TEntity>;

                // Process field with complete typing
                processedFields[typedFieldName] = {
                    ...fieldDef,
                    fieldNameFormats: fieldDef.fieldNameFormats as FieldNameFormats<TEntity, typeof typedFieldName>,
                    validationFunctions: Array.from(fieldDef.validationFunctions),
                    exclusionRules: Array.from(fieldDef.exclusionRules)
                } as EntityField<TEntity, typeof typedFieldName>;

                // Create and store normalized field structure
                const fieldId = createFieldId(typedEntityName, typedFieldName);
                fields[fieldId] = {
                    fieldName: typedFieldName,
                    entityName: typedEntityName,
                    ...fieldDef,
                    validationFunctions: Array.from(fieldDef.validationFunctions),
                    exclusionRules: Array.from(fieldDef.exclusionRules)
                };

                fieldsByEntity[typedEntityName]?.push(fieldId);
            });

            // @ts-ignore Create fully typed entity definition
            entities[typedEntityName] = {
                entityName: typedEntityName,
                schemaType: entityDef.schemaType as EntitySchemaType<TEntity>,
                defaultFetchStrategy: entityDef.defaultFetchStrategy as EntityDefaultFetchStrategy<TEntity>,
                componentProps: entityDef.componentProps as EntityComponentProps<TEntity>,
                relationships: entityDef.relationships as EntityRelationships<TEntity>
            };

            // @ts-ignore Store processed entity with complete typing
            processedSchema[typedEntityName] = {
                schemaType: entityDef.schemaType as EntitySchemaType<TEntity>,
                defaultFetchStrategy: entityDef.defaultFetchStrategy as EntityDefaultFetchStrategy<TEntity>,
                componentProps: entityDef.componentProps as EntityComponentProps<TEntity>,
                entityNameFormats: entityDef.entityNameFormats as EntityNameFormats<TEntity>,
                relationships: entityDef.relationships as EntityRelationships<TEntity>,
                entityFields: processedFields
            } as AutomationEntity<TEntity>;
        });

        // Create and store global cache
        globalCache = {
            schema: processedSchema as AutomationEntities,
            entityNames,
            entities,
            fields,
            fieldsByEntity,
            entityNameToCanonical: {...entityNameToCanonical},
            fieldNameToCanonical: {...fieldNameToCanonical},
            entityNameFormats: deepCopy(entityNameFormats),
            fieldNameFormats: deepCopy(fieldNameFormats),
            entityNameToDatabase,
            entityNameToBackend,
            fieldNameToDatabase,
            fieldNameToBackend,
        };

        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'globalCache',
            message: 'Schema system initialized successfully',
            level: 'info',
            trace
        });

        return globalCache;

    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'error',
            message: `Schema initialization failed: ${error instanceof Error ? error.message : String(error)}`,
            level: 'error',
            trace
        });
        throw error;
    }
}


/**
 * Force resets the entire cache system (useful for testing)
 */
export function resetCache(): void {
    globalCache = null;
}


/**
 * Retrieves the global cache, ensuring no errors are thrown.
 * Logs a warning if the cache is not initialized.
 */
export function getGlobalCache(trace: string[] = ['unknownCaller']): UnifiedSchemaCache | null {

    trace = [...trace, 'getGlobalCache'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'null',
            message: 'Schema system not initialized. Access to global cache failed.',
            level: 'warn',
            trace
        });
        console.warn('Global cache is not initialized. Returning null.');
        return null;
    }

    return globalCache;
}


/**
 * Type utilities for field keys and variations
 */
export type StringFieldKey<TEntity extends EntityKeys> =
    Extract<EntityFieldKeys<TEntity>, string>;

/**
 * Field name variant type ensuring string keys
 */
export type FieldNameVariant<TEntity extends EntityKeys> =
    | StringFieldKey<TEntity>
    | AllFieldNameVariations<TEntity, StringFieldKey<TEntity>>;

/**
 * Resolve table/entity name with logging
 */
export function resolveEntityName(
    entityNameVariant: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): EntityKeys {
    trace = [...trace, 'resolveEntityName'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: String(entityNameVariant),
            resolved: String(entityNameVariant),
            message: `Global cache is not initialized when resolving entity name: '${String(entityNameVariant)}'`,
            level: 'warn',
            trace
        });
        return entityNameVariant as EntityKeys;
    }

    const resolvedEntityName = getEntityKeyFromUnknown(String(entityNameVariant));

    // Keep existing logging pattern
    if (resolvedEntityName === entityNameVariant) {
        schemaLogger.logResolution({
            resolutionType: 'entity',
            original: String(entityNameVariant),
            resolved: resolvedEntityName,
            message: `Entity name resolution failed for: '${String(entityNameVariant)}'`,
            level: 'warn',
            trace
        });
    } else {
        schemaLogger.logResolution({
            resolutionType: 'entity',
            original: String(entityNameVariant),
            resolved: resolvedEntityName,
            message: `Successfully resolved entity name: '${String(entityNameVariant)}' to '${resolvedEntityName}'`,
            level: 'info',
            trace
        });
    }

    return resolvedEntityName as EntityKeys;
}

/**
 * Field resolution with logging
 */
export function resolveFieldName<TEntity extends EntityKeys>(
    entityKey: TEntity,
    fieldNameVariant: FieldNameVariant<TEntity>,
    trace: string[] = ['unknownCaller']
): StringFieldKey<TEntity> {
    trace = [...trace, 'resolveFieldName'];
    const fieldNameString = String(fieldNameVariant);

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: fieldNameString,
            resolved: fieldNameString,
            message: `Global cache is not initialized when resolving field name: '${fieldNameString}'`,
            level: 'warn',
            trace
        });
        return fieldNameString as StringFieldKey<TEntity>;
    }

    const resolvedFieldName = getUnknownFieldWithKnownEntityKey(entityKey, fieldNameString);
    const resolvedFieldString = String(resolvedFieldName);

    if (resolvedFieldString === fieldNameString) {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: fieldNameString,
            resolved: resolvedFieldString,
            message: `Field name resolution failed for: '${fieldNameString}' in entity '${entityKey}'`,
            level: 'warn',
            trace
        });
    } else {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: fieldNameString,
            resolved: resolvedFieldString,
            message: `Successfully resolved field name: '${fieldNameString}' to '${resolvedFieldString}'`,
            level: 'info',
            trace
        });
    }

    return resolvedFieldName as StringFieldKey<TEntity>;
}

/**
 * Type for resolved field information
 */
export type ResolvedField<TEntity extends EntityKeys> = {
    original: string;
    resolved: StringFieldKey<TEntity>;
    entityKey: TEntity;
};

/**
 * Safe field resolution with complete information
 */
export function resolveFieldNameSafe<TEntity extends EntityKeys>(
    entityKey: TEntity,
    fieldNameVariant: FieldNameVariant<TEntity>,
    trace: string[] = ['unknownCaller']
): ResolvedField<TEntity> {
    const original = String(fieldNameVariant);
    const resolved = resolveFieldName(entityKey, fieldNameVariant, trace);

    return {
        original,
        resolved,
        entityKey
    };
}

/**
 * Get entity key with resolution fallback
 */
export function getEntityKey(
    entityNameVariant: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): EntityKeys {
    trace = [...trace, 'getEntityKey'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: entityNameVariant,
            resolved: entityNameVariant,
            message: `Global cache is not initialized when trying to resolve entity name: '${entityNameVariant}'`,
            level: 'warn',
            trace
        });
        return entityNameVariant as EntityKeys;
    }

    const schema = globalCache.schema;

    // Check if already a valid key
    if (schema[entityNameVariant as EntityKeys]) {
        return entityNameVariant as EntityKeys;
    }

    // Fall back to resolution
    return resolveEntityName(entityNameVariant, trace);
}

/**
 * Type for unknown string inputs
 */
export type UnknownNameString = string;


/**
 * Type guards and conversion utilities
 */

/**
 * Type guard for unknown entity name
 */
export function isKnownEntityVariant(
    unknownEntity: unknown
): unknownEntity is AllEntityNameVariations {
    if (typeof unknownEntity !== 'string') return false;
    if (!globalCache) return false;

    return unknownEntity in globalCache.entityNameToCanonical;
}

/**
 * Type guard for unknown field name with known entity
 */
export function isKnownFieldVariant<TEntity extends EntityKeys>(
    entityKey: TEntity,
    unknownField: unknown
): unknownField is AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>> {
    if (typeof unknownField !== 'string') return false;
    if (!globalCache) return false;

    const entityFields = globalCache.fieldNameToCanonical[entityKey];
    if (!entityFields) return false;

    return unknownField in entityFields;
}

/**
 * Combined type guard for entity and field
 */
export function isKnownEntityAndFieldVariant<TEntity extends EntityKeys>(
    unknownEntity: unknown,
    unknownField: unknown
): unknownEntity is AllEntityNameVariations {
    if (typeof unknownEntity !== 'string' || typeof unknownField !== 'string') {
        return false;
    }
    if (!globalCache) return false;

    // First check if the entity variant is valid and get its canonical form
    if (!(unknownEntity in globalCache.entityNameToCanonical)) {
        return false;
    }

    // Get the canonical entity key to check the field
    const canonicalEntity = globalCache.entityNameToCanonical[unknownEntity];

    // Now check if the field exists for this entity
    const entityFields = globalCache.fieldNameToCanonical[canonicalEntity];
    if (!entityFields) return false;

    return unknownField in entityFields;
}


export type NestedObject = { [key: string]: any };

/**
 * Check if field exists in schema
 */
function isValidFieldInSchema<TEntity extends EntityKeys>(
    fields: AutomationEntities[TEntity]['entityFields'],
    fieldName: string | FieldNameVariant<TEntity>
): fieldName is StringFieldKey<TEntity> {
    return fieldName in fields;
}

/**
 * Get canonical field key from any variation
 */
export function getFieldKey<TEntity extends EntityKeys>(
    entityKey: TEntity,
    anyFieldNameVariation: FieldNameVariant<TEntity> | UnknownNameString,
    trace: string[] = ['unknownCaller']
): StringFieldKey<TEntity> {
    trace = [...trace, 'getFieldKey'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: String(anyFieldNameVariation),
            resolved: String(anyFieldNameVariation),
            message: `Global cache not initialized when resolving field: '${String(anyFieldNameVariation)}'`,
            level: 'warn',
            trace
        });
        return String(anyFieldNameVariation) as StringFieldKey<TEntity>;
    }

    const fields = globalCache.schema[entityKey]?.entityFields;

    if (fields && isValidFieldInSchema(fields, anyFieldNameVariation)) {
        return anyFieldNameVariation;
    }

    return resolveFieldName(entityKey, anyFieldNameVariation as FieldNameVariant<TEntity>, trace);
}

/**
 * Get entity key from unknown string
 */
export function getEntityKeyFromUnknown(
    entityNameVariant: UnknownNameString,
    trace: string[] = ['unknownCaller']
): EntityKeys {
    trace = [...trace, 'getEntityKeyFromUnknown'];

    if (isKnownEntityVariant(entityNameVariant)) {
        return getEntityKey(entityNameVariant, trace);
    }

    return getEntityKey(entityNameVariant as AllEntityNameVariations, trace);
}

/**
 * Get field key with known entity key
 */
export function getUnknownFieldWithKnownEntityKey<TEntity extends EntityKeys>(
    entityKey: TEntity,
    anyFieldNameVariation: UnknownNameString,
    trace: string[] = ['unknownCaller']
): StringFieldKey<TEntity> {
    trace = [...trace, 'getUnknownFieldWithKnownEntityKey'];

    if (isKnownFieldVariant(entityKey, anyFieldNameVariation)) {
        return getFieldKey(entityKey, anyFieldNameVariation, trace);
    }

    return getFieldKey(entityKey, anyFieldNameVariation as FieldNameVariant<TEntity>, trace);
}

/**
 * Get field key from unknown strings
 */
export function getFieldKeyFromUnknown(
    entityNameVariant: UnknownNameString,
    anyFieldNameVariation: UnknownNameString,
    trace: string[] = ['unknownCaller']
): string {
    trace = [...trace, 'getFieldKeyFromUnknown'];

    const entityKey = getEntityKeyFromUnknown(entityNameVariant, trace) as EntityKeys;

    return getUnknownFieldWithKnownEntityKey(
        entityKey,
        anyFieldNameVariation,
        trace
    );
}

/**
 * Create type-safe field resolver for a specific entity
 */
export function createSafeFieldResolver<TEntity extends EntityKeys>() {
    return {
        forEntity: (entityKey: TEntity) => ({
            resolveField: (fieldName: UnknownNameString) =>
                getUnknownFieldWithKnownEntityKey(entityKey, fieldName)
        })
    };
}

/**
 * Create general purpose field resolver
 */
export function createFieldResolver() {
    return {
        resolveField: <TEntity extends EntityKeys>(
            entity: TEntity | UnknownNameString,
            field: UnknownNameString
        ) => {
            const resolvedEntity = getEntityKeyFromUnknown(String(entity));
            return getUnknownFieldWithKnownEntityKey(resolvedEntity, field);
        }
    };
}

/**
 * Convert entity and field names in an object structure
 */
export function convertEntityAndFieldsInObject<TEntity extends EntityKeys>(
    inputObject: unknown,
    entityNameVariant: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): Record<string, unknown> | unknown[] {
    trace = [...trace, 'convertEntityAndFieldsInObject'];

    // Resolve the entity key with proper typing
    const entityKey = getEntityKey(entityNameVariant, trace) as TEntity;

    // Handle non-object cases
    if (typeof inputObject !== 'object' || inputObject === null) {
        return {};
    }

    // Handle arrays
    if (Array.isArray(inputObject)) {
        return inputObject.map(item =>
            convertEntityAndFieldsInObject<TEntity>(item, entityNameVariant, trace)
        );
    }

    // Handle objects
    const result: Record<string, unknown> = {};

    for (const key in inputObject) {
        if (Object.prototype.hasOwnProperty.call(inputObject, key)) {
            const fieldKey = getFieldKey<TEntity>(
                entityKey,
                key as UnknownNameString,
                trace
            );

            result[fieldKey] = convertFieldsInNestedObject<TEntity>(
                (inputObject as Record<string, unknown>)[key],
                entityKey,
                trace
            );
        }
    }

    return result;
}

/**
 * Convert field names in nested object structures
 */
export function convertFieldsInNestedObject<TEntity extends EntityKeys>(
    inputObject: unknown,
    entityKey: TEntity,
    trace: string[] = ['unknownCaller']
): Record<string, unknown> | unknown[] | unknown {
    trace = [...trace, 'convertFieldsInNestedObject'];

    // Handle non-object cases
    if (typeof inputObject !== 'object' || inputObject === null) {
        return inputObject;
    }

    // Handle arrays
    if (Array.isArray(inputObject)) {
        return inputObject.map(item =>
            convertFieldsInNestedObject<TEntity>(item, entityKey, trace)
        );
    }

    // Handle objects
    const result: Record<string, unknown> = {};

    for (const key in inputObject) {
        if (Object.prototype.hasOwnProperty.call(inputObject, key)) {
            const fieldKey = getFieldKey<TEntity>(
                entityKey,
                key as UnknownNameString,
                trace
            );

            result[fieldKey] = convertFieldsInNestedObject<TEntity>(
                (inputObject as Record<string, unknown>)[key],
                entityKey,
                trace
            );
        }
    }

    return result;
}


// ----------------------------
/**
 * Gets the standardized key for any entity name variant
 */
export function resolveEntityKey(entityNameVariant: AllEntityNameVariations): EntityKeys {
    if (!globalCache) throw new Error('Schema system not initialized');
    const canonicalKey = globalCache.entityNameToCanonical[entityNameVariant];

    if (!canonicalKey) {
        throw new Error(`Invalid entity name variant: ${entityNameVariant}`);
    }

    return canonicalKey;
}

/**
 * Type for conversion tracking
 */
export type ConversionResult<TEntity extends EntityKeys> = {
    originalKey: string;
    resolvedKey: StringFieldKey<TEntity>;
    value: unknown;
};

/**
 * Track field conversion results
 */
export function trackFieldConversion<TEntity extends EntityKeys>(
    entityKey: TEntity,
    originalKey: string,
    value: unknown,
    trace: string[] = ['unknownCaller']
): ConversionResult<TEntity> {
    const resolvedKey = getFieldKey(entityKey, originalKey, trace);
    return {
        originalKey,
        resolvedKey,
        value
    };
}

/**
 * Gets the standardized key for any field name variant
 */
export function resolveFieldKey<TEntity extends EntityKeys>(
    entityKey: TEntity,
    fieldNameVariant: UnknownNameString
): StringFieldKey<TEntity> {
    if (!globalCache) throw new Error('Schema system not initialized');

    const entityFields = globalCache.fieldNameToCanonical[entityKey];
    if (!entityFields) return fieldNameVariant as StringFieldKey<TEntity>;

    return (entityFields[fieldNameVariant.toLowerCase()] || fieldNameVariant) as StringFieldKey<TEntity>;
}

/**
 * Gets an entity's name in a specific format
 */
export function getEntityName(
    entityNameVariant: AllEntityNameVariations,
    format: keyof EntityNameFormats<EntityKeys> = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const entityKey = resolveEntityKey(entityNameVariant);
    return globalCache.entityNameFormats[entityKey]?.[format] || entityNameVariant;
}

/**
 * Gets a field's name in a specific format
 */
// export function getFieldName(
//     entityNameVariant: AllEntityNameVariations,
//     fieldNameVariant: string,
//     format: keyof FieldNameFormats<EntityKeys, any> = 'frontend'
// ): string {
//     if (!globalCache) throw new Error('Schema system not initialized');
//
//     const entityKey = resolveEntityKey(entityNameVariant);
//     const fieldKey = resolveFieldKey(entityKey, fieldNameVariant);
//
//     return globalCache.fieldNameFormats[entityKey]?.[fieldKey]?.[format] || fieldNameVariant;
// }


/**
 * Strictly typed field name resolution
 */
// export function getFieldNameStrict<
//     TEntity extends EntityKeys,
//     TField extends EntityFieldKeys<TEntity>
// >(
//     entityNameVariant: AllEntityNameVariations | TEntity,
//     fieldNameVariant: string,
//     format: keyof FieldNameFormats<TEntity, TField> = 'frontend'
// ): string {
//     if (!globalCache) throw new Error('Schema system not initialized');
//
//     const entityKey = resolveEntityKey(entityNameVariant) as TEntity;
//     const fieldKey = resolveFieldKey(entityKey, fieldNameVariant) as TField;
//
//     return globalCache.fieldNameFormats[entityKey]?.[fieldKey]?.[format] || fieldNameVariant;
// }

``

/**
 * Helper function to safely access field name mappings
 */
export function getFieldNameMapping<TEntity extends EntityKeys>(
    entity: TEntity,
    field: StringFieldKey<TEntity>,
    format: keyof EntityNameFormats<TEntity> = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const fieldInfo = globalCache.schema[entity]?.entityFields[field];
    return fieldInfo?.fieldNameFormats[format] || field;
}

/**
 * Type guard to check if an entity exists in the schema
 */
export function isValidEntity(
    entityKey: string
): entityKey is EntityKeys {
    return entityKey in (globalCache?.schema ?? {});
}

/**
 * Safe wrapper around resolveEntityKey
 */
export function resolveEntityKeyStrict(
    entityNameVariant: AllEntityNameVariations
): EntityKeys {
    const resolved = resolveEntityKey(entityNameVariant);
    if (!isValidEntity(resolved)) {
        throw new Error(`Invalid entity name: ${entityNameVariant}`);
    }
    return resolved;
}

/**
 * Get entity schema with optional format conversion
 */
export function getEntitySchema<
    TEntity extends EntityKeys,
    TFormat extends DataFormat = 'frontend'
>(
    entityNameVariant: AllEntityNameVariations,
    format: TFormat = 'frontend' as TFormat,
    trace: string[] = ['unknownCaller']
): AutomationEntity<TEntity> | null {
    trace = [...trace, 'getEntitySchema'];

    try {
        // Get cache and validate
        const globalCache = getGlobalCache(trace);
        if (!globalCache) return null;

        // Resolve entity key
        const entityKey = resolveEntityKey(entityNameVariant) as TEntity;
        const entitySchema = globalCache.schema[entityKey];

        if (!entitySchema) {
            schemaLogger.logResolution({
                resolutionType: 'entity',
                original: entityNameVariant,
                resolved: '',
                message: `Entity schema not found: ${entityNameVariant}`,
                level: 'error',
                trace
            });
            return null;
        }

        return entitySchema;
    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'entity',
            original: entityNameVariant,
            resolved: '',
            message: `Error getting entity schema: ${error}`,
            level: 'error',
            trace
        });
        return null;
    }
}

/**
 * Convert data to specified format
 */
export function convertData<
    TEntity extends EntityKeys,
    TFormat extends DataFormat = 'frontend'
>(
    data: unknown,
    entityKey: TEntity,
    format: TFormat = 'frontend' as TFormat,
    trace: string[] = ['unknownCaller']
): EntityRecord<TEntity, TFormat> | EntityRecord<TEntity, TFormat>[] | unknown {
    trace = [...trace, 'convertData'];

    try {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item =>
                convertData(item, entityKey, format, trace)
            );
        }

        // Convert to formatted record
        const formattedRecord = createFormattedRecord(
            entityKey,
            data as Record<string, unknown>,
            format
        );

        // Convert nested fields
        return convertEntityAndFieldsInObject<TEntity>(
            formattedRecord,
            entityKey,
            trace
        );

    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'entity',
            original: JSON.stringify(data),
            resolved: '',
            message: `Error converting data: ${error}`,
            level: 'error',
            trace
        });
        return null;
    }
}

/**
 * Type definitions for type references
 */
type BasicTypeReference = "bool" | "dict" | "float" | "int" | "list" | "str" | "url";
type ExtendedTypeReference = BasicTypeReference | "string" | "number" | "boolean" | "Date" | undefined;

/**
 * Validate and convert field value based on type reference
 */
export function validateAndConvertFieldType<T extends ExtendedTypeReference>(
    value: unknown,
    typeRef: TypeBrand<T>,
    trace: string[] = ['unknownCaller']
): { isValid: boolean; convertedValue: unknown } {
    try {
        if (!typeRef || !('_typeBrand' in typeRef)) {
            return {isValid: true, convertedValue: value};
        }

        const type = typeRef._typeBrand;

        switch (type) {
            case 'bool':
            case 'boolean':
                return {
                    isValid: typeof value === 'boolean' || ['true', 'false', '0', '1'].includes(String(value)),
                    convertedValue: Boolean(value)
                };

            case 'int':
            case 'number':
                const intValue = Number(value);
                return {
                    isValid: Number.isInteger(intValue),
                    convertedValue: Number.isInteger(intValue) ? intValue : null
                };

            case 'float':
                const floatValue = Number(value);
                return {
                    isValid: !isNaN(floatValue),
                    convertedValue: !isNaN(floatValue) ? floatValue : null
                };

            case 'str':
            case 'string':
                return {
                    isValid: true,
                    convertedValue: String(value)
                };

            case 'url':
                try {
                    new URL(String(value));
                    return {
                        isValid: true,
                        convertedValue: String(value)
                    };
                } catch {
                    return {
                        isValid: false,
                        convertedValue: null
                    };
                }

            case 'list':
                return {
                    isValid: Array.isArray(value),
                    convertedValue: Array.isArray(value) ? value : [value]
                };

            case 'dict':
                return {
                    isValid: typeof value === 'object' && value !== null,
                    convertedValue: typeof value === 'object' && value !== null ? value : {}
                };

            case 'Date':
                const date = new Date(value as string | number | Date);
                return {
                    isValid: !isNaN(date.getTime()),
                    convertedValue: !isNaN(date.getTime()) ? date : null
                };

            default:
                return {
                    isValid: true,
                    convertedValue: value
                };
        }
    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: String(value),
            resolved: '',
            message: `Type validation failed: ${error}`,
            level: 'error',
            trace
        });
        return {
            isValid: false,
            convertedValue: value
        };
    }
}

/**
 * Convert type with validation
 */
export function convertType<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
>(
    value: unknown,
    entityKey: TEntity,
    fieldKey: TField,
    trace: string[] = ['unknownCaller']
): unknown {
    trace = [...trace, 'convertType'];

    try {
        const entitySchema = getEntitySchema(entityKey, 'frontend', trace);
        if (!entitySchema) return value;

        const field = entitySchema.entityFields[fieldKey];
        if (!field) return value;

        const {isValid, convertedValue} = validateAndConvertFieldType(
            value,
            field.typeReference as TypeBrand<ExtendedTypeReference>,
            trace
        );

        if (!isValid) {
            schemaLogger.logResolution({
                resolutionType: 'field',
                original: String(value),
                resolved: String(convertedValue),
                message: `Invalid value for field type ${
                    field.typeReference
                }`,
                level: 'warn',
                trace
            });
        }

        return convertedValue;
    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: String(value),
            resolved: '',
            message: `Type conversion failed: ${error}`,
            level: 'error',
            trace
        });
        return value;
    }
}

/**
 * Batch resolve fields with proper typing
 */
export function batchResolveFields<TEntity extends EntityKeys>(
    entityKey: TEntity,
    fieldVariants: string[],
    trace: string[] = ['unknownCaller']
): Record<string, EntityFieldKeys<TEntity>> {
    trace = [...trace, 'batchResolveFields'];

    try {
        return Object.fromEntries(
            fieldVariants.map(variant => [
                variant,
                resolveFieldKey(entityKey, variant as AllFieldNameVariations<TEntity, EntityFieldKeys<TEntity>>)
            ])
        ) as Record<string, EntityFieldKeys<TEntity>>;

    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: fieldVariants.join(', '),
            resolved: '',
            message: `Error batch resolving fields: ${error}`,
            level: 'error',
            trace
        });
        return {};
    }
}


/**
 * Entity name validation
 */
export function ensureEntityName(entityName: AllEntityNameVariations): EntityKeys {
    const resolved = resolveEntityKey(entityName);
    if (!globalCache?.schema[resolved]) {
        throw new Error(`Invalid entity name: ${entityName}`);
    }
    return resolved;
}

/**
 * Field name validation
 */
export function ensureFieldName<TEntity extends EntityKeys>(
    entity: TEntity,
    field: string
): StringFieldKey<TEntity> {
    const resolved = resolveFieldKey(entity, field);
    if (!globalCache?.schema[entity]?.entityFields[resolved]) {
        throw new Error(`Invalid field name: ${field} for entity ${entity}`);
    }
    return resolved;
}

/**
 * Type-safe batch operations
 */
export function createBatchOperations<TEntity extends EntityKeys>(entityKey: TEntity) {
    return {
        resolveFields(fieldVariants: string[]): Record<string, StringFieldKey<TEntity>> {
            return batchResolveFields(entityKey, fieldVariants);
        },

        convertTypes(
            fields: Record<string, unknown>,
            trace: string[] = ['unknownCaller']
        ): Record<string, unknown> {
            try {
                return Object.fromEntries(
                    Object.entries(fields).map(([field, value]) => [
                        field,
                        convertType(
                            value,
                            entityKey,
                            field as EntityFieldKeys<TEntity>,
                            trace
                        )
                    ])
                );
            } catch (error) {
                schemaLogger.logResolution({
                    resolutionType: 'field',
                    original: JSON.stringify(fields),
                    resolved: '',
                    message: `Batch conversion failed: ${error}`,
                    level: 'error',
                    trace
                });
                return fields;
            }
        }
    };
}

/**
 * Get frontend entity name
 */
export function getFrontendEntityName(
    entityName: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): string {
    trace = [...trace, 'getFrontendEntityName'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return entityName;

    for (const [key, schema] of Object.entries(globalCache.schema)) {
        if (Object.values(schema.entityNameFormats).includes(entityName)) {
            return schema.entityNameFormats.frontend;
        }
    }

    return entityName;
}

/**
 * Get entity name by format
 */
export function getEntityNameByFormat(
    entityName: AllEntityNameVariations,
    format: NameFormat,
    trace: string[] = ['unknownCaller']
): string {
    trace = [...trace, 'getEntityNameByFormat'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return entityName;

    for (const [key, schema] of Object.entries(globalCache.schema)) {
        if (schema.entityNameFormats[format] === entityName) {
            return key;
        }
    }

    return entityName;
}

/**
 * Get complete entity information
 */
export function getEntity<TEntity extends EntityKeys>(
    entityName: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): AutomationEntity<TEntity> | null {
    trace = [...trace, 'getEntity'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const entityKey = getEntityKey(entityName, trace);
    return globalCache.schema[entityKey] as AutomationEntity<TEntity> || null;
}

/**
 * Retrieves complete field information from the cached schema.
 */
/**
 * Get field information
 */
export function getField<TEntity extends EntityKeys>(
    entityName: AllEntityNameVariations,
    fieldName: string,
    trace: string[] = ['unknownCaller']
): EntityField<TEntity, EntityFieldKeys<TEntity>> | null {
    trace = [...trace, 'getField'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const entityKey = getEntityKey(entityName, trace);
    const entity = globalCache.schema[entityKey];
    if (!entity) return null;

    const fieldKey = getFieldKey(entityKey, fieldName, trace);
    return entity.entityFields[fieldKey] as EntityField<TEntity, EntityFieldKeys<TEntity>> || null;
}

/**
 * Get entity relationships
 */
// export function getEntityRelationships<TEntity extends EntityKeys>(
//     entityName: AllEntityNameVariations,
//     trace: string[] = ['unknownCaller']
// ): AutomationEntity<TEntity>['relationships'] | null {
//     trace = [...trace, 'getEntityRelationships'];
//
//     const globalCache = getGlobalCache(trace);
//     if (!globalCache) return null;
//
//     const entityKey = getEntityKey(entityName, trace);
//     const entity = globalCache.schema[entityKey];
//     if (!entity) return null;
//
//     return entity.relationships;
// }

/**
 * Check if field exists
 */
export function fieldExists(
    entityName: AllEntityNameVariations,
    fieldName: string,
    trace: string[] = ['unknownCaller']
): boolean {
    trace = [...trace, 'fieldExists'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return false;

    const entityKey = getEntityKey(entityName, trace);
    const entity = globalCache.schema[entityKey];
    if (!entity) return false;

    const fieldKey = getFieldKey(entityKey, fieldName, trace);
    return !!entity.entityFields[fieldKey];
}

/**
 * Check if entity exists
 */
export function entityExists(
    entityName: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): boolean {
    trace = [...trace, 'entityExists'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return false;

    const entityKey = getEntityKey(entityName, trace);
    return !!globalCache.schema[entityKey];
}

/**
 * Get primary key fields
 */
export function getPrimaryKeys<TEntity extends EntityKeys>(
    entityName: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): EntityFieldKeys<TEntity>[] {
    trace = [...trace, 'getPrimaryKeys'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const entityKey = getEntityKey(entityName, trace);
    const entity = globalCache.schema[entityKey];
    if (!entity) return [];

    return Object.entries(entity.entityFields)
        .filter(([_, field]) => field.isPrimaryKey)
        .map(([fieldName]) => fieldName as EntityFieldKeys<TEntity>);
}

/**
 * Get display fields
 */
export function getDisplayFields<TEntity extends EntityKeys>(
    entityName: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): EntityFieldKeys<TEntity>[] {
    trace = [...trace, 'getDisplayFields'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const entityKey = getEntityKey(entityName, trace);
    const entity = globalCache.schema[entityKey];
    if (!entity) return [];

    return Object.entries(entity.entityFields)
        .filter(([_, field]) => field.isDisplayField)
        .map(([fieldName]) => fieldName as EntityFieldKeys<TEntity>);
}


export function removeEmptyFields(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => {
            if (value === null || value === undefined || value === '' || (typeof value === 'object' && Object.keys(value).length === 0)) {
                return false; // Drop null, undefined, empty strings, and empty objects
            }
            if (Array.isArray(value)) {
                return value.length > 0; // Keep non-empty arrays
            }
            return true; // Keep other types (strings, numbers, non-empty objects, etc.)
        })
    );
}

// Utility function to handle relationships based on schema structure
function handleRelationshipField(
    fieldName: string,
    value: any,
    structureType: string,
    entityName: string,
    fieldSchema: any,
    trace: string[] = ['unknownCaller']
) {
    const relatedTable = fieldSchema.databaseTable; // Ensure we use the correct schema path

    if (structureType === 'foreignKey') {
        if (typeof value === 'string' || typeof value === 'number') {
            // Simple scalar value, treat it as a regular FK reference
            return {
                type: 'fk',
                data: {[fieldName]: value},
                appData: {[`${fieldName}Fk`]: value}, // App-specific field
                table: relatedTable
            };
        } else if (typeof value === 'object' && value.id) {
            // It's an object with an ID field
            return {
                type: 'fk',
                data: {[fieldName]: value.id},
                appData: {[`${fieldName}Object`]: value},
                table: relatedTable
            };
        } else {
            throw new Error(`Invalid value for foreign key field: ${fieldName}`);
        }
    } else if (structureType === 'inverseForeignKey') {
        return {
            type: 'ifk',
            table: relatedTable,
            data: value,
            related_column: `${fieldName}_id`
        };
    }

    throw new Error(`Unsupported structure type: ${structureType}`);
}

/**
 * Process data for database insertion with relationship handling
 */
export function processDataForInsert<TEntity extends EntityKeys>(
    entityNameVariant: AllEntityNameVariations,
    frontendData: Partial<EntityRecord<TEntity, 'frontend'>>,
    trace: string[] = ['unknownCaller']
): {
    callMethod: 'simple' | 'fk' | 'ifk' | 'fkAndIfk';
    processedData: Record<string, unknown>;
} {
    trace = [...trace, 'processDataForInsert'];

    try {
        // Resolve entity key and get schema
        const entityKey = resolveEntityKey(entityNameVariant) as TEntity;
        const entitySchema = getEntitySchema(entityKey, 'database', trace);

        if (!entitySchema) {
            schemaLogger.logResolution({
                resolutionType: 'entity',
                original: entityNameVariant,
                resolved: '',
                message: `No schema found for entity: ${entityNameVariant}`,
                level: 'warn',
                trace
            });
            return {
                callMethod: 'simple',
                processedData: frontendData as Record<string, unknown>
            };
        }

        // Convert frontend data to database format
        const dbData = convertEntityAndFieldsInObject<TEntity>(
            removeEmptyFields(frontendData),
            entityKey,
            trace
        );

        const result: Record<string, unknown> = {};
        const relatedTables: Array<{
            table: string;
            data: Record<string, unknown>;
            related_column: string;
        }> = [];

        let hasForeignKey = false;
        let hasInverseForeignKey = false;

        // Process each field
        for (const fieldKey in entitySchema.entityFields) {
            const field = entitySchema.entityFields[fieldKey as EntityFieldKeys<TEntity>];
            const dbFieldName = getFieldNameInFormat(
                entityKey,
                fieldKey as EntityFieldKeys<TEntity>,
                'database'
            );

            if (dbFieldName in dbData) {
                const value = dbData[dbFieldName];

                if (field.structure === 'single') {
                    result[dbFieldName] = convertType(
                        entityKey,
                        fieldKey as EntityFieldKeys<TEntity>,
                        value,
                        trace
                    );
                } else if (
                    field.structure === 'foreignKey' ||
                    field.structure === 'inverseForeignKey'
                ) {
                    const relationship = handleRelationshipField(
                        dbFieldName,
                        value,
                        field.structure,
                        entityKey,
                        field,
                        trace
                    );

                    if (relationship.type === 'fk') {
                        hasForeignKey = true;
                        Object.assign(result, relationship.data);
                        Object.assign(result, relationship.appData);
                    } else if (relationship.type === 'ifk') {
                        hasInverseForeignKey = true;
                        relatedTables.push({
                            table: relationship.table,
                            data: relationship.data,
                            related_column: relationship.related_column
                        });
                    }
                } else {
                    schemaLogger.logResolution({
                        resolutionType: 'field',
                        original: field.structure,
                        resolved: '',
                        message: `Unknown structure type for field ${fieldKey}`,
                        level: 'warn',
                        trace
                    });
                }
            }
        }

        // Determine call method based on relationship types
        const callMethod = !hasForeignKey && !hasInverseForeignKey
                           ? 'simple'
                           : hasForeignKey && !hasInverseForeignKey
                             ? 'fk'
                             : !hasForeignKey && hasInverseForeignKey
                               ? 'ifk'
                               : 'fkAndIfk';

        if (relatedTables.length > 0) {
            result.relatedTables = relatedTables;
        }

        return {
            callMethod,
            processedData: result
        };

    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'entity',
            original: entityNameVariant,
            resolved: '',
            message: `Error processing data for insert: ${error}`,
            level: 'error',
            trace
        });

        return {
            callMethod: 'simple',
            processedData: frontendData as Record<string, unknown>
        };
    }
}

export async function getRelationships(
    entityName: AllEntityNameVariations,
    format: DataFormat = 'frontend',
    trace: string[] = ['unknownCaller']
): Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null> {
    trace = [...trace, 'getRelationships'];

    const entityKey = resolveEntityKey(entityName);
    const schema = getEntitySchema(entityKey, format, trace);
    if (!schema) {
        console.error(`Schema not found for table: ${entityName}`);
        return null;
    }

    let hasForeignKey = false;
    let hasInverseForeignKey = false;

    for (const field of Object.values(schema.entityFields)) {
        const structure = field.structure;

        if (structure === 'foreignKey') {
            hasForeignKey = true;
        } else if (structure === 'inverseForeignKey') {
            hasInverseForeignKey = true;
        }

        if (hasForeignKey && hasInverseForeignKey) {
            console.log(`Both foreignKey and inverseForeignKey found for table: ${entityName}. Returning 'fkAndIfk'.`);
            return 'fkAndIfk';
        }
    }

    if (hasForeignKey) {
        console.log(`Only foreignKey found for table: ${entityName}. Returning 'fk'.`);
        return 'fk';
    }

    if (hasInverseForeignKey) {
        console.log(`Only inverseForeignKey found for table: ${entityName}. Returning 'ifk'.`);
        return 'ifk';
    }

    console.log(`No foreignKey or inverseForeignKey found for table: ${entityName}. Returning 'simple'.`);
    return 'simple';
}

/**
 * Get list of all entity names in specified format
 */
export function getEntityListInFormat(
    format: keyof EntityNameFormats<EntityKeys> = 'database',
    trace: string[] = ['unknownCaller']
): Array<string> {
    trace = [...trace, 'getRegisteredSchemaNames'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    return Object.keys(globalCache.schema).map(entityKey => {
        const entity = globalCache.schema[entityKey];
        return getEntityNameInFormat(entityKey as EntityKeys, format);
    });
}

function getEntityNameInFormat<
    TEntity extends EntityKeys,
    TFormat extends keyof EntityNameFormats<TEntity>
>(
    entityKey: TEntity,
    format: TFormat,
    trace: string[] = ['unknownCaller']
): EntityNameFormat<TEntity, TFormat> {
    trace = [...trace, 'getEntityNameInFormat'];

    if (!globalCache) {
        throw new Error('Schema system not initialized');
    }

    const entity = globalCache.schema[entityKey];
    if (!entity) {
        throw new Error(`Entity not found: ${entityKey}`);
    }

    const formattedName = entity.entityNameFormats[format];
    if (!formattedName) {
        throw new Error(`Format ${String(format)} not found for entity ${entityKey}`);
    }

    return formattedName as EntityNameFormat<TEntity, TFormat>;
}

/**
 * Get field name in specific format
 */
function getFieldNameInFormat<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>,
    TFormat extends keyof FieldNameFormats<TEntity, TField>
>(
    entityKey: TEntity,
    fieldKey: TField,
    format: TFormat,
    trace: string[] = ['unknownCaller']
): FieldNameFormat<TEntity, TField, TFormat> {
    trace = [...trace, 'getFieldNameInFormat'];

    if (!globalCache) {
        throw new Error('Schema system not initialized');
    }

    const entity = globalCache.schema[entityKey];
    if (!entity) {
        throw new Error(`Entity not found: ${entityKey}`);
    }

    const field = entity.entityFields[fieldKey];
    if (!field) {
        throw new Error(`Field ${fieldKey} not found in entity ${entityKey}`);
    }

    const formattedName = field.fieldNameFormats[format];
    if (!formattedName) {
        throw new Error(`Format ${String(format)} not found for field ${fieldKey} in entity ${entityKey}`);
    }

    return formattedName as FieldNameFormat<TEntity, TField, TFormat>;
}

/**
 * Get list of all field names for an entity in specified format
 */
export function getEntityFieldListInFormat<TEntity extends EntityKeys>(
    entityName: AllEntityNameVariations,
    format: keyof FieldNameFormats<TEntity, EntityFieldKeys<TEntity>> = 'database',
    trace: string[] = ['unknownCaller']
): Array<string> {
    trace = [...trace, 'getEntityFieldListInFormat'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const entityKey = resolveEntityKey(entityName);
    const entity = globalCache.schema[entityKey];
    if (!entity) return [];

    return Object.keys(entity.entityFields).map(fieldKey =>
        getFieldNameInFormat(
            entityKey,
            fieldKey as EntityFieldKeys<TEntity>,
            format
        )
    );
}


export function logSchemaCacheReport(globalCache: UnifiedSchemaCache) {
    // Flags to control the output sections
    const showEntities = false;
    const showFields = false;
    const showExample = false;
    const showSummary = true;

    // Flags for sample prints of specific parts of the schema
    const showEntityNamesSample = false;
    const showEntitiesSample = false;
    const showFieldsSample = false;
    const showFieldsByEntitySample = false;
    const showEntityNameToCanonicalSample = false;
    const showFieldNameToCanonicalSample = false;
    const showEntityNameFormatsSample = false;
    const showFieldNameFormatsSample = false;
    const showEntityNameToDatabaseSample = false;
    const showEntityNameToBackendSample = false;
    const showFieldNameToDatabaseSample = false;
    const showFieldNameToBackendSample = false;

    if (!globalCache) {
        console.warn('Global cache not initialized. Cannot generate schema report.');
        return;
    }

    console.log('\n=== Schema Cache Report ===\n');

    // Example schema entry for 'registeredFunction'
    if (showExample) {
        const exampleEntity = globalCache.schema['registeredFunction'];
        if (exampleEntity) {
            console.log('\n=== Example Entity Detail: registeredFunction ===');
            console.log(JSON.stringify(exampleEntity, null, 2));
        } else {
            console.log('\nNo entry found for entity: registeredFunction');
        }
    }

    // Print entities and their fields
    if (showEntities || showFields) {
        console.log('Entities and Fields:');
        Object.entries(globalCache.schema).forEach(([entityName, entity]) => {
            if (showEntities) {
                console.log(`\n${entity.entityNameFormats.pretty} [${entityName}]`);
            }

            if (showFields && entity.entityFields) {
                const fieldNames = Object.keys(entity.entityFields);
                if (fieldNames.length > 0) {
                    const prettyFieldNames = fieldNames.map(fieldName => {
                        const field = entity.entityFields[fieldName];
                        return `   - ${field.fieldNameFormats.pretty} [${fieldName}]`;
                    });
                    prettyFieldNames.forEach(prettyFieldName => console.log(prettyFieldName));
                } else {
                    console.log('   No fields available');
                }
            }
        });
    }

    // Sample prints for each part of the schema
    if (showEntityNamesSample) {
        console.log('\nSample Entity Names:', JSON.stringify(globalCache.entityNames.slice(0, 5), null, 2));
    }
    if (showEntitiesSample) {
        console.log('\nSample Entities:', JSON.stringify(Object.keys(globalCache.entities).slice(0, 5), null, 2));
    }
    if (showFieldsSample) {
        console.log('\nSample Fields:', JSON.stringify(Object.keys(globalCache.fields).slice(0, 5), null, 2));
    }
    if (showFieldsByEntitySample) {
        console.log('\nSample Fields by Entity:', JSON.stringify(Object.keys(globalCache.fieldsByEntity).slice(0, 5), null, 2));
    }
    if (showEntityNameToCanonicalSample) {
        console.log('\nSample Entity Name to Canonical Mapping:', JSON.stringify(Object.entries(globalCache.entityNameToCanonical).slice(0, 5), null, 2));
    }
    if (showFieldNameToCanonicalSample) {
        console.log('\nSample Field Name to Canonical Mapping:', JSON.stringify(Object.entries(globalCache.fieldNameToCanonical).slice(0, 5), null, 2));
    }
    if (showEntityNameFormatsSample) {
        console.log('\nSample Entity Name Formats:', JSON.stringify(Object.entries(globalCache.entityNameFormats).slice(0, 5), null, 2));
    }
    if (showFieldNameFormatsSample) {
        console.log('\nSample Field Name Formats:', JSON.stringify(Object.entries(globalCache.fieldNameFormats).slice(0, 5), null, 2));
    }
    if (showEntityNameToDatabaseSample) {
        console.log('\nSample Entity Name to Database Mapping:', JSON.stringify(Object.entries(globalCache.entityNameToDatabase).slice(0, 5), null, 2));
    }
    if (showEntityNameToBackendSample) {
        console.log('\nSample Entity Name to Backend Mapping:', JSON.stringify(Object.entries(globalCache.entityNameToBackend).slice(0, 5), null, 2));
    }
    if (showFieldNameToDatabaseSample) {
        console.log('\nSample Field Name to Database Mapping:', JSON.stringify(Object.entries(globalCache.fieldNameToDatabase).slice(0, 5), null, 2));
    }
    if (showFieldNameToBackendSample) {
        console.log('\nSample Field Name to Backend Mapping:', JSON.stringify(Object.entries(globalCache.fieldNameToBackend).slice(0, 5), null, 2));
    }

    // console.log('\nComplete entityNames:', JSON.stringify(globalCache.entityNames, null, 2));
    // console.log('\nComplete entities:', JSON.stringify(globalCache.entities, null, 2));
    // console.log('\nComplete fields:', JSON.stringify(globalCache.fields, null, 2));
    // console.log('\nComplete fieldsByEntity:', JSON.stringify(globalCache.fieldsByEntity, null, 2));
    // console.log('\nComplete entityNameToCanonical:', JSON.stringify(globalCache.entityNameToCanonical, null, 2));
    // console.log('\nComplete fieldNameToCanonical:', JSON.stringify(globalCache.fieldNameToCanonical, null, 2));

    // logSchemaCacheReportFile(globalCache);

    if (showSummary) {
        console.log();
        console.log(`Total Schema Entries: ${Object.keys(globalCache.schema).length}`);
        console.log(`Total Entity Names: ${globalCache.entityNames.length}`);
        console.log(`Total Entities: ${Object.keys(globalCache.entities).length}`);
        console.log(`Total Fields: ${Object.keys(globalCache.fields).length}\n`);
    }
}

import fs from 'fs';

export function logSchemaCacheReportFile(globalCache: UnifiedSchemaCache) {
    // Enable all output sections
    const showEntities = true;
    const showFields = true;
    const showExample = true;
    const showSummary = true;

    // Enable all sample prints for each part of the schema
    const showEntityNamesSample = true;
    const showEntitiesSample = true;
    const showFieldsSample = true;
    const showFieldsByEntitySample = true;
    const showEntityNameToCanonicalSample = true;
    const showFieldNameToCanonicalSample = true;
    const showEntityNameFormatsSample = true;
    const showFieldNameFormatsSample = true;
    const showEntityNameToDatabaseSample = true;
    const showEntityNameToBackendSample = true;
    const showFieldNameToDatabaseSample = true;
    const showFieldNameToBackendSample = true;

    if (!globalCache) {
        console.warn('Global cache not initialized. Cannot generate schema report.');
        return;
    }

    let report = '\n=== Schema Cache Report ===\n';

    // Example schema entry for 'registeredFunction'
    if (showExample) {
        const exampleEntity = globalCache.schema['registeredFunction'];
        if (exampleEntity) {
            report += '\n=== Example Entity Detail: registeredFunction ===\n';
            report += JSON.stringify(exampleEntity, null, 2) + '\n';
        } else {
            report += '\nNo entry found for entity: registeredFunction\n';
        }
    }

    // Print entities and their fields
    if (showEntities || showFields) {
        report += 'Entities and Fields:\n';
        Object.entries(globalCache.schema).forEach(([entityName, entity]) => {
            if (showEntities) {
                report += `\n${entity.entityNameFormats.pretty} [${entityName}]\n`;
            }

            if (showFields && entity.entityFields) {
                const fieldNames = Object.keys(entity.entityFields);
                if (fieldNames.length > 0) {
                    const prettyFieldNames = fieldNames.map(fieldName => {
                        const field = entity.entityFields[fieldName];
                        return `   - ${field.fieldNameFormats.pretty} [${fieldName}]\n`;
                    });
                    prettyFieldNames.forEach(prettyFieldName => (report += prettyFieldName));
                } else {
                    report += '   No fields available\n';
                }
            }
        });
    }

    if (showEntityNamesSample) {
        report += '\nSample Entity Names:\n' + JSON.stringify(globalCache.entityNames.slice(0, 5), null, 2) + '\n';
    }

    if (showEntitiesSample) {
        const firstEntityKey = Object.keys(globalCache.entities)[0];
        const firstEntityValue = globalCache.entities[firstEntityKey];
        report += '\nSample Entity (Detailed):\n' + JSON.stringify({ [firstEntityKey]: firstEntityValue }, null, 2) + '\n';
    }

    if (showFieldsSample) {
        const firstFieldKey = Object.keys(globalCache.fields)[0];
        const firstFieldValue = globalCache.fields[firstFieldKey];
        report += '\nSample Field (Detailed):\n' + JSON.stringify({ [firstFieldKey]: firstFieldValue }, null, 2) + '\n';
    }

    if (showFieldsByEntitySample) {
        const firstFieldsByEntityKey = Object.keys(globalCache.fieldsByEntity)[0];
        const firstFieldsByEntityValue = globalCache.fieldsByEntity[firstFieldsByEntityKey];
        report += '\nSample Fields by Entity (Detailed):\n' + JSON.stringify({ [firstFieldsByEntityKey]: firstFieldsByEntityValue }, null, 2) + '\n';
    }

    if (showEntityNameToCanonicalSample) {
        const firstEntityNameToCanonical = Object.entries(globalCache.entityNameToCanonical)[0];
        report += '\nSample Entity Name to Canonical Mapping (Detailed):\n' + JSON.stringify({ [firstEntityNameToCanonical[0]]: firstEntityNameToCanonical[1] }, null, 2) + '\n';
    }

    if (showFieldNameToCanonicalSample) {
        const firstFieldNameToCanonical = Object.entries(globalCache.fieldNameToCanonical)[0];
        report += '\nSample Field Name to Canonical Mapping (Detailed):\n' + JSON.stringify({ [firstFieldNameToCanonical[0]]: firstFieldNameToCanonical[1] }, null, 2) + '\n';
    }

    if (showEntityNameFormatsSample) {
        const firstEntityNameFormat = Object.entries(globalCache.entityNameFormats)[0];
        report += '\nSample Entity Name Formats (Detailed):\n' + JSON.stringify({ [firstEntityNameFormat[0]]: firstEntityNameFormat[1] }, null, 2) + '\n';
    }

    if (showFieldNameFormatsSample) {
        const firstFieldNameFormat = Object.entries(globalCache.fieldNameFormats)[0];
        report += '\nSample Field Name Formats (Detailed):\n' + JSON.stringify({ [firstFieldNameFormat[0]]: firstFieldNameFormat[1] }, null, 2) + '\n';
    }

    if (showEntityNameToDatabaseSample) {
        const firstEntityNameToDatabase = Object.entries(globalCache.entityNameToDatabase)[0];
        report += '\nSample Entity Name to Database Mapping (Detailed):\n' + JSON.stringify({ [firstEntityNameToDatabase[0]]: firstEntityNameToDatabase[1] }, null, 2) + '\n';
    }

    if (showEntityNameToBackendSample) {
        const firstEntityNameToBackend = Object.entries(globalCache.entityNameToBackend)[0];
        report += '\nSample Entity Name to Backend Mapping (Detailed):\n' + JSON.stringify({ [firstEntityNameToBackend[0]]: firstEntityNameToBackend[1] }, null, 2) + '\n';
    }

    if (showFieldNameToDatabaseSample) {
        const firstFieldNameToDatabase = Object.entries(globalCache.fieldNameToDatabase)[0];
        report += '\nSample Field Name to Database Mapping (Detailed):\n' + JSON.stringify({ [firstFieldNameToDatabase[0]]: firstFieldNameToDatabase[1] }, null, 2) + '\n';
    }

    if (showFieldNameToBackendSample) {
        const firstFieldNameToBackend = Object.entries(globalCache.fieldNameToBackend)[0];
        report += '\nSample Field Name to Backend Mapping (Detailed):\n' + JSON.stringify({ [firstFieldNameToBackend[0]]: firstFieldNameToBackend[1] }, null, 2) + '\n';
    }

    // Full detailed outputs
    report += '\nComplete entityNames:\n' + JSON.stringify(globalCache.entityNames, null, 2) + '\n';
    report += '\nComplete entities:\n' + JSON.stringify(globalCache.entities, null, 2) + '\n';
    report += '\nComplete fields:\n' + JSON.stringify(globalCache.fields, null, 2) + '\n';
    report += '\nComplete fieldsByEntity:\n' + JSON.stringify(globalCache.fieldsByEntity, null, 2) + '\n';
    report += '\nComplete entityNameToCanonical:\n' + JSON.stringify(globalCache.entityNameToCanonical, null, 2) + '\n';
    report += '\nComplete fieldNameToCanonical:\n' + JSON.stringify(globalCache.fieldNameToCanonical, null, 2) + '\n';
    report += '\nComplete entityNameFormats:\n' + JSON.stringify(globalCache.entityNameFormats, null, 2) + '\n';
    report += '\nComplete fieldNameFormats:\n' + JSON.stringify(globalCache.fieldNameFormats, null, 2) + '\n';
    report += '\nComplete entityNameToDatabase:\n' + JSON.stringify(globalCache.entityNameToDatabase, null, 2) + '\n';
    report += '\nComplete entityNameToBackend:\n' + JSON.stringify(globalCache.entityNameToBackend, null, 2) + '\n';
    report += '\nComplete fieldNameToDatabase:\n' + JSON.stringify(globalCache.fieldNameToDatabase, null, 2) + '\n';
    report += '\nComplete fieldNameToBackend:\n' + JSON.stringify(globalCache.fieldNameToBackend, null, 2) + '\n';

    if (showSummary) {
        report += `\nTotal Schema Entries: ${Object.keys(globalCache.schema).length}\n`;
        report += `Total Entity Names: ${globalCache.entityNames.length}\n`;
        report += `Total Entities: ${Object.keys(globalCache.entities).length}\n`;
        report += `Total Fields: ${Object.keys(globalCache.fields).length}\n`;
    }

    fs.writeFileSync('schema_cache_report.txt', report);
    console.log('Schema cache report saved to schema_cache_report.txt');
}

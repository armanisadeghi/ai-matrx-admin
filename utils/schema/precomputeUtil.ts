import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";

import {schemaLogger} from '@/lib/logger/schema-logger';
import {
    AllEntityNameVariations, AllFieldNameVariations,
    AutomationEntities,
    AutomationEntity,
    AutomationSchema,
    DataFormat,
    EntityField, EntityFieldKeys,
    EntityKeys, EntityNameFormats, FieldNameFormats,
    UnifiedSchemaCache
} from "@/types/entityTypes";
import {
    entityNameFormats,
    entityNameToCanonical,
    fieldNameFormats,
    fieldNameToCanonical
} from "@/utils/schema/lookupSchema";


/**
 * Initializes and processes the schema for client-side use
 */
function initializeAutomationSchema<TEntity extends EntityKeys>(
    initialSchema: AutomationSchema
): AutomationEntities {
    const processedSchema = {} as AutomationEntities;

    for (const [entityKey, entity] of Object.entries(initialSchema) as [EntityKeys, AutomationSchema[EntityKeys]][]) {
        const entityNameFormats: Record<DataFormat, string> = {} as Record<DataFormat, string>;

        Object.keys(entity.entityNameVariations).forEach((formatKey) => {
            const format = formatKey as DataFormat;
            if (entity.entityNameVariations[format]) {
                entityNameFormats[format] = entity.entityNameVariations[format] || entityKey;
            }
        });

        const processedFields: Record<string, EntityField<any, any>> = {};

        for (const [fieldKey, field] of Object.entries(entity.entityFields)) {
            const fieldNameFormats: Record<DataFormat, string> = {} as Record<DataFormat, string>;

            Object.keys(field.fieldNameVariations).forEach((formatKey) => {
                const format = formatKey as DataFormat;
                if (field.fieldNameVariations[format]) {
                    fieldNameFormats[format] = field.fieldNameVariations[format] || fieldKey;
                }
            });

            let enumValues: string[] | null = null;
            const {typeReference} = field;

            if (typeof typeReference === 'object' && Object.keys(typeReference).length > 0) {
                enumValues = Object.keys(typeReference).filter(key => key !== '_typeBrand');
            }

            processedFields[fieldKey] = {
                ...field,
                fieldNameFormats,
                enumValues,
                value: field.value,
                dataType: field.dataType,
                isArray: field.isArray,
                structure: field.structure,
                isNative: field.isNative,
                typeReference: field.typeReference,
                defaultComponent: field.defaultComponent,
                componentProps: field.componentProps,
                isRequired: field.isRequired,
                maxLength: field.maxLength,
                defaultValue: field.defaultValue,
                isPrimaryKey: field.isPrimaryKey,
                isDisplayField: field.isDisplayField,
                defaultGeneratorFunction: field.defaultGeneratorFunction,
                validationFunctions: field.validationFunctions,
                exclusionRules: field.exclusionRules,
                databaseTable: field.databaseTable
            };
        }

        processedSchema[entityKey as TEntity] = {
            schemaType: entity.schemaType,
            defaultFetchStrategy: entity.defaultFetchStrategy,
            componentProps: entity.componentProps,
            entityNameFormats,
            relationships: entity.relationships,
            entityFields: processedFields
        } as AutomationEntity<TEntity>;
    }

    return processedSchema;
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

export function initializeSchemaSystem(trace: string[] = ['unknownCaller']): UnifiedSchemaCache {
    trace = [...trace, 'initializeSchemaSystem'];

    if (globalCache) {
        console.log('Reusing existing global cache instance');
        return globalCache;
    }

    const processedSchema = initializeAutomationSchema(initialAutomationTableSchema);

    if (!isInitializedSchema(processedSchema)) {
        throw new Error('Schema initialization failed: invalid schema structure');
    }

    try {
        const cache: UnifiedSchemaCache = {
            schema: processedSchema,
            entityNameToCanonical: {...entityNameToCanonical},
            fieldNameToCanonical: {...fieldNameToCanonical},
            entityNameFormats: deepCopy(entityNameFormats),
            fieldNameFormats: deepCopy(fieldNameFormats)
        };

        globalCache = cache;

        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'globalCache',
            message: 'Schema system initialized successfully',
            level: 'info',
            trace
        });

        return cache;
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
 * Check if name is a known entity variant
 */
export function isKnownEntityVariant(
    name: UnknownNameString
): name is AllEntityNameVariations {
    if (!globalCache) return false;
    return globalCache.entityNameMap.has(name.toLowerCase());
}

export type NestedObject = { [key: string]: any };

/**
 * Check if value is a known field variant for an entity
 */
export function isKnownFieldVariant<TEntity extends EntityKeys>(
    entityKey: TEntity,
    value: unknown
): value is FieldNameVariant<TEntity> {
    if (typeof value !== 'string') return false;
    const fieldMap = globalCache?.fieldNameMap.get(entityKey);
    return fieldMap?.has(value.toLowerCase()) ?? false;
}

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
export function convertEntityAndFieldsInObject(
    inputObject: unknown,
    entityNameVariant: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): unknown {
    trace = [...trace, 'convertEntityAndFieldsInObject'];

    const entityKey = getEntityKey(entityNameVariant, trace);

    if (typeof inputObject !== 'object' || inputObject === null) {
        return inputObject;
    }

    const result: Record<string, unknown> = Array.isArray(inputObject) ? [] : {};

    for (const key in inputObject) {
        if (Object.prototype.hasOwnProperty.call(inputObject, key)) {
            const fieldKey = getFieldKey(entityKey, key, trace);
            result[fieldKey] = convertFieldsInNestedObject(
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
): unknown {
    trace = [...trace, 'convertFieldsInNestedObject'];

    if (typeof inputObject !== 'object' || inputObject === null) {
        return inputObject;
    }

    if (Array.isArray(inputObject)) {
        return inputObject.map(item =>
            convertFieldsInNestedObject(item, entityKey, trace)
        );
    }

    const result: Record<string, unknown> = {};

    for (const key in inputObject) {
        if (Object.prototype.hasOwnProperty.call(inputObject, key)) {
            const fieldKey = getFieldKey(entityKey, key as UnknownNameString, trace);
            result[fieldKey] = convertFieldsInNestedObject(
                (inputObject as Record<string, unknown>)[key],
                entityKey,
                trace
            );
        }
    }

    return result;
}

// =================================================================================================


// ----------------------------
/**
 * Gets the standardized key for any entity name variant
 */
export function resolveEntityKey(entityNameVariant: AllEntityNameVariations): EntityKeys {
    if (!globalCache) throw new Error('Schema system not initialized');
    return globalCache.entityNameToCanonical[entityNameVariant] || entityNameVariant;
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
export function getFieldName(
    entityNameVariant: AllEntityNameVariations,
    fieldNameVariant: string,
    format: keyof FieldNameFormats<EntityKeys, any> = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const entityKey = resolveEntityKey(entityNameVariant);
    const fieldKey = resolveFieldKey(entityKey, fieldNameVariant);

    return globalCache.fieldNameFormats[entityKey]?.[fieldKey]?.[format] || fieldNameVariant;
}


/**
 * Strictly typed field name resolution
 */
export function getFieldNameStrict<
    TEntity extends EntityKeys,
    TField extends EntityFieldKeys<TEntity>
>(
    entityNameVariant: AllEntityNameVariations | TEntity,
    fieldNameVariant: string,
    format: keyof FieldNameFormats<TEntity, TField> = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const entityKey = resolveEntityKey(entityNameVariant) as TEntity;
    const fieldKey = resolveFieldKey(entityKey, fieldNameVariant) as TField;

    return globalCache.fieldNameFormats[entityKey]?.[fieldKey]?.[format] || fieldNameVariant;
}

``

// Helper function to safely access field name mappings
export function getFieldNameMapping<T extends AutomationTableName>(
    table: T,
    field: StringFieldKey<T>,
    format: keyof EntityNameMappings = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const fieldInfo = globalCache.schema[table]?.entityFields[field];
    return fieldInfo?.fieldNameMappings[format] || field;
}

// Type guard to check if a table exists in the schema
export function isValidTable(
    tableKey: string
): tableKey is AutomationTableName {
    return tableKey in (globalCache?.schema ?? {});
}

// Safe wrapper around resolveTableKey
export function resolveTableKeyStrict(
    entityNameVariant: AllEntityNameVariations
): AutomationTableName {
    const resolved = resolveTableKey(entityNameVariant);
    if (!isValidTable(resolved)) {
        throw new Error(`Invalid table name: ${entityNameVariant}`);
    }
    return resolved;
}


export function getSchema(
    entityName: string,
    responseFormat?: keyof AutomationTable['entityNameMappings'],
    trace: string[] = ['unknownCaller']
): AutomationTable | null {
    trace = [...trace, 'getSchema'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const tableKey = getEntityKey(entityName, trace);
    const table = globalCache.schema[tableKey];
    if (!table) return null;

    if (!responseFormat) {
        return table;
    }

    const rekeyedTable: AutomationTable = {
        ...table,
        entityNameMappings: {
            ...table.entityNameMappings,
            [responseFormat]: table.entityNameMappings[responseFormat],
        },
        entityFields: Object.fromEntries(
            Object.entries(table.entityFields).map(([fieldKey, field]) => [
                field.fieldNameMappings[responseFormat] || fieldKey,
                field
            ])
        ),
    };

    return rekeyedTable;
}


export function convertData(
    data: any,
    responseFormat?: keyof AutomationTable['entityNameMappings'],
    trace: string[] = ['unknownCaller']
): any {
    trace = [...trace, 'convertData'];

    // If data is not an object or array, return it directly
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    // Iterate through and rekey fields
    const result: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const convertedKey = getFieldKeyFromUnknown(key, key, trace);
            result[convertedKey] = convertData(data[key], responseFormat, trace);  // Recursively convert nested data
        }
    }

    return result;
}


/**
 * Additional utility functions can be added here based on specific needs
 */

// Type conversion utilities
export function convertType<T extends AutomationTableName>(
    value: unknown,
    table: string | T,
    field: string,
    targetFormat: NameFormat
): unknown {
    if (!globalCache) throw new Error('Schema system not initialized');

    // Resolve table key with proper typing
    const tableKey = resolveTableKey(table) as T;
    const fieldKey = resolveFieldKey(tableKey, field);

    const fieldInfo = globalCache.schema[tableKey]?.entityFields[fieldKey];
    if (!fieldInfo) return value;

    return value; // Placeholder for actual implementation
}

// Batch operations for performance
export function batchResolveFields<T extends AutomationTableName>(
    tableKey: T,
    fieldVariants: string[]
): Record<string, StringFieldKey<T>> {
    if (!globalCache) throw new Error('Schema system not initialized');

    return Object.fromEntries(
        fieldVariants.map(variant => [
            variant,
            resolveFieldKey(tableKey, variant)
        ])
    ) as Record<string, StringFieldKey<T>>;
}


export function ensureTableName(table: string): AutomationTableName {
    const resolved = resolveTableKey(table);
    if (!globalCache?.schema[resolved]) {
        throw new Error(`Invalid table name: ${table}`);
    }
    return resolved as AutomationTableName;
}

// Helper function to ensure field name type safety
export function ensureFieldName<T extends AutomationTableName>(
    table: T,
    field: string
): StringFieldKey<T> {
    const resolved = resolveFieldKey(table, field);
    if (!globalCache?.schema[table]?.entityFields[resolved]) {
        throw new Error(`Invalid field name: ${field} for table ${table}`);
    }
    return resolved as StringFieldKey<T>;
}

// Type-safe batch operations
export function createBatchOperations<T extends AutomationTableName>(tableKey: T) {
    return {
        resolveFields(fieldVariants: string[]): Record<string, StringFieldKey<T>> {
            return batchResolveFields(tableKey, fieldVariants);
        },

        convertTypes(
            fields: Record<string, unknown>,
            targetFormat: NameFormat
        ): Record<string, unknown> {
            return Object.fromEntries(
                Object.entries(fields).map(([field, value]) => [
                    field,
                    convertType(value, tableKey, field, targetFormat)
                ])
            );
        }
    };
}


/**
 * Retrieves the frontend table name from a given variant using the cached schema.
 */
export function getFrontendTableName(entityName: string, trace: string[] = ['unknownCaller']): string {
    trace = [...trace, 'getFrontendTableName'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return entityName;  // Return the original name if no cache

    // Loop through the cached schema to find the matching frontend table name
    for (const [key, schema] of Object.entries(globalCache.schema)) {
        if (Object.values(schema.entityNameMappings).includes(entityName)) {
            return schema.entityNameMappings.frontend;  // Return the frontend name
        }
    }

    return entityName;  // Return original if no match is found
}

/**
 * Retrieves the table name in a specific format (e.g., frontend, backend) using the cached schema.
 */
export function getTableNameByFormat(entityName: string, nameFormat: string, trace: string[] = ['unknownCaller']): string {
    trace = [...trace, 'getTableNameByFormat'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return entityName;  // Return original if no cache available

    // Iterate through the cached schema and find the table by its nameFormat
    for (const [key, schema] of Object.entries(globalCache.schema)) {
        if (schema.entityNameMappings[nameFormat] === entityName) {
            return key;  // Return the table key (primary name)
        }
    }

    return entityName;  // Fallback to original if no match
}

/**
 * Retrieves complete table information from the cached schema.
 */
export function getTable(entityName: string, trace: string[] = ['unknownCaller']): AutomationTable | null {
    trace = [...trace, 'getTable'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;  // Return null if cache not available

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    return globalCache.schema[tableKey] || null;  // Return the table schema
}

/**
 * Retrieves complete field information from the cached schema.
 */
export function getField(
    entityName: string,
    fieldName: string,
    trace: string[] = ['unknownCaller']
): AutomationTable['entityFields'][string] | null {
    trace = [...trace, 'getField'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return null;

    const fieldKey = getFieldKey(tableKey, fieldName, trace);  // Resolve field key
    return table.entityFields[fieldKey] || null;
}

/**
 * Retrieves all relationships for a table from the cached schema.
 */
export function getTableRelationships(entityName: string, trace: string[] = ['unknownCaller']): AutomationTable['relationships'] | null {
    trace = [...trace, 'getTableRelationships'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return null;

    return table.relationships;
}

/**
 * Checks if a field exists in a table from the cached schema.
 */
export function fieldExists(entityName: string, fieldName: string, trace: string[] = ['unknownCaller']): boolean {
    trace = [...trace, 'fieldExists'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return false;

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return false;

    const fieldKey = getFieldKey(tableKey, fieldName, trace);  // Resolve field key
    return !!table.entityFields[fieldKey];
}

/**
 * Checks if a table exists in the cached schema.
 */
export function tableExists(entityName: string, trace: string[] = ['unknownCaller']): boolean {
    trace = [...trace, 'tableExists'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return false;

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    return !!globalCache.schema[tableKey];
}

/**
 * Retrieves all primary key fields for a table from the cached schema.
 */
export function getPrimaryKeys(entityName: string, trace: string[] = ['unknownCaller']): string[] {
    trace = [...trace, 'getPrimaryKeys'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return [];

    return Object.entries(table.entityFields)
        .filter(([_, field]) => field.isPrimaryKey)
        .map(([fieldName]) => fieldName);
}

/**
 * Retrieves all display fields for a table from the cached schema.
 */
export function getDisplayFields(entityName: string, trace: string[] = ['unknownCaller']): string[] {
    trace = [...trace, 'getDisplayFields'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const tableKey = getEntityKey(entityName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return [];

    return Object.entries(table.entityFields)
        .filter(([_, field]) => field.isDisplayField)
        .map(([fieldName]) => fieldName);
}

/**
 * Generates the client-side schema bundle
 */
export function generateClientSchema(): UnifiedSchemaCache {
    if (!globalCache) throw new Error('Schema system not initialized');

    return globalCache;
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

export function processDataForInsert(
    entityName: string,
    dbData: Record<string, any>,
    trace: string[] = ['unknownCaller']
) {
    trace = [...trace, 'processDataForInsert'];

    // Get schema from the cache, rekeyed for 'databaseName' format
    const schema = getSchema(entityName, 'database', trace);
    if (!schema) {
        console.warn(`No schema found for table: ${entityName}. Returning original data.`);
        return {
            callMethod: 'simple',
            processedData: dbData
        };
    }

    const cleanedData = removeEmptyFields(dbData); // Clean the input data
    let result: Record<string, any> = {};
    const relatedTables: Array<Record<string, any>> = [];
    let hasForeignKey = false;
    let hasInverseForeignKey = false;

    for (const [fieldName, fieldSchema] of Object.entries(schema.entityFields)) {
        const dbKey = fieldSchema.fieldNameMappings['database'];

        if (cleanedData.hasOwnProperty(dbKey)) {
            const value = cleanedData[dbKey];
            const structureType = fieldSchema.structure;

            if (structureType === 'single') {
                result[dbKey] = value;
            } else if (structureType === 'foreignKey' || structureType === 'inverseForeignKey') {
                const relationship = handleRelationshipField(dbKey, value, structureType, entityName, fieldSchema, trace);

                if (relationship.type === 'fk') {
                    hasForeignKey = true;
                    result = {...result, ...relationship.data}; // Add exact db field
                    result = {...result, ...relationship.appData}; // Add app-specific field
                } else if (relationship.type === 'ifk') {
                    hasInverseForeignKey = true;
                    relatedTables.push({
                        table: relationship.table,
                        data: relationship.data,
                        related_column: relationship.related_column
                    });
                }
            } else {
                console.warn(`Unknown structure type for field ${fieldName}: ${structureType}. Skipping field.`);
            }
        }
    }

    let callMethod: string;
    if (!hasForeignKey && !hasInverseForeignKey) {
        callMethod = 'simple';
    } else if (hasForeignKey && !hasInverseForeignKey) {
        callMethod = 'fk';
    } else if (!hasForeignKey && hasInverseForeignKey) {
        callMethod = 'ifk';
    } else {
        callMethod = 'fkAndIfk';
    }

    if (relatedTables.length > 0) {
        result.relatedTables = relatedTables;
    }

    return {
        callMethod,
        processedData: result
    };
}


export async function getRelationships(
    entityName: string,
    format: string = 'frontend',
    trace: string[] = ['unknownCaller']
): Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null> {
    trace = [...trace, 'getRelationships'];

    const schema = getSchema(entityName, format, trace);
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

export function getRegisteredSchemaNames(
    format: keyof AutomationTable['entityNameMappings'] = 'database',
    trace: string[] = ['unknownCaller']
): Array<string> {
    trace = [...trace, 'getRegisteredSchemaNames'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const schemaNames: Array<string> = [];

    // Iterate over each schema in the global cache and get the name in the desired format
    for (const table of Object.values(globalCache.schema)) {
        const schemaName = table.entityNameMappings[format];
        if (schemaName) {
            schemaNames.push(schemaName);
        }
    }

    return schemaNames;
}


export function logSchemaCacheReport(globalCache: UnifiedSchemaCache) {
    if (!globalCache) {
        console.warn('Global cache is not initialized. Cannot generate schema report.');
        return;
    }
    console.log('Schema Cache Status:');
    const schemaKeys = Object.keys(globalCache.schema);
    console.log('Loaded Tables Count:', schemaKeys.length);
    const tableNameMap = globalCache.tableNameMap;
    console.log('==Table Name Map==');
    console.log('Table Count:', tableNameMap.size);
    console.log('Tables in Schema:', schemaKeys.join(', '));
    const fieldNameMap = globalCache.fieldNameMap;
    const fieldNameMapKeys = Object.keys(fieldNameMap);
    const totalFieldCount = fieldNameMapKeys.reduce((acc, entityName) => acc + Object.keys(fieldNameMap[entityName]).length, 0);
    console.log('== Field Name Map ==');
    console.log('Table Count:', fieldNameMapKeys.length);
    console.log('Field Count:', totalFieldCount);
    const registeredFunctionTable = globalCache.schema['registeredFunction'];
    if (registeredFunctionTable) {
        console.log('\nExample Schema Entry for "registeredFunction" Table:');
        console.log('Schema Type:', registeredFunctionTable.schemaType);
        console.log('Entity Name Mappings:', JSON.stringify(registeredFunctionTable.entityNameMappings, null, 2));
        console.log('Entity Fields:');
        Object.entries(registeredFunctionTable.entityFields).forEach(([fieldName, fieldInfo]) => {
            console.log(`Field Name: ${fieldName}, Field Info: ${JSON.stringify(fieldInfo, null, 2)}`);
        });
        console.log('Default Fetch Strategy:', registeredFunctionTable.defaultFetchStrategy);
        console.log('Component Props:', JSON.stringify(registeredFunctionTable.componentProps, null, 2));
        console.log('Relationships:', JSON.stringify(registeredFunctionTable.relationships, null, 2));
    } else {
        console.warn('No schema found for "registeredFunction" table.');
    }
}


/*
export function initializeTableSchema(
    initialAutomationTableSchema: TableSchemaStructure
): Record<AutomationTableName, AutomationTable> {
    const schemaMapping: Record<string, AutomationTable> = {};

    for (const [entityKey, entity] of Object.entries(initialAutomationTableSchema)) {
        const entityNameMappings: Record<NameFormat, string> = {
            frontend: entity.entityNameVariations.frontend || entityKey,
            backend: entity.entityNameVariations.backend || entityKey,
            database: entity.entityNameVariations.database || entityKey,
            pretty: entity.entityNameVariations.pretty || entityKey,
            component: entity.entityNameVariations.component || entityKey,
            sqlFunctionRef: entity.entityNameVariations.sqlFunctionRef || entityKey,
            kebab: entity.entityNameVariations.kebab || entityKey,
            ...(entity.entityNameVariations.RestAPI && {RestAPI: entity.entityNameVariations.RestAPI}),
            ...(entity.entityNameVariations.GraphQL && {GraphQL: entity.entityNameVariations.GraphQL}),
            ...(entity.entityNameVariations.custom && {custom: entity.entityNameVariations.custom})
        };
        for (const [key, value] of Object.entries(entity.entityNameVariations)) {
            if (!entityNameMappings[key as NameFormat]) {
                entityNameMappings[key] = value || entityKey;
            }
        }

        const updatedFields: Record<string, any> = {};

        for (const [fieldKey, field] of Object.entries(entity.entityFields)) {
            const fieldNameMappings: Record<NameFormat | string, string> = {
                frontend: field.fieldNameVariations.frontend || fieldKey,
                backend: field.fieldNameVariations.backend || fieldKey,
                database: field.fieldNameVariations.database || fieldKey,
                pretty: field.fieldNameVariations.pretty || fieldKey,
                component: field.fieldNameVariations.component || fieldKey,
                sqlFunctionRef: field.fieldNameVariations.sqlFunctionRef || fieldKey,
                kebab: field.fieldNameVariations.kebab || fieldKey,
                ...(field.fieldNameVariations.RestAPI && {RestAPI: field.fieldNameVariations.RestAPI}),
                ...(field.fieldNameVariations.GraphQL && {GraphQL: field.fieldNameVariations.GraphQL}),
                ...(field.fieldNameVariations.custom && {custom: field.fieldNameVariations.custom})
            };

            for (const [key, value] of Object.entries(field.fieldNameVariations)) {
                if (!fieldNameMappings[key as NameFormat]) {
                    fieldNameMappings[key] = value || fieldKey;
                }
            }

            let enumValues: string[] | null = null;
            const {typeReference} = field;

            if (typeof typeReference === 'object' && Object.keys(typeReference).length > 0) {
                enumValues = (Object.keys(typeReference) as (keyof typeof typeReference)[]).filter(key => key !== '_typeBrand');
            } else {
                enumValues = null;
            }


            updatedFields[fieldKey] = {
                fieldNameMappings: fieldNameMappings,
                value: field.defaultValue,
                dataType: field.dataType,
                isArray: field.isArray,
                structure: field.structure,
                isNative: field.isNative,
                typeReference: field.typeReference,
                enumValues: enumValues,
                defaultComponent: field.defaultComponent,
                componentProps: field.componentProps,
                isRequired: field.isRequired,
                maxLength: field.maxLength,
                defaultValue: field.defaultValue,
                isPrimaryKey: field.isPrimaryKey,
                isDisplayField: field.isDisplayField,
                defaultGeneratorFunction: field.defaultGeneratorFunction,
                validationFunctions: field.validationFunctions,
                exclusionRules: field.exclusionRules,
                databaseTable: field.databaseTable
            };
            console.log('Added field:', fieldKey, updatedFields[fieldKey]);
        }

        schemaMapping[entityKey] = {
            schemaType: entity.schemaType,
            entityNameMappings: entityNameMappings,
            entityFields: updatedFields,
            defaultFetchStrategy: entity.defaultFetchStrategy,
            componentProps: entity.componentProps,
            relationships: entity.relationships
        };
        // console.log('Added schema for:', entityKey, schemaMapping[entityKey]);
    }

    return schemaMapping;
}
*/


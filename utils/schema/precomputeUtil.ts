import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";

import {schemaLogger} from '@/lib/logger/schema-logger';
import {
    AllEntityNameVariations,
    AllFieldNameVariations,
    AutomationEntities,
    AutomationEntity,
    AutomationSchema, createFormattedRecord,
    DataFormat,
    EntityField,
    EntityFieldKeys,
    EntityKeys,
    EntityNameFormat,
    EntityNameFormats,
    EntityNameVariations,
    EntityRecord,
    FieldNameFormat,
    FieldNameFormats, TypeBrand,
    UnifiedSchemaCache
} from "@/types/entityTypes";
import {
    entityNameFormats,
    entityNameToCanonical,
    fieldNameFormats,
    fieldNameToCanonical
} from "@/utils/schema/lookupSchema";
import {NameFormat} from "@/types/AutomationSchemaTypes";


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

        // @ts-ignore
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
 * Generates the client-side schema bundle
 */
export function generateClientSchema(): UnifiedSchemaCache {
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
export function getEntityRelationships<TEntity extends EntityKeys>(
    entityName: AllEntityNameVariations,
    trace: string[] = ['unknownCaller']
): AutomationEntity<TEntity>['relationships'] | null {
    trace = [...trace, 'getEntityRelationships'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const entityKey = getEntityKey(entityName, trace);
    const entity = globalCache.schema[entityKey];
    if (!entity) return null;

    return entity.relationships;
}

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
    if (!globalCache) {
        console.warn('Global cache not initialized. Cannot generate schema report.');
        return;
    }

    console.log('=== Schema Cache Status Report ===\n');

    // Schema Statistics
    const schemaKeys = Object.keys(globalCache.schema);
    console.log('Basic Schema Stats:');
    console.log(`Total Entities: ${schemaKeys.length}`);
    console.log(`Entities: \n${schemaKeys.join(', ')}\n`);

    // Entity Name Mapping Statistics
    const entityNameMappings = globalCache.entityNameToCanonical;
    const entityVariantCount = Object.keys(entityNameMappings).length;
    console.log('Entity Name Mapping Stats:');

    // Entity Format Statistics
    const entityFormats = globalCache.entityNameFormats;
    console.log('Entity Format Stats:');
    Object.entries(entityFormats).forEach(([entityKey, formats]) => {
        const fields = Object.keys(formats).join(', ');
        console.log(`${entityKey}: ${fields}`);
    });
    console.log();

    // Field Statistics
    const fieldMappings = globalCache.fieldNameToCanonical;
    console.log('Field Mapping Stats:');
    let totalFieldVariants = 0;
    let totalFields = 0;
    Object.entries(fieldMappings).forEach(([entityKey, fields]) => {
        const fieldCount = Object.keys(fields).length;
        const variantCount = Object.values(fields).length;
        totalFieldVariants += variantCount;
        totalFields += fieldCount;
        console.log(`${entityKey}: ${fieldCount} fields, ${variantCount} variants`);
    });
    console.log(`Total Fields: ${totalFields}`);
    console.log(`Total Field Variants: ${totalFieldVariants}\n`);

    // Field Format Statistics
    const fieldFormats = globalCache.fieldNameFormats;
    console.log('Field Format Stats:');
    Object.entries(fieldFormats).forEach(([entityKey, fields]) => {
        console.log(`\n${entityKey}:`);
        Object.entries(fields).forEach(([fieldKey, formats]) => {
            const formatCount = Object.keys(formats).length;
            console.log(`  ${fieldKey}: ${formatCount} formats`);
        });
    });

    // Example Entity Detail
    console.log('\n=== Example Entity Detail: registeredFunction ===');
    const exampleEntity = globalCache.schema['registeredFunction'];
    if (exampleEntity) {
        // Name variations
        console.log('\nName Variations:');
        const variants = Object.entries(entityNameMappings)
            .filter(([_, canonical]) => canonical === 'registeredFunction')
            .map(([variant]) => variant);
        console.log('Variants:', variants.join(', '));

        // Format examples
        console.log('\nFormat Examples:');
        const formats = entityFormats['registeredFunction'];
        Object.entries(formats).forEach(([format, value]) => {
            console.log(`${format}: ${value}`);
        });

        // Field summary
        console.log('\nFields Summary:');
        Object.entries(exampleEntity.entityFields).forEach(([fieldKey, field]) => {
            const fieldVariants = Object.entries(fieldMappings['registeredFunction'])
                .filter(([_, canonical]) => canonical === fieldKey)
                .map(([variant]) => variant);

            const fieldFormatsCount = Object.keys(
                fieldFormats['registeredFunction'][fieldKey]
            ).length;

            console.log(`\n${fieldKey}:`);
            console.log(`  Variants: ${fieldVariants.join(', ')}`);
            console.log(`  Format Count: ${fieldFormatsCount}`);
            console.log(`  Type: ${field.typeReference}`);
            console.log(`  Required: ${field.isRequired}`);
        });
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


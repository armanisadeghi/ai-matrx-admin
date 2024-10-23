import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";
import {tableNameLookup, fieldNameLookup} from "@/utils/schema/lookupSchema";
import {
    AutomationTable,
    TableSchemaStructure,
    AutomationTableStructure,
} from "@/types/automationTableTypes";
import {AutomationTableName, NameFormat} from "@/types/AutomationSchemaTypes";
import {schemaLogger} from '@/lib/logger/schema-logger';


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


export type UnifiedSchemaCache = {
    schema: AutomationTableStructure;
    tableNameMap: Map<string, string>;
    fieldNameMap: Map<string, Map<string, string>>;
};

// Global cache instance
let globalCache: UnifiedSchemaCache | null = null;

/**
 * Initializes the entire schema system with efficient caching
 */
/**
 * Initializes the entire schema system with efficient caching.
 * This will log and set the global cache.
 */
export function initializeSchemaSystem(trace: string[] = ['unknownCaller']): UnifiedSchemaCache {
    // Add trace for the current function
    trace = [...trace, 'initializeSchemaSystem'];

    if (globalCache) return globalCache;

    try {
        // Initialize the base schema
        const initializedSchema = initializeTableSchema(initialAutomationTableSchema);

        // Create efficient Maps for lookups
        const tableMap = new Map<string, string>();
        Object.entries(tableNameLookup).forEach(([variant, key]) => {
            tableMap.set(variant.toLowerCase(), key);
        });

        // Create nested Maps for field lookups
        const fieldMap = new Map<string, Map<string, string>>();
        Object.entries(fieldNameLookup).forEach(([table, fields]) => {
            const fieldVariants = new Map<string, string>();
            Object.entries(fields).forEach(([variant, key]) => {
                fieldVariants.set(variant.toLowerCase(), key);
            });
            fieldMap.set(table, fieldVariants);
        });

        globalCache = {
            schema: initializedSchema,
            tableNameMap: tableMap,
            fieldNameMap: fieldMap
        };

        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'globalCache',
            message: 'Successfully initialized schema system and global cache.',
            level: 'info',
            trace
        });

    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'error',
            message: `Failed to initialize schema system: ${error.message}`,
            level: 'warn',
            trace
        });
        console.warn(`Failed to initialize schema system: ${error.message}`);
    }

    return globalCache;
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
    // Add trace for the current function
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
        return null;  // Return null instead of throwing an error
    }

    return globalCache;
}

// RECORD ALL RESOLUTIONS WITH LOGGING MIDDLEWARE: logResolution - lib/logger/schema-logger.ts ==============================================================================

// Helper to resolve a table name variant
export function resolveTableName(tableNameVariant: string, trace: string[] = ['unknownCaller']): string {
    trace = [...trace, 'resolveTableName'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: tableNameVariant,
            resolved: tableNameVariant,
            message: `Global cache is not initialized when resolving table name: '${tableNameVariant}'`,
            level: 'warn',
            trace
        });
        return tableNameVariant;
    }

    const resolvedTableName = getTableKeyFromUnknown(tableNameVariant);

    // Log the result using the centralized logging system
    if (resolvedTableName === tableNameVariant) {
        schemaLogger.logResolution({
            resolutionType: 'table',
            original: tableNameVariant,
            resolved: resolvedTableName,
            message: `Table name resolution failed for: '${tableNameVariant}'`,
            level: 'warn',
            trace
        });
    } else {
        schemaLogger.logResolution({
            resolutionType: 'table',
            original: tableNameVariant,
            resolved: resolvedTableName,
            message: `Successfully resolved table name: '${tableNameVariant}' to '${resolvedTableName}'`,
            level: 'info',
            trace
        });
    }

    return resolvedTableName;
}


// Helper to resolve a field name variant
export function resolveFieldName(
    tableKey: string,
    anyFieldNameVariation: string,
    trace: string[] = ['unknownCaller']
): string {
    trace = [...trace, 'resolveFieldName'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: anyFieldNameVariation,
            resolved: anyFieldNameVariation,
            message: `Global cache is not initialized when resolving field name: '${anyFieldNameVariation}'`,
            level: 'warn',
            trace
        });
        return anyFieldNameVariation;
    }

    const resolvedFieldName = getUnknownFieldWithKnownTableKey(tableKey, anyFieldNameVariation);

    if (resolvedFieldName === anyFieldNameVariation) {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: anyFieldNameVariation,
            resolved: resolvedFieldName,
            message: `Field name resolution failed for: '${anyFieldNameVariation}' in table '${tableKey}'`,
            level: 'warn',
            trace
        });
    } else {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: anyFieldNameVariation,
            resolved: resolvedFieldName,
            message: `Successfully resolved field name: '${anyFieldNameVariation}' to '${resolvedFieldName}' in table '${tableKey}'`,
            level: 'info',
            trace
        });
    }

    return resolvedFieldName;
}

// =================================================================================================


// BASIC ENTRY FUNCTIONS TO GET TABLE AND FIELD NAMES =========================================
// Helper to get a table key, falling back to resolution if needed
export function getTableKey(tableNameVariant: string, trace: string[] = ['unknownCaller']): string {
    trace = [...trace, 'getTableKey'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: tableNameVariant,
            resolved: tableNameVariant,
            message: `Global cache is not initialized when trying to resolve table name: '${tableNameVariant}'`,
            level: 'warn',
            trace
        });
        return tableNameVariant;
    }

    const schema = globalCache.schema;

    // Check if the tableNameVariant is already a valid key in the schema
    if (schema[tableNameVariant]) {
        return tableNameVariant;
    }

    // Fall back to resolveTableName if no match found
    return resolveTableName(tableNameVariant, trace);
}

// Helper to get a field key, falling back to resolution if needed
export function getFieldKey(
    tableKey: string,
    anyFieldNameVariation: string,
    trace: string[] = ['unknownCaller']
): string {
    trace = [...trace, 'getFieldKey'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: anyFieldNameVariation,
            resolved: anyFieldNameVariation,
            message: `Global cache is not initialized when trying to resolve field name: '${anyFieldNameVariation}'`,
            level: 'warn',
            trace
        });
        return anyFieldNameVariation;
    }

    const fields = globalCache.schema[tableKey]?.entityFields;

    // Check if the field name is already valid in the schema
    if (fields && fields[anyFieldNameVariation]) {
        return anyFieldNameVariation;
    }

    // Fall back to resolveFieldName if no match found
    return resolveFieldName(tableKey, anyFieldNameVariation, trace);
}

// =================================================================================================


// CRITICAL CONVERSION FUNCTIONS TO ENSURE NO ERRORS! =========================================

// Updated to adhere to the new guidelines
export function getTableKeyFromUnknown(tableNameVariant: string, trace: string[] = ['unknownCaller']): string {
    // Add trace for the current function
    trace = [...trace, 'getTableKeyFromUnknown'];

    // Use the centralized getTableKey function which now handles tracing and resolution
    return getTableKey(tableNameVariant, trace);
}

// Updated to adhere to the new guidelines
export function getUnknownFieldWithKnownTableKey(
    tableKey: string,
    anyFieldNameVariation: string,
    trace: string[] = ['unknownCaller']
): string {
    // Add trace for the current function
    trace = [...trace, 'getUnknownFieldWithKnownTableKey'];

    // Use the centralized getFieldKey function which now handles tracing and resolution
    return getFieldKey(tableKey, anyFieldNameVariation, trace);
}


// Updated to adhere to the new guidelines
export function getFieldKeyFromUnknown(
    tableNameVariant: string,
    anyFieldNameVariation: string,
    trace: string[] = ['unknownCaller']
): string {
    // Add trace for the current function
    trace = [...trace, 'getFieldKeyFromUnknown'];

    // First resolve the table key
    const tableKey = getTableKey(tableNameVariant, trace);

    // Then resolve the field key
    return getFieldKey(tableKey, anyFieldNameVariation, trace);
}


/**
 * Recursively converts table and field keys in a given object, using schema mappings.
 * @param inputObject The object to convert.
 * @param tableNameVariant The table name variant to be resolved.
 * @param trace Optional trace to track function calls.
 */
export function convertTableAndFieldsInObject(
    inputObject: any,
    tableNameVariant: string,
    trace: string[] = ['unknownCaller']
): any {
    // Add current function to trace
    trace = [...trace, 'convertTableAndFieldsInObject'];

    // Resolve the table key with error-safe logging
    const tableKey = getTableKey(tableNameVariant, trace);

    // If it's not an object, return it directly
    if (typeof inputObject !== 'object' || inputObject === null) {
        return inputObject;
    }

    const result: any = Array.isArray(inputObject) ? [] : {};

    // Iterate through each key-value pair in the object
    for (const key in inputObject) {
        if (inputObject.hasOwnProperty(key)) {
            // Convert field key with error-safe logging
            const fieldKey = getFieldKey(tableKey, key, trace);
            result[fieldKey] = convertFieldsInNestedObject(inputObject[key], tableKey, trace);
        }
    }

    return result;
}

/**
 * Recursively converts field keys within nested structures.
 * @param inputObject The object (nested or not) to convert.
 * @param tableKey The resolved table key.
 * @param trace Optional trace to track function calls.
 */
export function convertFieldsInNestedObject(
    inputObject: any,
    tableKey: string,
    trace: string[] = ['unknownCaller']
): any {
    // Add current function to trace
    trace = [...trace, 'convertFieldsInNestedObject'];

    // If it's not an object or array, return it directly
    if (typeof inputObject !== 'object' || inputObject === null) {
        return inputObject;
    }

    const result: any = Array.isArray(inputObject) ? [] : {};

    // Iterate through the object and recursively process keys
    for (const key in inputObject) {
        if (inputObject.hasOwnProperty(key)) {
            const fieldKey = getFieldKey(tableKey, key, trace);  // Convert field key with error-safe logging
            result[fieldKey] = convertFieldsInNestedObject(inputObject[key], tableKey, trace);
        }
    }

    return result;
}

// =================================================================================================


// ----------------------------
/**
 * Gets the standardized key for any table name variant
 */
export function resolveTableKey(tableNameVariant: string): string {
    if (!globalCache) throw new Error('Schema system not initialized');
    return globalCache.tableNameMap.get(tableNameVariant.toLowerCase()) || tableNameVariant;
}

/**
 * Gets the standardized key for any field name variant within a table
 */
export function resolveFieldKey(tableKey: string, fieldNameVariant: string): string {
    if (!globalCache) throw new Error('Schema system not initialized');
    const fieldMap = globalCache.fieldNameMap.get(tableKey);
    if (!fieldMap) return fieldNameVariant;
    return fieldMap.get(fieldNameVariant.toLowerCase()) || fieldNameVariant;
}

/**
 * Gets a table's name in a specific format
 */
export function getTableName(
    tableNameVariant: string,
    format: keyof AutomationTable['entityNameMappings'] = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const tableKey = resolveTableKey(tableNameVariant);
    const table = globalCache.schema[tableKey];
    if (!table) return tableNameVariant;

    return table.entityNameMappings[format] || tableNameVariant;
}

/**
 * Gets a field's name in a specific format
 */
export function getFieldName(
    tableNameVariant: string,
    fieldNameVariant: string,
    format: keyof AutomationTable['entityNameMappings'] = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    const tableKey = resolveTableKey(tableNameVariant);
    const fieldKey = resolveFieldKey(tableKey, fieldNameVariant);

    const table = globalCache.schema[tableKey];
    if (!table) return fieldNameVariant;

    const field = table.entityFields[fieldKey];
    if (!field) return fieldNameVariant;

    return field.fieldNameMappings[fieldKey]?.[format] || fieldNameVariant;
}


export function getSchema(
    tableName: string,
    responseFormat?: keyof AutomationTable['entityNameMappings'],
    trace: string[] = ['unknownCaller']
): AutomationTable | null {
    trace = [...trace, 'getSchema'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const tableKey = getTableKey(tableName, trace);
    const table = globalCache.schema[tableKey];
    if (!table) return null;

    // If no specific format requested, return the original table schema
    if (!responseFormat) {
        return table;
    }

    // Rekey the entityNameMappings and fields based on the response format
    const rekeyedTable: AutomationTable = {
        ...table,
        entityNameMappings: {
            ...table.entityNameMappings,
            [responseFormat]: table.entityNameMappings[responseFormat],  // Return table name in the requested format
        },
        entityFields: Object.fromEntries(
            Object.entries(table.entityFields).map(([fieldKey, field]) => [
                field.fieldNameMappings[responseFormat] || fieldKey,  // Get the field name based on the requested format
                field  // Preserve all other field properties
            ])
        ),
    };

    return rekeyedTable;
}

/**
 * Converts data from any format to the specified response format, rekeying table and field names.
 * @param data The data to be converted, in any format.
 * @param responseFormat The format to convert the data to.
 */
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
export function convertType(
    value: any,
    table: string,
    field: string,
    targetFormat: NameFormat
): any {
    if (!globalCache) throw new Error('Schema system not initialized');

    const tableKey = resolveTableKey(table);
    const fieldKey = resolveFieldKey(tableKey, field);

    const fieldInfo = globalCache.schema[tableKey]?.entityFields[fieldKey];
    if (!fieldInfo) return value;

    // Implement type conversion logic based on fieldInfo.dataType
    // This is a placeholder for the actual implementation
    return value;
}

// Batch operations for performance
export function batchResolveFields(
    tableKey: string,
    fieldVariants: string[]
): Record<string, string> {
    if (!globalCache) throw new Error('Schema system not initialized');

    return Object.fromEntries(
        fieldVariants.map(variant => [
            variant,
            resolveFieldKey(tableKey, variant)
        ])
    );
}


/**
 * Retrieves the frontend table name from a given variant using the cached schema.
 */
export function getFrontendTableName(tableName: string, trace: string[] = ['unknownCaller']): string {
    trace = [...trace, 'getFrontendTableName'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return tableName;  // Return the original name if no cache

    // Loop through the cached schema to find the matching frontend table name
    for (const [key, schema] of Object.entries(globalCache.schema)) {
        if (Object.values(schema.entityNameMappings).includes(tableName)) {
            return schema.entityNameMappings.frontend;  // Return the frontend name
        }
    }

    return tableName;  // Return original if no match is found
}

/**
 * Retrieves the table name in a specific format (e.g., frontend, backend) using the cached schema.
 */
export function getTableNameByFormat(tableName: string, nameFormat: string, trace: string[] = ['unknownCaller']): string {
    trace = [...trace, 'getTableNameByFormat'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return tableName;  // Return original if no cache available

    // Iterate through the cached schema and find the table by its nameFormat
    for (const [key, schema] of Object.entries(globalCache.schema)) {
        if (schema.entityNameMappings[nameFormat] === tableName) {
            return key;  // Return the table key (primary name)
        }
    }

    return tableName;  // Fallback to original if no match
}

/**
 * Retrieves complete table information from the cached schema.
 */
export function getTable(tableName: string, trace: string[] = ['unknownCaller']): AutomationTable | null {
    trace = [...trace, 'getTable'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;  // Return null if cache not available

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    return globalCache.schema[tableKey] || null;  // Return the table schema
}

/**
 * Retrieves complete field information from the cached schema.
 */
export function getField(
    tableName: string,
    fieldName: string,
    trace: string[] = ['unknownCaller']
): AutomationTable['entityFields'][string] | null {
    trace = [...trace, 'getField'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return null;

    const fieldKey = getFieldKey(tableKey, fieldName, trace);  // Resolve field key
    return table.entityFields[fieldKey] || null;
}

/**
 * Retrieves all relationships for a table from the cached schema.
 */
export function getTableRelationships(tableName: string, trace: string[] = ['unknownCaller']): AutomationTable['relationships'] | null {
    trace = [...trace, 'getTableRelationships'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return null;

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return null;

    return table.relationships;
}

/**
 * Checks if a field exists in a table from the cached schema.
 */
export function fieldExists(tableName: string, fieldName: string, trace: string[] = ['unknownCaller']): boolean {
    trace = [...trace, 'fieldExists'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return false;

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return false;

    const fieldKey = getFieldKey(tableKey, fieldName, trace);  // Resolve field key
    return !!table.entityFields[fieldKey];
}

/**
 * Checks if a table exists in the cached schema.
 */
export function tableExists(tableName: string, trace: string[] = ['unknownCaller']): boolean {
    trace = [...trace, 'tableExists'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return false;

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    return !!globalCache.schema[tableKey];
}

/**
 * Retrieves all primary key fields for a table from the cached schema.
 */
export function getPrimaryKeys(tableName: string, trace: string[] = ['unknownCaller']): string[] {
    trace = [...trace, 'getPrimaryKeys'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return [];

    return Object.entries(table.entityFields)
        .filter(([_, field]) => field.isPrimaryKey)
        .map(([fieldName]) => fieldName);
}

/**
 * Retrieves all display fields for a table from the cached schema.
 */
export function getDisplayFields(tableName: string, trace: string[] = ['unknownCaller']): string[] {
    trace = [...trace, 'getDisplayFields'];

    const globalCache = getGlobalCache(trace);
    if (!globalCache) return [];

    const tableKey = getTableKey(tableName, trace);  // Resolve table key
    const table = globalCache.schema[tableKey];
    if (!table) return [];

    return Object.entries(table.entityFields)
        .filter(([_, field]) => field.isDisplayField)
        .map(([fieldName]) => fieldName);
}


/**
 * Generates the client-side schema bundle
 */
export function generateClientSchema(): {
    schema: AutomationTableStructure;
    lookups: {
        tables: Record<string, string>;
        fields: Record<string, Record<string, string>>;
    };
} {
    if (!globalCache) throw new Error('Schema system not initialized');

    return {
        schema: globalCache.schema,
        lookups: {
            tables: Object.fromEntries(globalCache.tableNameMap),
            fields: Object.fromEntries(
                Array.from(globalCache.fieldNameMap.entries()).map(
                    ([table, fields]) => [table, Object.fromEntries(fields)]
                )
            )
        }
    };
}

// Example usage in getServerSideProps:
/*
export async function getServerSideProps() {
    const schemaSystem = initializeSchemaSystem();
    const clientSchema = generateClientSchema();

    return {
        props: {
            schema: clientSchema
        }
    };
}
*/


// ==================================== Database Interactions =============================================================

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
    tableName: string,
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
    tableName: string,
    dbData: Record<string, any>,
    trace: string[] = ['unknownCaller']
) {
    trace = [...trace, 'processDataForInsert'];

    // Get schema from the cache, rekeyed for 'databaseName' format
    const schema = getSchema(tableName, 'database', trace);
    if (!schema) {
        console.warn(`No schema found for table: ${tableName}. Returning original data.`);
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
                const relationship = handleRelationshipField(dbKey, value, structureType, tableName, fieldSchema, trace);

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
    tableName: string,
    format: keyof AutomationTable['entityNameMappings'] = 'frontend',
    trace: string[] = ['unknownCaller']
): Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null> {
    trace = [...trace, 'getRelationships'];

    const schema = getSchema(tableName, format, trace);
    if (!schema) {
        console.error(`Schema not found for table: ${tableName}`);
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
            console.log(`Both foreignKey and inverseForeignKey found for table: ${tableName}. Returning 'fkAndIfk'.`);
            return 'fkAndIfk';
        }
    }

    if (hasForeignKey) {
        console.log(`Only foreignKey found for table: ${tableName}. Returning 'fk'.`);
        return 'fk';
    }

    if (hasInverseForeignKey) {
        console.log(`Only inverseForeignKey found for table: ${tableName}. Returning 'ifk'.`);
        return 'ifk';
    }

    console.log(`No foreignKey or inverseForeignKey found for table: ${tableName}. Returning 'simple'.`);
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

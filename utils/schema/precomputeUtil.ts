import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";
import {
    tableNameLookup,
    fieldNameLookup,
    reverseTableNameLookup,
    reverseFieldNameLookup
} from "@/utils/schema/lookupSchema";
import {
    AutomationTable,
    TableSchemaStructure,
    AutomationTableStructure,
    AnyTableName,
    TableFields,
    FieldNameResolver,
    EntityNameMappings,
    InitialTableSchema,
    TableNameMap,
    AllTableNameVariations,
    TableNameLookupType,
    FieldNameMap,
    AllFieldNameVariations,
    FieldNameLookupType,
    ReverseTableNameMap,
    ReverseTableLookupType,
    ReverseFieldNameMap,
    ReverseFieldLookupType,
    UnifiedSchemaCache,
} from "@/types/automationTableTypes";
import {
    AutomationTableName,
    NameFormat,
    OptionalNameFormats,
    RequiredNameFormats,
    SchemaEntityKeys
} from "@/types/AutomationSchemaTypes";
import {schemaLogger} from '@/lib/logger/schema-logger';

function initializeTableSchema(
    initialAutomationTableSchema: TableSchemaStructure
): Record<AutomationTableName, AutomationTable> {
    const schemaMapping = {} as Record<AutomationTableName, AutomationTable>;

    for (const [entityKey, entity] of Object.entries(initialAutomationTableSchema) as [SchemaEntityKeys, InitialTableSchema][]) {

        const entityNameMappings: Record<NameFormat, string> = {} as Record<NameFormat, string>;

        Object.keys(entity.entityNameVariations).forEach((key) => {
            const typedKey = key as NameFormat;
            if (entity.entityNameVariations[typedKey]) {
                entityNameMappings[typedKey] = entity.entityNameVariations[typedKey] || entityKey;
            }
        });

        const updatedFields: Record<string, any> = {};

        for (const [fieldKey, field] of Object.entries(entity.entityFields)) {
            const fieldNameMappings: Record<NameFormat, string> = {} as Record<NameFormat, string>;

            Object.keys(field.fieldNameVariations).forEach((key) => {
                const typedKey = key as NameFormat;
                if (field.fieldNameVariations[typedKey]) {
                    fieldNameMappings[typedKey] = field.fieldNameVariations[typedKey] || fieldKey;
                }
            });

            let enumValues: string[] | null = null;
            const {typeReference} = field;

            if (typeof typeReference === 'object' && Object.keys(typeReference).length > 0) {
                enumValues = Object.keys(typeReference).filter(key => key !== '_typeBrand');
            } else {
                enumValues = null;
            }

            updatedFields[fieldKey] = {
                ...field,
                fieldNameMappings: fieldNameMappings,
                enumValues: enumValues
            };
        }

        schemaMapping[entityKey] = {
            schemaType: entity.schemaType,
            entityNameMappings: entityNameMappings,
            entityFields: updatedFields,
            defaultFetchStrategy: entity.defaultFetchStrategy,
            componentProps: entity.componentProps,
            relationships: entity.relationships
        };
    }

    return schemaMapping;
}


function createTableNameMap(): TableNameMap {
    const map = new Map<AllTableNameVariations, AutomationTableName>();
    const strictLookup = tableNameLookup as TableNameLookupType;

    Object.entries(strictLookup).forEach(([variant, tableName]) => {
        map.set(variant as AllTableNameVariations, tableName);
    });

    return map;
}

function createFieldNameMap(): FieldNameMap {
    const fieldMap = new Map<
        AutomationTableName,
        Map<AllFieldNameVariations<AutomationTableName>, keyof TableFields<AutomationTableName>>
    >();

    const strictLookup = fieldNameLookup as FieldNameLookupType;

    (Object.keys(strictLookup) as Array<AutomationTableName>).forEach((tableName) => {
        const fields = strictLookup[tableName];
        const fieldVariants = new Map<
            AllFieldNameVariations<typeof tableName>,
            keyof TableFields<typeof tableName>
        >();

        Object.entries(fields).forEach(([variant, canonicalName]) => {
            fieldVariants.set(
                variant as AllFieldNameVariations<typeof tableName>,
                canonicalName
            );
        });

        fieldMap.set(tableName, fieldVariants);
    });

    return fieldMap;
}

function createReverseTableNameMap(): ReverseTableNameMap {
    const map = new Map<AutomationTableName, Set<AllTableNameVariations>>();
    const strictLookup = reverseTableNameLookup as ReverseTableLookupType;

    Object.entries(strictLookup).forEach(([tableName, mappings]) => {
        const variants = new Set<AllTableNameVariations>();

        Object.values(mappings).forEach((variant) => {
            variants.add(variant as AllTableNameVariations);
        });

        map.set(tableName as AutomationTableName, variants);
    });

    return map;
}

function createReverseFieldNameMap(): ReverseFieldNameMap {
    const map = new Map<
        AutomationTableName,
        Map<keyof TableFields<AutomationTableName>, Set<AllFieldNameVariations<AutomationTableName>>>
    >();
    const strictLookup = reverseFieldNameLookup as ReverseFieldLookupType;

    Object.entries(strictLookup).forEach(([tableName, fields]) => {
        const tableFields = new Map<
            keyof TableFields<AutomationTableName>,
            Set<AllFieldNameVariations<AutomationTableName>>
        >();

        Object.entries(fields).forEach(([fieldName, mappings]) => {
            const variants = new Set<AllFieldNameVariations<AutomationTableName>>();

            Object.values(mappings).forEach((variant) => {
                variants.add(variant as AllFieldNameVariations<AutomationTableName>);
            });

            tableFields.set(fieldName as keyof TableFields<AutomationTableName>, variants);
        });

        map.set(tableName as AutomationTableName, tableFields);
    });

    return map;
}


let globalCache: UnifiedSchemaCache | null = null;

export function initializeSchemaSystem(trace: string[] = ['unknownCaller']): UnifiedSchemaCache {
    trace = [...trace, 'initializeSchemaSystem'];

    if (globalCache) {
        console.log('Request received for schema system. Reusing the existing global cache instance.');
        return globalCache;
    }

    try {
        const initializedSchema = initializeTableSchema(initialAutomationTableSchema);
        const tableMap = createTableNameMap();
        const fieldMap = createFieldNameMap();
        const reverseTableMap = createReverseTableNameMap();
        const reverseFieldMap = createReverseFieldNameMap();

        globalCache = {
            schema: initializedSchema,
            tableNameMap: tableMap,
            fieldNameMap: fieldMap,
            reverseTableNameMap: reverseTableMap,
            reverseFieldNameMap: reverseFieldMap
        };

        console.log('Schema system initialized. New global cache created.');
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'globalCache',
            message: 'Successfully initialized schema system and global cache.',
            level: 'info',
            trace
        });

        logSchemaCacheReport(globalCache);

        return globalCache;

    } catch (error) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: 'globalCache',
            resolved: 'error',
            message: `Failed to initialize schema system: ${error instanceof Error ? error.message : String(error)}`,
            level: 'warn',
            trace
        });
        console.warn(`Failed to initialize schema system: ${error instanceof Error ? error.message : String(error)}`);
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


export type FieldNameVariations<T extends AutomationTableName, F extends keyof TableFields<T>> = {
    [K in NameFormat]: AutomationTableStructure[T]['entityFields'][F]['fieldNameMappings'][K];
}[NameFormat];

export type TableNameVariations<T extends AutomationTableName> = {
    [K in NameFormat]: AutomationTableStructure[T]['entityNameMappings'][K];
}[NameFormat];

// Refined table name variant type
export type TableNameVariant =
    | AutomationTableName
    | TableNameVariations<AutomationTableName>;

// Helper type to get all possible field names for a table
export type AllPossibleFieldNames<T extends AutomationTableName> =
    | keyof TableFields<T>
    | {
    [F in keyof TableFields<T>]: FieldNameVariations<T, F>;
}[keyof TableFields<T>];

// Enhanced field name resolver
export type EnhancedFieldNameResolver<
    T extends AutomationTableName,
    F extends keyof TableFields<T>,
    V extends NameFormat
> = AutomationTableStructure[T]['entityFields'][F]['fieldNameMappings'][V];


export type StringFieldKey<T extends AutomationTableName> =
    Extract<keyof TableFields<T>, string>;

// Refined field name variant type that ensures string keys
export type FieldNameVariant<T extends AutomationTableName> =
    | StringFieldKey<T>
    | FieldNameVariations<T, StringFieldKey<T>>;

// Type guard functions
export function isValidTableName(name: string): name is AutomationTableName {
    return name in (globalCache?.schema ?? {});
}

export function isValidFieldName<T extends AutomationTableName>(
    table: T,
    fieldName: string
): fieldName is StringFieldKey<T> {
    return typeof fieldName === 'string' &&
        fieldName in (globalCache?.schema[table]?.entityFields ?? {});
}


export function resolveTableName(
    tableNameVariant: TableNameVariant,
    trace: string[] = ['unknownCaller']
): AutomationTableName {
    trace = [...trace, 'resolveTableName'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: String(tableNameVariant),
            resolved: String(tableNameVariant),
            message: `Global cache is not initialized when resolving table name: '${String(tableNameVariant)}'`,
            level: 'warn',
            trace
        });
        return tableNameVariant as AutomationTableName;
    }

    const resolvedTableName = getTableKeyFromUnknown(String(tableNameVariant));

    // Logging remains the same
    if (resolvedTableName === tableNameVariant) {
        schemaLogger.logResolution({
            resolutionType: 'table',
            original: String(tableNameVariant),
            resolved: resolvedTableName,
            message: `Table name resolution failed for: '${String(tableNameVariant)}'`,
            level: 'warn',
            trace
        });
    } else {
        schemaLogger.logResolution({
            resolutionType: 'table',
            original: String(tableNameVariant),
            resolved: resolvedTableName,
            message: `Successfully resolved table name: '${String(tableNameVariant)}' to '${resolvedTableName}'`,
            level: 'info',
            trace
        });
    }

    return resolvedTableName as AutomationTableName;
}

export function resolveFieldName<T extends AutomationTableName>(
    tableKey: T,
    fieldNameVariant: FieldNameVariant<T>,
    trace: string[] = ['unknownCaller']
): StringFieldKey<T> {
    trace = [...trace, 'resolveFieldName'];

    // Convert fieldNameVariant to string immediately to use throughout the function
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
        return fieldNameString as StringFieldKey<T>;
    }

    const resolvedFieldName = getUnknownFieldWithKnownTableKey(tableKey, fieldNameString);
    const resolvedFieldString = String(resolvedFieldName);

    // Compare string versions for equality
    if (resolvedFieldString === fieldNameString) {
        schemaLogger.logResolution({
            resolutionType: 'field',
            original: fieldNameString,
            resolved: resolvedFieldString,
            message: `Field name resolution failed for: '${fieldNameString}' in table '${tableKey}'`,
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

    return resolvedFieldName as StringFieldKey<T>;
}


export type ResolvedField<T extends AutomationTableName> = {
    original: string;
    resolved: StringFieldKey<T>;
    table: T;
};


export function resolveFieldNameSafe<T extends AutomationTableName>(
    tableKey: T,
    fieldNameVariant: FieldNameVariant<T>,
    trace: string[] = ['unknownCaller']
): ResolvedField<T> {
    const original = String(fieldNameVariant);
    const resolved = resolveFieldName(tableKey, fieldNameVariant, trace);

    return {
        original,
        resolved,
        table: tableKey
    };
}

// Helper to get a table key, falling back to resolution if needed
export function getTableKey(
    tableNameVariant: TableNameVariant,
    trace: string[] = ['unknownCaller']
): AutomationTableName {
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
        return tableNameVariant as AutomationTableName;
    }

    const schema = globalCache.schema;

    // Check if the tableNameVariant is already a valid key in the schema
    if (schema[tableNameVariant as AutomationTableName]) {
        return tableNameVariant as AutomationTableName;
    }

    // Fall back to resolveTableName if no match found
    return resolveTableName(tableNameVariant, trace);
}

// Helper for unknown string inputs
export type UnknownNameString = string;

// Enhanced type guards
export function isKnownTableVariant(name: UnknownNameString): name is TableNameVariant {
    if (!globalCache) return false;
    return globalCache.tableNameMap.has(name.toLowerCase());
}

export type NestedObject = { [key: string]: any };

// Type guard for field variants
export function isKnownFieldVariant<T extends AutomationTableName>(
    tableKey: T,
    value: unknown
): value is FieldNameVariant<T> {
    if (typeof value !== 'string') return false;
    const fieldMap = globalCache?.fieldNameMap.get(tableKey);
    return fieldMap?.has(value.toLowerCase()) ?? false;
}

// Helper type guard for field existence
function isValidFieldInSchema<T extends AutomationTableName>(
    fields: AutomationTableStructure[T]['entityFields'],
    fieldName: string | FieldNameVariant<T>
): fieldName is StringFieldKey<T> {
    return fieldName in fields;
}

// Updated conversion functions with proper typing
export function getFieldKey<T extends AutomationTableName>(
    tableKey: T,
    anyFieldNameVariation: FieldNameVariant<T> | UnknownNameString,
    trace: string[] = ['unknownCaller']
): StringFieldKey<T> {
    trace = [...trace, 'getFieldKey'];

    if (!globalCache) {
        schemaLogger.logResolution({
            resolutionType: 'cache',
            original: String(anyFieldNameVariation),
            resolved: String(anyFieldNameVariation),
            message: `Global cache is not initialized when trying to resolve field name: '${String(anyFieldNameVariation)}'`,
            level: 'warn',
            trace
        });
        return String(anyFieldNameVariation) as StringFieldKey<T>;
    }

    const fields = globalCache.schema[tableKey]?.entityFields;

    // Check if the field name is already valid in the schema
    if (fields && isValidFieldInSchema(fields, anyFieldNameVariation)) {
        return anyFieldNameVariation;
    }

    // Fall back to resolveFieldName if no match found
    return resolveFieldName(tableKey, anyFieldNameVariation as FieldNameVariant<T>, trace);
}

// Critical conversion functions with enhanced type safety
export function getTableKeyFromUnknown(
    tableNameVariant: UnknownNameString,
    trace: string[] = ['unknownCaller']
): AutomationTableName {
    trace = [...trace, 'getTableKeyFromUnknown'];

    if (isKnownTableVariant(tableNameVariant)) {
        return getTableKey(tableNameVariant, trace);
    }

    // If not a known variant, attempt resolution anyway but with a type assertion
    return getTableKey(tableNameVariant as TableNameVariant, trace);
}

export function getUnknownFieldWithKnownTableKey<T extends AutomationTableName>(
    tableKey: T,
    anyFieldNameVariation: UnknownNameString,
    trace: string[] = ['unknownCaller']
): StringFieldKey<T> {
    trace = [...trace, 'getUnknownFieldWithKnownTableKey'];

    if (isKnownFieldVariant(tableKey, anyFieldNameVariation)) {
        return getFieldKey(tableKey, anyFieldNameVariation, trace);
    }

    // If not a known variant, attempt resolution anyway
    return getFieldKey(tableKey, anyFieldNameVariation as FieldNameVariant<T>, trace);
}

export function getFieldKeyFromUnknown(
    tableNameVariant: UnknownNameString,
    anyFieldNameVariation: UnknownNameString,
    trace: string[] = ['unknownCaller']
): string {
    trace = [...trace, 'getFieldKeyFromUnknown'];

    // First resolve the table key
    const tableKey = getTableKeyFromUnknown(tableNameVariant, trace) as AutomationTableName;

    // Then resolve the field key with the known table key
    return getUnknownFieldWithKnownTableKey(
        tableKey,
        anyFieldNameVariation,
        trace
    );
}


// Helper function to safely type unknown inputs
export function createSafeFieldResolver<T extends AutomationTableName>() {
    return {
        forTable: (tableKey: T) => ({
            resolveField: (fieldName: UnknownNameString) =>
                getUnknownFieldWithKnownTableKey(tableKey, fieldName)
        })
    };
}

// Optional: Type-safe wrapper for the most common use cases
export function createFieldResolver() {
    return {
        resolveField: <T extends AutomationTableName>(
            table: T | UnknownNameString,
            field: UnknownNameString
        ) => {
            const resolvedTable = getTableKeyFromUnknown(String(table));
            return getUnknownFieldWithKnownTableKey(resolvedTable, field);
        }
    };
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
export function convertFieldsInNestedObject<T extends AutomationTableName>(
    inputObject: unknown,
    tableKey: T,
    trace: string[] = ['unknownCaller']
): unknown {
    // Add current function to trace
    trace = [...trace, 'convertFieldsInNestedObject'];

    // If it's not an object or array, return it directly
    if (typeof inputObject !== 'object' || inputObject === null) {
        return inputObject;
    }

    // Handle arrays
    if (Array.isArray(inputObject)) {
        return inputObject.map(item =>
            convertFieldsInNestedObject(item, tableKey, trace)
        );
    }

    const result: Record<string, unknown> = {};

    // Iterate through the object and recursively process keys
    for (const key in inputObject) {
        if (Object.prototype.hasOwnProperty.call(inputObject, key)) {
            const fieldKey = getFieldKey(tableKey, key as UnknownNameString, trace);
            result[fieldKey] = convertFieldsInNestedObject(
                (inputObject as Record<string, unknown>)[key],
                tableKey,
                trace
            );
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
    return globalCache.tableNameMap.get(tableNameVariant) || tableNameVariant;
}

// Helper type for conversion results
export type ConversionResult<T extends AutomationTableName> = {
    originalKey: string;
    resolvedKey: StringFieldKey<T>;
    value: unknown;
};

// Helper function for tracking conversions
export function trackFieldConversion<T extends AutomationTableName>(
    tableKey: T,
    originalKey: string,
    value: unknown,
    trace: string[] = ['unknownCaller']
): ConversionResult<T> {
    const resolvedKey = getFieldKey(tableKey, originalKey, trace);
    return {
        originalKey,
        resolvedKey,
        value
    };
}

/**
 * Gets the standardized key for any field name variant within a table
 */
export function resolveFieldKey<T extends AutomationTableName>(
    tableKey: T,
    fieldNameVariant: UnknownNameString
): StringFieldKey<T> {
    if (!globalCache) throw new Error('Schema system not initialized');

    const fieldMap = globalCache.fieldNameMap.get(tableKey);
    if (!fieldMap) return fieldNameVariant as StringFieldKey<T>;

    return (fieldMap.get(fieldNameVariant.toLowerCase()) || fieldNameVariant) as StringFieldKey<T>;
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
    format: keyof EntityNameMappings = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    // Resolve table key and ensure it's a valid AutomationTableName
    const tableKey = resolveTableKey(tableNameVariant) as AutomationTableName;
    const table = globalCache.schema[tableKey];
    if (!table) return fieldNameVariant;

    // Resolve field key with the known table type
    const fieldKey = resolveFieldKey(tableKey, fieldNameVariant);
    const field = table.entityFields[fieldKey];
    if (!field) return fieldNameVariant;

    // Access the field name mapping
    return field.fieldNameMappings[format] || fieldNameVariant;
}

// Alternative version with stronger typing
export function getFieldNameStrict<T extends AutomationTableName>(
    tableNameVariant: string | T,
    fieldNameVariant: string,
    format: keyof EntityNameMappings = 'frontend'
): string {
    if (!globalCache) throw new Error('Schema system not initialized');

    // Resolve table key with type safety
    const tableKey = resolveTableKey(tableNameVariant) as T;
    const table = globalCache.schema[tableKey];
    if (!table) return fieldNameVariant;

    // Resolve field key with strict typing
    const fieldKey = resolveFieldKey(tableKey, fieldNameVariant);
    const field = table.entityFields[fieldKey];
    if (!field) return fieldNameVariant;

    return field.fieldNameMappings[format] || fieldNameVariant;
}

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
    tableNameVariant: string
): AutomationTableName {
    const resolved = resolveTableKey(tableNameVariant);
    if (!isValidTable(resolved)) {
        throw new Error(`Invalid table name: ${tableNameVariant}`);
    }
    return resolved;
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

export type ClientSchema = {
    schema: AutomationTableStructure;
    lookups: {
        tables: Record<string, AutomationTableName>;
        fields: Record<AutomationTableName, Record<string, StringFieldKey<AutomationTableName>>>;
    };
};


/**
 * Generates the client-side schema bundle
 */
export function generateClientSchema(): ClientSchema {
    if (!globalCache) throw new Error('Schema system not initialized');

    // Type assertion to ensure correct typing of Map conversions
    const tables = Object.fromEntries(globalCache.tableNameMap) as Record<string, AutomationTableName>;

    const fields = Object.fromEntries(
        Array.from(globalCache.fieldNameMap.entries()).map(
            ([table, fields]) => [
                table,
                Object.fromEntries(fields) as Record<string, StringFieldKey<typeof table>>
            ]
        )
    ) as Record<AutomationTableName, Record<string, StringFieldKey<AutomationTableName>>>;

    return {
        schema: globalCache.schema,
        lookups: {tables, fields}
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
    const totalFieldCount = fieldNameMapKeys.reduce((acc, tableName) => acc + Object.keys(fieldNameMap[tableName]).length, 0);
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


import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";
import {tableNameLookup, fieldNameLookup} from "@/utils/schema/lookupSchema";
import {AutomationTable, TableSchemaStructure, AutomationTableStructure} from "@/types/automationTableTypes";
import {NameFormat} from "@/types/AutomationSchemaTypes";


export function initializeTableSchema(
    initialAutomationTableSchema: TableSchemaStructure
): AutomationTableStructure {
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

            updatedFields[fieldKey] = {
                fieldNameMappings: {
                    [fieldKey]: fieldNameMappings
                },
                value: field.defaultValue,
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



let globalSchemaCache: AutomationTableStructure | null = null;

/**
 * Initializes and caches the schema for subsequent use
 */
export function initializeSchema(schema: AutomationTableStructure): void {
    if (globalSchemaCache) return; // Only initialize once
    globalSchemaCache = schema;
}



/**
 * Gets complete table information
 */
export function getTable(tableName: string): AutomationTable | null {
    if (!globalSchemaCache) throw new Error('Schema not initialized');
    return globalSchemaCache[tableName] || null;
}

/**
 * Gets complete field information
 */
export function getField(
    tableName: string,
    fieldName: string
): AutomationTable['entityFields'][string] | null {
    if (!globalSchemaCache) throw new Error('Schema not initialized');

    const table = globalSchemaCache[tableName];
    if (!table) return null;

    return table.entityFields[fieldName] || null;
}

/**
 * Gets all relationships for a table
 */
export function getTableRelationships(tableName: string): AutomationTable['relationships'] | null {
    if (!globalSchemaCache) throw new Error('Schema not initialized');

    const table = globalSchemaCache[tableName];
    if (!table) return null;

    return table.relationships;
}

/**
 * Efficiently checks if a field exists in a table
 */
export function fieldExists(tableName: string, fieldName: string): boolean {
    if (!globalSchemaCache) throw new Error('Schema not initialized');
    return !!(globalSchemaCache[tableName]?.entityFields[fieldName]);
}

/**
 * Efficiently checks if a table exists in the schema
 */
export function tableExists(tableName: string): boolean {
    if (!globalSchemaCache) throw new Error('Schema not initialized');
    return !!globalSchemaCache[tableName];
}

/**
 * Gets all primary key fields for a table
 */
export function getPrimaryKeys(tableName: string): string[] {
    if (!globalSchemaCache) throw new Error('Schema not initialized');

    const table = globalSchemaCache[tableName];
    if (!table) return [];

    return Object.entries(table.entityFields)
        .filter(([_, field]) => field.isPrimaryKey)
        .map(([fieldName]) => fieldName);
}

/**
 * Gets all display fields for a table
 */
export function getDisplayFields(tableName: string): string[] {
    if (!globalSchemaCache) throw new Error('Schema not initialized');

    const table = globalSchemaCache[tableName];
    if (!table) return [];

    return Object.entries(table.entityFields)
        .filter(([_, field]) => field.isDisplayField)
        .map(([fieldName]) => fieldName);
}

/**
 * Force resets the schema cache (useful for testing)
 */
export function resetSchemaCache(): void {
    globalSchemaCache = null;
}

type UnifiedSchemaCache = {
    schema: AutomationTableStructure;
    tableNameMap: Map<string, string>;
    fieldNameMap: Map<string, Map<string, string>>;
};

// Global cache instance
let globalCache: UnifiedSchemaCache | null = null;

/**
 * Initializes the entire schema system with efficient caching
 */
export function initializeSchemaSystem(): UnifiedSchemaCache {
    if (globalCache) return globalCache;

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

    return globalCache;
}


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
 * Force resets the entire cache system (useful for testing)
 */
export function resetCache(): void {
    globalCache = null;
}

export function getFrontendTableName(tableName: string): string {
    for (const [frontend, schema] of Object.entries(initialAutomationTableSchema)) {
        if (Object.values(schema.entityNameVariations).includes(tableName)) {
            return frontend;
        }
    }
    return tableName;
}

export function getTableNameByFormat(tableName: string, nameFormat: string): string {
    for (const [key, schema] of Object.entries(initialAutomationTableSchema)) {
        if (schema.entityNameVariations[nameFormat] === tableName) {
            return key;
        }
    }
    return tableName;
}

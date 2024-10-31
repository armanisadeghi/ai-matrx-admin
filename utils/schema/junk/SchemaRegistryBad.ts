/*
// File: lib/schemaRegistry.ts

import {AutomationTableName, FieldDataType, NameFormat} from "@/types/AutomationSchemaTypes";
import {initialAutomationTableSchema} from "@/utils/schema/initialSchemas";
import {getGlobalCache, resolveTableKey, resolveTableName, StringFieldKey} from "@/utils/schema/precomputeUtil";
import {AutomationTable, EntityField, TableFields} from "@/types/automationTableTypes";// TODO

export interface ConversionOptions {
    maxDepth?: number;
    // Add more options as needed
}

function convertValue(value: any, converter: FieldDataType): any {
    switch (converter) {
        case 'string':
            return String(value);
        case 'number':
            return Number(value) || 0;
        case 'boolean':
            return Boolean(value);
        case 'array':
            return Array.isArray(value) ? value : [value];
        case 'object':
            return typeof value === 'object' && value !== null ? value : {};
        case 'null':
            return null;
        case 'undefined':
            return undefined;
        case 'function':
            return typeof value === 'function' ? value : () => {
            };
        case 'symbol':
            return typeof value === 'symbol' ? value : Symbol(value);
        case 'bigint':
            return typeof value === 'bigint' ? value : BigInt(value);
        case 'date':
            return value instanceof Date ? value : new Date(value);
        case 'map':
            return value instanceof Map ? value : new Map(Object.entries(value));
        case 'set':
            return value instanceof Set ? value : new Set(Array.isArray(value) ? value : [value]);
        case 'tuple':
            return Array.isArray(value) ? value : [value];
        case 'enum':
            return value;
        case 'union':
            return value;
        case 'intersection':
            return value;
        case 'literal':
            return value;
        case 'void':
            return undefined;
        case 'never':
            throw new Error('Cannot convert to never type');
        case 'any':
            return value;
        default:
            return value;
    }
}

export function getFrontendTableName(tableName: string): string {
    for (const [frontend, schema] of Object.entries(initialAutomationTableSchema)) {
        if (Object.values(schema.entityNameVariations).includes(tableName)) {
            return frontend;
        }
    }
    return tableName;
}

export function getDatabaseTableName(tableName: string): string {
    for (const [database, schema] of Object.entries(initialAutomationTableSchema)) {
        if (Object.values(schema.entityNameVariations).includes(tableName)) {
            return database;
        }
    }
    return tableName;
}

export function getBackendTableName(tableName: string): string {
    for (const [backend, schema] of Object.entries(initialAutomationTableSchema)) {
        if (Object.values(schema.entityNameVariations).includes(tableName)) {
            return backend;
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




// Enhanced core types for the conversion system
export interface ConversionOptions {
    includeRelationships?: boolean;
    skipValidation?: boolean;
    maxDepth?: number;
    currentDepth?: number;
    [key: string]: unknown;
}

// Strongly typed field converter
export interface FieldConverter<T extends AutomationTableName, V = unknown> {
    fieldNameMappings: {
        [K in NameFormat]?: string;
    };
    structure: {
        databaseTable: T;
        [key: string]: unknown;
    };
    value: V;
    dataType: string;
    [key: string]: unknown;
}

// Enhanced conversion params
export interface ConvertDataParams<T extends AutomationTableName> {
    data: Record<string, unknown>;
    sourceFormat: NameFormat;
    targetFormat: NameFormat;
    tableName: T;
    options?: ConversionOptions;
    processedEntities?: Set<string>;
}

// Type for converted data
export type ConvertedData<T extends AutomationTableName> = {
    [K in StringFieldKey<T>]: unknown;
} & {
    [key: string]: unknown;
};

export type RelatedData = {
    id: string | number;
} & Record<string, unknown>;

export type RelationshipResult<R extends AutomationTableName> =
    | RelatedData
    | ConvertedData<R>
    | Array<RelatedData | ConvertedData<R>>;

// Enhanced relationship handling with type safety
function handleSingleRelationship<
    T extends AutomationTableName,
    R extends AutomationTableName
>(
    item: unknown,
    field: EntityField,
    sourceFormat: NameFormat,
    targetFormat: NameFormat,
    options: ConversionOptions,
    processedEntities: Set<string>
): RelatedData | ConvertedData<R> {
    if (typeof item === 'string' || typeof item === 'number') {
        return { id: item };
    }

    if (typeof item === 'object' && item !== null) {
        const relatedTableName = field.databaseTable;
        if (!relatedTableName) {
            console.warn(`No database table specified for relationship: ${
                field.fieldNameMappings[targetFormat]
            }`);
            return item as ConvertedData<R>;
        }

        const resolvedTableName = resolveTableKey(relatedTableName);
        const entityId = (item as any).id || (item as any).p_id;

        if (
            entityId &&
            processedEntities.has(`${resolvedTableName}:${entityId}`)
        ) {
            return { id: entityId };
        }

        if (entityId) {
            if (options.currentDepth && options.maxDepth &&
                options.currentDepth >= options.maxDepth) {
                return { id: entityId };
            }
            processedEntities.add(`${resolvedTableName}:${entityId}`);
        }

        try {
            return convertData({
                data: item as Record<string, unknown>,
                sourceFormat,
                targetFormat,
                tableName: resolvedTableName as R,
                options: {
                    ...options,
                    currentDepth: (options.currentDepth || 0) + 1
                },
                processedEntities,
            });
        } catch (error) {
            console.warn(
                `Error converting related data for ${resolvedTableName}: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
            return item as ConvertedData<R>;
        }
    }

    return { id: String(item) };
}

// Enhanced relationship handler with array support
function handleRelationship<
    T extends AutomationTableName,
    R extends AutomationTableName
>(
    data: unknown,
    converter: FieldConverter<R>,
    sourceFormat: NameFormat,
    targetFormat: NameFormat,
    options: ConversionOptions,
    processedEntities: Set<string>
): ConvertedData<R> | ConvertedData<R>[] | { id: string | number } {
    if (Array.isArray(data)) {
        return data.map(item =>
            handleSingleRelationship<T, R>(
                item,
                converter,
                sourceFormat,
                targetFormat,
                options,
                processedEntities
            )
        );
    }

    return handleSingleRelationship<T, R>(
        data,
        converter,
        sourceFormat,
        targetFormat,
        options,
        processedEntities
    );
}

// Enhanced main conversion function
export function convertData<T extends AutomationTableName>(
    {
        data,
        sourceFormat,
        targetFormat,
        tableName,
        options = { maxDepth: 3, currentDepth: 0 },
        processedEntities = new Set(),
    }: ConvertDataParams<T>): ConvertedData<T> {
    const cache = getGlobalCache(['convertData']);
    if (!cache) return data as ConvertedData<T>;

    const schema = cache.schema[tableName];
    if (!schema) {
        console.warn(`No schema registered for table: ${tableName}`);
        return data as ConvertedData<T>;
    }

    const result: Record<string, unknown> = {};
    const processedKeys = new Set<string>();

    // Process fields based on schema
    Object.entries(schema.entityFields).forEach(([fieldName, field]) => {
        const sourceKey = field.fieldNameMappings[sourceFormat];
        const targetKey = field.fieldNameMappings[targetFormat];

        if (sourceKey && targetKey && sourceKey in data) {
            let value = data[sourceKey];

            if (value !== undefined) {
                if (
                    field.structure === 'foreignKey' ||
                    field.structure === 'inverseForeignKey'
                ) {
                    const relatedTableName = field.databaseTable as AutomationTableName;
                    value = handleRelationship(
                        value,
                        field
                    sourceFormat,
                        targetFormat,
                        options,
                        processedEntities
                );
                }

                result[targetKey] = value;
                processedKeys.add(sourceKey);
            }
        }
    });

    // Handle unmapped fields
    Object.entries(data).forEach(([key, value]) => {
        if (!processedKeys.has(key)) {
            result[key] = value;
        }
    });

    return result as ConvertedData<T>;
}

// Enhanced utility function for relationship field handling
export function handleRelationshipField<T extends AutomationTableName>(
    fieldName: StringFieldKey<T>,
    value: unknown,
    structureType: 'foreignKey' | 'inverseForeignKey',
    tableName: T,
    fieldSchema: EntityField
): {
    type: 'fk' | 'ifk';
    data: Record<string, unknown>;
    appData?: Record<string, unknown>;
    table: string;
    related_column?: string;
} {
    const relatedTable = fieldSchema.databaseTable;

    if (structureType === 'foreignKey') {
        if (Array.isArray(value)) {
            return {
                type: 'fk',
                data: { [fieldName]: value.map(v =>
                        typeof v === 'object' && v !== null && 'id' in v ? v.id : v
                    )},
                appData: { [`${fieldName}FkArray`]: value },
                table: relatedTable
            };
        }

        if (typeof value === 'string' || typeof value === 'number') {
            return {
                type: 'fk',
                data: { [fieldName]: value },
                appData: { [`${fieldName}Fk`]: value },
                table: relatedTable
            };
        }

        if (typeof value === 'object' && value !== null && 'id' in value) {
            return {
                type: 'fk',
                data: { [fieldName]: value.id },
                appData: { [`${fieldName}Object`]: value },
                table: relatedTable
            };
        }

        throw new Error(`Invalid value for foreign key field: ${fieldName}`);
    }

    if (structureType === 'inverseForeignKey') {
        return {
            type: 'ifk',
            table: relatedTable,
            data: value as Record<string, unknown>,
            related_column: `${fieldName}_id`
        };
    }

    throw new Error(`Unsupported structure type: ${structureType}`);
}

// Utility function with type safety
export function removeEmptyFields(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => {
            if (value === null || value === undefined || value === '' ||
                (typeof value === 'object' && Object.keys(value).length === 0)) {
                return false;
            }
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return true;
        })
    );
}

// Type-safe schema name retrieval
export function getRegisteredSchemaNames(
    format: NameFormat = 'database',
    trace: string[] = ['unknownCaller']
): string[] {
    trace = [...trace, 'getRegisteredSchemaNames'];
    const cache = getGlobalCache(trace);
    if (!cache) return [];

    return Object.values(cache.schema)
        .map(table => table.entityNameMappings[format])
        .filter((name): name is string => name !== undefined);
}

// // Main utility function
// export function processDataForInsert(tableName: TableName, dbData: Record<string, any>) {
//
//     const schema = getSchema(tableName, 'databaseName');
//     if (!schema) {
//         console.warn(`No schema found for table: ${tableName}. Returning original data.`);
//         return {
//             callMethod: 'simple',
//             processedData: dbData
//         };
//     }
//
//     const cleanedData = removeEmptyFields(dbData);
//     let result: Record<string, any> = {};
//     const relatedTables: Array<Record<string, any>> = [];
//     let hasForeignKey = false;
//     let hasInverseForeignKey = false;
//
//     for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
//         const dbKey = fieldSchema.fieldNameVariations['databaseName'];
//
//         if (cleanedData.hasOwnProperty(dbKey)) {
//             const value = cleanedData[dbKey];
//             const structureType = fieldSchema.structure.structure;
//
//             if (structureType === 'simple') {
//                 result[dbKey] = value;
//             } else if (structureType === 'foreignKey' || structureType === 'inverseForeignKey') {
//                 const relationship = handleRelationshipField(dbKey, value, structureType, tableName, fieldSchema);
//
//                 if (relationship.type === 'fk') {
//                     hasForeignKey = true;
//                     result = {...result, ...relationship.data}; // Add the exact db field
//                     result = {...result, ...relationship.appData}; // Add app-specific field (for internal use)
//                 } else if (relationship.type === 'ifk') {
//                     hasInverseForeignKey = true;
//                     relatedTables.push({
//                         table: relationship.table,
//                         data: relationship.data,
//                         related_column: relationship.related_column
//                     });
//                 }
//             } else {
//                 console.warn(`Unknown structure type for field ${fieldName}: ${structureType}. Skipping field.`);
//             }
//         }
//     }
//
//     let callMethod: string;
//     if (!hasForeignKey && !hasInverseForeignKey) {
//         callMethod = 'simple';
//     } else if (hasForeignKey && !hasInverseForeignKey) {
//         callMethod = 'fk';
//     } else if (!hasForeignKey && hasInverseForeignKey) {
//         callMethod = 'ifk';
//     } else {
//         callMethod = 'fkAndIfk';
//     }
//
//     if (relatedTables.length > 0) {
//         result.relatedTables = relatedTables;
//     }
//
//     return {
//         callMethod,
//         processedData: result
//     };
// }

class TableName {
}

export async function getRelationships(tableName: TableName, format: NameFormat = 'frontend'): Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null> {
    const schema = getSchema(tableName, format);
    if (!schema) {
        console.error(`Schema not found for table: ${tableName}`);
        return null;
    }
    let hasForeignKey = false;
    let hasInverseForeignKey = false;

    for (const field of Object.values(schema.fields)) {
        const structure = field.structure?.structure;

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





// export function getPrimaryKeyField(tableName: string): { fieldName: string; message: string } {
//     const schema = initialAutomationTableSchema[tableName];
//     if (!schema) {
//         return {
//             fieldName: "id",
//             message: `Table '${tableName}' not found in the schema registry. Returning default 'id'.`
//         };
//     }
//
//     const primaryKeyField = Object.entries(schema.entityFields).find(([_, field]) => field.isPrimaryKey);
//
//     if (primaryKeyField) {
//         const [fieldName, fieldData] = primaryKeyField;
//         return {
//             fieldName: fieldData.alts.database,
//             message: `Primary key '${fieldName}' found for table '${tableName}'.`
//         };
//     }
//     return {
//         fieldName: "id",
//         message: `No primary key found for table '${tableName}'. Returning default 'id'.`
//     };
// }
//
// export function getSchema(
//     tableName: string,
//     format: NameFormat = 'frontend'
// ): FrontendTableSchema | BackendTableSchema | DatabaseTableSchema | PrettyTableSchema | CustomTableSchema | undefined {
//     console.log(`getSchema called with tableName: ${tableName} and format: ${format}`);
//
//     const frontendTableName = getFrontendTableNameFromUnknown(tableName);
//
//     // Use the global schema registry to find the schema by frontend name
//     const schema = globalSchemaRegistry[frontendTableName];
//
//     if (!schema) {
//         console.warn(`No schema found for table name: ${tableName}`);
//         return undefined;
//     }
//
//     // Use precomputed format-specific schemas directly
//     const precomputedSchema = getPrecomputedFormat(schema, format);
//
//     if (!precomputedSchema) {
//         console.warn(`No schema found for table name: ${tableName} in format: ${format}`);
//         return undefined;
//     }
//
//     console.log(`Schema found for ${frontendTableName} in ${format} format.`);
//     return precomputedSchema as FrontendTableSchema | BackendTableSchema | DatabaseTableSchema | PrettyTableSchema | CustomTableSchema;
// }
//
//
// function applyFrontendFormat(schema: TableSchema): FrontendTableSchema {
//     const transformedFields = {};
//     for (const [fieldKey, field] of Object.entries(schema.fields)) {
//         transformedFields[fieldKey] = {
//             ...field,
//             frontendFieldName: field.alts.frontend
//         };
//     }
//     return {
//         ...schema,
//         frontendTableName: schema.name.frontend,
//         fields: transformedFields
//     };
// }
//
// function applyBackendFormat(schema: TableSchema): BackendTableSchema {
//     const transformedFields = {};
//     for (const [fieldKey, field] of Object.entries(schema.fields)) {
//         transformedFields[fieldKey] = {
//             ...field,
//             backendFieldName: field.alts.backend
//         };
//     }
//     return {
//         ...schema,
//         backendTableName: schema.name.backend,
//         fields: transformedFields
//     };
// }
//
// function applyDatabaseFormat(schema: TableSchema): DatabaseTableSchema {
//     const transformedFields = {};
//     for (const [fieldKey, field] of Object.entries(schema.fields)) {
//         transformedFields[fieldKey] = {
//             ...field,
//             databaseFieldName: field.alts.database
//         };
//     }
//     return {
//         ...schema,
//         databaseTableName: schema.name.database,
//         fields: transformedFields
//     };
// }
//
// function applyPrettyFormat(schema: TableSchema): PrettyTableSchema {
//     const transformedFields = {};
//     for (const [fieldKey, field] of Object.entries(schema.fields)) {
//         transformedFields[fieldKey] = {
//             ...field,
//             prettyFieldName: field.alts.pretty
//         };
//     }
//     return {
//         ...schema,
//         prettyTableName: schema.name.pretty,
//         fields: transformedFields
//     };
// }
//
// function applyCustomFormat(schema: TableSchema, customFormat: NameFormat): CustomTableSchema {
//     const customName = `custom_${schema.name[customFormat as keyof typeof schema.name] || schema.name.frontend}`;
//     const transformedFields = {};
//     for (const [fieldKey, field] of Object.entries(schema.fields)) {
//         transformedFields[fieldKey] = {
//             ...field,
//             customFieldName: field.alts[customFormat as keyof typeof field.alts] || field.alts.frontend,
//             customFormat
//         };
//     }
//     return {
//         ...schema,
//         customName,
//         customFormat,
//         fields: transformedFields
//     };
// }
//
//
// export function getApiWrapperSchemaFormats(
//     tableName: TableName
// ): ApiWrapperSchemaFormats | undefined {
//     console.log(`getApiWrapperSchemaFormats called for tableName: ${tableName}`);
//
//     const frontendTableName = getFrontendTableNameFromUnknown(tableName);
//
//     const schema = Object.values(globalSchemaRegistry).find(
//         (schema) => schema.entityNameVariations.frontend === frontendTableName
//     );
//
//     if (!schema) {
//         console.warn(`No schema found for table name: ${tableName}`);
//         return undefined;
//     }
//
//     console.log(`Schema found for ${frontendTableName}. Preparing frontend and database formats.`);
//
//     const frontendSchema = applyFrontendFormat(schema);
//     const databaseSchema = applyDatabaseFormat(schema);
//
//     return {
//         schema,
//         frontend: frontendSchema,
//         database: databaseSchema
//     };
// }



*/

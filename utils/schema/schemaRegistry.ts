// File: lib/schemaRegistry.ts

import {
    DataFormat,
    TableSchema,
    PrettyTableSchema,
    DatabaseTableSchema,
    BackendTableSchema,
    FrontendTableSchema,
    CustomTableSchema, TableName, DataType, DataStructure,
} from "@/types/tableSchemaTypes";
import {ApiWrapperSchemaFormats} from "@/utils/supabase/api-wrapper";

export const globalSchemaRegistry: Record<string, TableSchema> = {};

export function registerSchema(frontendName: string, tableSchema: TableSchema) {
    globalSchemaRegistry[frontendName] = tableSchema;
}

export function initializeSchemas() {
    console.log("Registered schemas:", Object.keys(globalSchemaRegistry));
}

export interface ConversionOptions {
    maxDepth?: number;
    // Add more options as needed
}

function convertValue(value: any, converter: FieldConverter<any>): any {
    switch (converter.type) {
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

export function getFrontendTableName(tableName: TableName, format: DataFormat): TableName {
    const availableNames: { [key: string]: string[] } = {};

    for (const [frontendName, schema] of Object.entries(globalSchemaRegistry)) {
        for (const [key, name] of Object.entries(schema.name)) {
            if (name === tableName) {
                return frontendName;  // Return the matching frontend name if found
            }
            if (!availableNames[key]) {
                availableNames[key] = [];
            }
            if (typeof name === 'string') {
                availableNames[key].push(name);  // Add the name to available names if it's a string
            }
        }
    }

    console.warn(`Table name not found in registry: ${tableName}`);
    for (const [key, names] of Object.entries(availableNames)) {
        console.warn(`Available names in format '${key}': ${names.join(', ')}`);
    }

    return tableName;
}


export function getPrimaryKeyField(tableName: TableName): { fieldName: string; message: string } {
    const schema = globalSchemaRegistry[tableName];
    if (!schema) {
        return {
            fieldName: "id",
            message: `Table '${tableName}' not found in the schema registry. Returning default 'id'.`
        };
    }

    const primaryKeyField = Object.entries(schema.fields).find(([_, field]) => field.isPrimaryKey);

    if (primaryKeyField) {
        const [fieldName, fieldData] = primaryKeyField;
        return {
            fieldName: fieldData.alts.database,
            message: `Primary key '${fieldName}' found for table '${tableName}'.`
        };
    }
    return {
        fieldName: "id",
        message: `No primary key found for table '${tableName}'. Returning default 'id'.`
    };
}

export function getSchema(
    tableName: TableName,
    format: DataFormat = 'frontend'
): FrontendTableSchema | BackendTableSchema | DatabaseTableSchema | PrettyTableSchema | CustomTableSchema | undefined {
    console.log(`getSchema called with tableName: ${tableName} and format: ${format}`);

    const frontendTableName = getFrontendTableNameFromUnknown(tableName);

    for (const [schemaKey, schema] of Object.entries(globalSchemaRegistry)) {
        if (schema.name.frontend === frontendTableName) {
            console.log(`Schema found for ${frontendTableName}. Attempting to return schema in ${format} format.`);

            switch (format) {
                case 'frontend':
                    return applyFrontendFormat(schema) as FrontendTableSchema;
                case 'backend':
                    return applyBackendFormat(schema) as BackendTableSchema;
                case 'database':
                    return applyDatabaseFormat(schema) as DatabaseTableSchema;
                case 'pretty':
                    return applyPrettyFormat(schema) as PrettyTableSchema;
                default:
                    console.log(`Custom format requested: ${format}.`);
                    return applyCustomFormat(schema, format) as CustomTableSchema;
            }
        }
    }
    console.warn(`No schema found for table name: ${tableName}`);
    return undefined;
}


function applyFrontendFormat(schema: TableSchema): FrontendTableSchema {
    const transformedFields = {};
    for (const [fieldKey, field] of Object.entries(schema.fields)) {
        transformedFields[fieldKey] = {
            ...field,
            frontendFieldName: field.alts.frontend
        };
    }
    return {
        ...schema,
        frontendTableName: schema.name.frontend,
        fields: transformedFields
    };
}

function applyBackendFormat(schema: TableSchema): BackendTableSchema {
    const transformedFields = {};
    for (const [fieldKey, field] of Object.entries(schema.fields)) {
        transformedFields[fieldKey] = {
            ...field,
            backendFieldName: field.alts.backend
        };
    }
    return {
        ...schema,
        backendTableName: schema.name.backend,
        fields: transformedFields
    };
}

function applyDatabaseFormat(schema: TableSchema): DatabaseTableSchema {
    const transformedFields = {};
    for (const [fieldKey, field] of Object.entries(schema.fields)) {
        transformedFields[fieldKey] = {
            ...field,
            databaseFieldName: field.alts.database
        };
    }
    return {
        ...schema,
        databaseTableName: schema.name.database,
        fields: transformedFields
    };
}

function applyPrettyFormat(schema: TableSchema): PrettyTableSchema {
    const transformedFields = {};
    for (const [fieldKey, field] of Object.entries(schema.fields)) {
        transformedFields[fieldKey] = {
            ...field,
            prettyFieldName: field.alts.pretty
        };
    }
    return {
        ...schema,
        prettyTableName: schema.name.pretty,
        fields: transformedFields
    };
}

function applyCustomFormat(schema: TableSchema, customFormat: DataFormat): CustomTableSchema {
    const customName = `custom_${schema.name[customFormat as keyof typeof schema.name] || schema.name.frontend}`;
    const transformedFields = {};
    for (const [fieldKey, field] of Object.entries(schema.fields)) {
        transformedFields[fieldKey] = {
            ...field,
            customFieldName: field.alts[customFormat as keyof typeof field.alts] || field.alts.frontend,
            customFormat
        };
    }
    return {
        ...schema,
        customName,
        customFormat,
        fields: transformedFields
    };
}


export function getApiWrapperSchemaFormats(
    tableName: TableName
): ApiWrapperSchemaFormats | undefined {
    console.log(`getApiWrapperSchemaFormats called for tableName: ${tableName}`);

    const frontendTableName = getFrontendTableNameFromUnknown(tableName);

    const schema = Object.values(globalSchemaRegistry).find(
        (schema) => schema.name.frontend === frontendTableName
    );

    if (!schema) {
        console.warn(`No schema found for table name: ${tableName}`);
        return undefined;
    }

    console.log(`Schema found for ${frontendTableName}. Preparing frontend and database formats.`);

    const frontendSchema = applyFrontendFormat(schema);
    const databaseSchema = applyDatabaseFormat(schema);

    return {
        schema,
        frontend: frontendSchema,
        database: databaseSchema
    };
}






function handleSingleRelationship(
    item: any,
    converter: FieldConverter<any>,
    sourceFormat: DataFormat,
    targetFormat: DataFormat,
    options: ConversionOptions,
    processedEntities: Set<string>
): any {
    if (typeof item === 'string') {
        return { id: item };
    } else if (typeof item === 'object' && item !== null) {
        const relatedTableName = converter.structure.databaseTable;
        if (!relatedTableName) {
            console.warn(`No database table specified for relationship: ${converter.alts[targetFormat]}`);
            return item;
        }

        const frontendTableName = getFrontendTableName(relatedTableName, 'database');
        const entityId = item.id || item.p_id;
        if (entityId && processedEntities.has(`${frontendTableName}:${entityId}`)) {
            return { id: entityId };
        }

        if (entityId) {
            processedEntities.add(`${frontendTableName}:${entityId}`);
        }

        try {
            return convertData({
                data: item,
                sourceFormat: sourceFormat,
                targetFormat: targetFormat,
                tableName: frontendTableName,
                options: options,
                processedEntities: processedEntities,
            });
        } catch (error) {
            if (error instanceof Error) {
                console.warn(`Error converting related data for ${frontendTableName}: ${error.message}`);
            } else {
                console.warn(`Unknown error converting related data for ${frontendTableName}`);
            }
            return item;
        }
    }
    return item;
}

function handleRelationship(
    data: any,
    converter: FieldConverter<any>,
    sourceFormat: DataFormat,
    targetFormat: DataFormat,
    options: ConversionOptions,
    processedEntities: Set<string>
): any {
    if (Array.isArray(data)) {
        return data.map(item => handleSingleRelationship(item, converter, sourceFormat, targetFormat, options, processedEntities));
    } else {
        return handleSingleRelationship(data, converter, sourceFormat, targetFormat, options, processedEntities);
    }
}


interface ConvertDataParams {
    data: any;
    sourceFormat: DataFormat;
    targetFormat: DataFormat;
    tableName: TableName;
    options?: ConversionOptions;
    processedEntities?: Set<string>;
}

export function convertData(
    {
        data,
        sourceFormat,
        targetFormat,
        tableName,
        options = {},
        processedEntities = new Set(),
    }: ConvertDataParams): any {
    const frontendTableName = getFrontendTableName(tableName, sourceFormat);
    const schema = globalSchemaRegistry[frontendTableName];
    if (!schema) {
        console.warn(`No schema registered for table: ${frontendTableName}. Returning original data.`);
        return data;
    }

    const result: any = {};
    const processedKeys: Set<string> = new Set();

    for (const [fieldName, converter] of Object.entries(schema.fields)) {
        const sourceKey = converter.alts[sourceFormat];
        const targetKey = converter.alts[targetFormat];

        if (sourceKey && targetKey && data.hasOwnProperty(sourceKey)) {
            let value = data[sourceKey];

            if (value !== undefined) {
                if (converter.structure.structure === 'foreignKey' || converter.structure.structure === 'inverseForeignKey') {
                    value = handleRelationship(value, converter, sourceFormat, targetFormat, options, processedEntities);
                } else {
                    value = convertValue(value, converter);
                }

                result[targetKey] = value;
                processedKeys.add(sourceKey);
            }
        }
    }

    for (const [key, value] of Object.entries(data)) {
        if (!processedKeys.has(key)) {
            result[key] = value;
        }
    }

    return result;
}


function getFrontendTableNameFromUnknown(tableName: TableName): string {
    console.log(`getFrontendTableName called with tableName: ${tableName}`);

    if (!globalSchemaRegistry) {
        console.error("Error: Global schema registry is not defined or unavailable.");
        return tableName;
    }

    for (const [schemaKey, schema] of Object.entries(globalSchemaRegistry)) {
        for (const [format, name] of Object.entries(schema.name)) {
            if (name === tableName) {
                console.log(`Match found: ${tableName} (${format}) maps to frontend name: ${schema.name.frontend}`);
                return schema.name.frontend;
            }
        }
    }

    console.warn(`No matching schema found for: ${tableName}`);
    console.log("Available schemas and their names:");
    for (const [schemaKey, schema] of Object.entries(globalSchemaRegistry)) {
        console.log(`  ${schemaKey}:`);
        for (const [format, name] of Object.entries(schema.name)) {
            console.log(`    ${format}: ${name}`);
        }
    }

    return tableName;
}


export function getRegisteredSchemaNames(format: DataFormat = 'database'): Array<AltOptions[typeof format]> {
    const schemaNames: Array<AltOptions[typeof format]> = [];

    for (const schema of Object.values(globalSchemaRegistry)) {
        const schemaName = schema.name[format];
        if (schemaName) {
            schemaNames.push(schemaName);
        }
    }

    return schemaNames;
}




function removeEmptyFields(obj: Record<string, any>): Record<string, any> {
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
function handleRelationshipField(fieldName: string, value: any, structureType: string, tableName: string, fieldSchema: any) {
    // Get the related table name from the schema structure
    const relatedTable = fieldSchema.structure.databaseTable;

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


// Main utility function
export function processDataForInsert(tableName: TableName, dbData: Record<string, any>) {
    const schema = getSchema(tableName, 'database');
    if (!schema) {
        console.warn(`No schema found for table: ${tableName}. Returning original data.`);
        return {
            callMethod: 'simple',
            processedData: dbData
        };
    }

    const cleanedData = removeEmptyFields(dbData);
    let result: Record<string, any> = {};
    const relatedTables: Array<Record<string, any>> = [];
    let hasForeignKey = false;
    let hasInverseForeignKey = false;

    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
        const dbKey = fieldSchema.alts['database'];

        if (cleanedData.hasOwnProperty(dbKey)) {
            const value = cleanedData[dbKey];
            const structureType = fieldSchema.structure.structure;

            if (structureType === 'simple') {
                result[dbKey] = value;
            } else if (structureType === 'foreignKey' || structureType === 'inverseForeignKey') {
                const relationship = handleRelationshipField(dbKey, value, structureType, tableName, fieldSchema);

                if (relationship.type === 'fk') {
                    hasForeignKey = true;
                    result = {...result, ...relationship.data}; // Add the exact db field
                    result = {...result, ...relationship.appData}; // Add app-specific field (for internal use)
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

export async function getRelationships(tableName: TableName, format: DataFormat = 'frontend'): Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null> {
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







const TypeBrand = Symbol('TypeBrand');

export type TypeBrand<T> = { [TypeBrand]: T };

export interface FieldStructure<T> {
    structure: 'simple' | 'foreignKey' | 'inverseForeignKey';
    databaseTable?: string;
    typeReference: TypeBrand<T>;
}

export interface AltOptions {
    frontend: string;
    backend: string;
    database: string;
    pretty: string;
    [key: string]: string;
}

export interface FieldConverter<T> {
    alts: AltOptions;
    type: DataType;
    format: DataStructure;
    structure: FieldStructure<T>;
}

export type ConverterMap = {
    [key: string]: FieldConverter<any>;
};

export interface SchemaRegistry {
    [tableName: string]: TableSchema;
}


export function createTypeReference<T>(): TypeBrand<T> {
    return {} as TypeBrand<T>;
}

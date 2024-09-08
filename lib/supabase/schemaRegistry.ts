// File: lib/schemaRegistry.ts

export type DataFormat = 'frontend' | 'backend' | 'database' | 'graphql' | 'restApi';

type DataType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'null'
    | 'undefined'
    | 'any'
    | 'function'
    | 'symbol'
    | 'bigint'
    | 'date'
    | 'map'
    | 'set'
    | 'tuple'
    | 'enum'
    | 'union'
    | 'intersection'
    | 'literal'
    | 'void'
    | 'never';

export type ConversionFormat = 'single' | 'array' | 'object';
export type StructureType = 'simple' | 'foreignKey' | 'inverseForeignKey';

const TypeBrand = Symbol('TypeBrand');
export type TypeBrand<T> = { [TypeBrand]: T };

export interface FieldStructure<T> {
    structure: StructureType;
    databaseTable?: string;
    typeReference: TypeBrand<T>;
}

export interface AltOptions {
    frontend: string;
    backend: string;
    database: string;
    [key: string]: string; // Allow for additional naming conventions
}

export interface FieldConverter<T> {
    alts: AltOptions;
    type: DataType;
    format: ConversionFormat;
    structure: FieldStructure<T>;
}

export type ConverterMap = {
    [key: string]: FieldConverter<any>;
};

export interface TableSchema {
    name: AltOptions;
    fields: ConverterMap;
}

export interface SchemaRegistry {
    [tableName: string]: TableSchema;
}

export function createTypeReference<T>(): TypeBrand<T> {
    return {} as TypeBrand<T>;
}

const globalSchemaRegistry: SchemaRegistry = {};

export function registerSchema(frontendName: string, tableSchema: TableSchema) {
    globalSchemaRegistry[frontendName] = tableSchema;
}

export interface ConversionOptions {
    maxDepth?: number;
    // Add more options as needed
}

function convertValue(value: any, converter: FieldConverter<any>): any {
    switch (converter.type) {
        case 'string': return String(value);
        case 'number': return Number(value) || 0;
        case 'boolean': return Boolean(value);
        case 'array': return Array.isArray(value) ? value : [value];
        case 'object': return typeof value === 'object' && value !== null ? value : {};
        case 'null': return null;
        case 'undefined': return undefined;
        case 'function': return typeof value === 'function' ? value : () => {};
        case 'symbol': return typeof value === 'symbol' ? value : Symbol(value);
        case 'bigint': return typeof value === 'bigint' ? value : BigInt(value);
        case 'date': return value instanceof Date ? value : new Date(value);
        case 'map': return value instanceof Map ? value : new Map(Object.entries(value));
        case 'set': return value instanceof Set ? value : new Set(Array.isArray(value) ? value : [value]);
        case 'tuple': return Array.isArray(value) ? value : [value];
        case 'enum': return value;
        case 'union': return value;
        case 'intersection': return value;
        case 'literal': return value;
        case 'void': return undefined;
        case 'never': throw new Error('Cannot convert to never type');
        case 'any': return value;
        default: return value;
    }
}

function getFrontendTableName(tableName: string, format: DataFormat): string {
    for (const [frontendName, schema] of Object.entries(globalSchemaRegistry)) {
        if (schema.name[format] === tableName) {
            return frontendName;
        }
    }
    console.warn(`Table name not found in registry: ${tableName}`);
    return tableName;
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
            return convertData(item, sourceFormat, targetFormat, frontendTableName, options, processedEntities);
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

export function convertData(
    data: any,
    sourceFormat: DataFormat,
    targetFormat: DataFormat,
    tableName: string,
    options: ConversionOptions = {},
    processedEntities: Set<string> = new Set()
): any {
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

        if (data.hasOwnProperty(sourceKey)) {
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

export function getSchema(tableName: string, format: DataFormat = 'frontend'): TableSchema | undefined {
    return globalSchemaRegistry[getFrontendTableName(tableName, format)];
}

export type InferSchemaType<T extends TableSchema> = {
    [K in keyof T['fields']]: T['fields'][K] extends FieldConverter<infer U> ? U : never;
};

export function initializeSchemas() {
    console.log("Registered schemas:", Object.keys(globalSchemaRegistry));
}

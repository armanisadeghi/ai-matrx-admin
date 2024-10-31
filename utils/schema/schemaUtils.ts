// File: lib/schemaUtils.ts

import {v4 as uuidv4} from "uuid";
import {AutomationTableName, FieldDataOptionsType, NameFormat} from "@/types/AutomationSchemaTypes";
import {getGlobalCache} from "@/utils/schema/precomputeUtil";

import {FieldDataType} from "@/types/entityTypes";
import {
    entityNameFormats,
    entityNameToCanonical,
    fieldNameFormats,
    fieldNameToCanonical
} from "@/utils/schema/lookupSchema";
// Types for the transformation system
export type DataValue = any;
export type DataObject = Record<string, DataValue>;
export type DataArray = DataValue[];

// Refined conversion types
export interface ConversionOptions {
    includeRelationships?: boolean;
    skipValidation?: boolean;

    [key: string]: any;
}

export interface ConvertDataParams<T extends AutomationTableName> {
    data: DataObject | DataArray;
    sourceFormat: NameFormat;
    targetFormat: NameFormat;
    tableName: T;
    options?: ConversionOptions;
    processedEntities?: Set<string>;
}

// Main conversion function
export function convertData<T extends AutomationTableName>(
    {
        data,
        sourceFormat,
        targetFormat,
        tableName,
        options = {},
        processedEntities = new Set(),
    }: ConvertDataParams<T>): DataObject | DataArray {
    // Handle arrays of data
    if (Array.isArray(data)) {
        return data.map(item =>
            convertData({
                data: item,
                sourceFormat,
                targetFormat,
                tableName,
                options,
                processedEntities
            })
        );
    }

    const cache = getGlobalCache(['convertData']);
    if (!cache) return data;

    const schema = cache.schema[tableName];
    if (!schema) {
        console.warn(`No schema registered for table: ${tableName}. Returning original data.`);
        return data;
    }

    const result: DataObject = {};
    const processedKeys: Set<string> = new Set();

    // Process fields based on schema
    Object.entries(schema.entityFields).forEach(([fieldName, field]) => {
        const sourceKey = field.fieldNameFormats[sourceFormat];
        const targetKey = field.fieldNameFormats[targetFormat];

        if (sourceKey && targetKey && sourceKey in data) {
            let value = data[sourceKey];

            if (value !== undefined) {
                if (field.structure === 'single') {
                    // Handle simple field conversion
                    value = convertValue(value, field.dataType);
                } else if (field.structure === 'foreignKey' || field.structure === 'inverseForeignKey') {
                    // Handle nested relationship data
                    const relatedTableName = field.databaseTable;
                    if (!relatedTableName) {
                        console.warn(`No database table specified for relationship: ${targetKey}`);
                        value = data[sourceKey];
                    } else {
                        value = handleNestedData(
                            value,
                            relatedTableName,
                            sourceFormat,
                            targetFormat,
                            options,
                            processedEntities
                        );
                    }
                }

                result[targetKey] = value;
                processedKeys.add(sourceKey);
            }
        }
    });

    // Copy over any unprocessed fields
    Object.entries(data).forEach(([key, value]) => {
        if (!processedKeys.has(key)) {
            result[key] = value;
        }
    });

    return result;
}

// Handle nested relationship data
function handleNestedData(
    value: DataValue,
    relatedTableName: string,
    sourceFormat: NameFormat,
    targetFormat: NameFormat,
    options: ConversionOptions,
    processedEntities: Set<string>
): DataValue {
    // Handle array of related items
    if (Array.isArray(value)) {
        return value.map(item =>
            handleSingleNestedItem(
                item,
                relatedTableName,
                sourceFormat,
                targetFormat,
                options,
                processedEntities
            )
        );
    }

    // Handle single related item
    return handleSingleNestedItem(
        value,
        relatedTableName,
        sourceFormat,
        targetFormat,
        options,
        processedEntities
    );
}

// Handle a single nested item
function handleSingleNestedItem(
    item: DataValue,
    relatedTableName: string,
    sourceFormat: NameFormat,
    targetFormat: NameFormat,
    options: ConversionOptions,
    processedEntities: Set<string>
): DataValue {
    // Handle simple ID reference
    if (typeof item === 'string' || typeof item === 'number') {
        return {id: item};
    }

    // Handle nested object
    if (typeof item === 'object' && item !== null) {
        const resolvedTableName = resolveTableName(relatedTableName);
        const entityId = item.id || item.p_id;

        // Prevent circular references
        if (entityId && processedEntities.has(`${resolvedTableName}:${entityId}`)) {
            return {id: entityId};
        }

        if (entityId) {
            processedEntities.add(`${resolvedTableName}:${entityId}`);
        }

        // Process nested object recursively
        return convertData({
            data: item,
            sourceFormat,
            targetFormat,
            tableName: resolvedTableName,
            options,
            processedEntities
        });
    }

    return item;
}

// Value conversion with proper typing
export function convertValue(value: DataValue, dataType: FieldDataOptionsType): DataValue {
    if (value === null || value === undefined) {
        return value;
    }

    try {
        switch (dataType) {
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
                return value;
            case 'any':
                return value;
            default:
                return value;
        }
    } catch (error) {
        console.warn(`Error converting value to ${dataType}:`, error);
        return value;
    }
}


// Type-safe schema retrieval
export function getSchemaForTable<T extends AutomationTableName>(
    tableName: T,
    trace: string[] = ['unknownCaller']
): AutomationTable | null {
    const cache = getGlobalCache(trace);
    if (!cache) return null;

    const schema = cache.schema[tableName];
    if (!schema) {
        console.warn(`No schema registered for table: ${tableName}`);
        return null;
    }

    return schema;
}

// Utility function to get field information
interface FieldInfo {
    name: string;
    pretty: string;
    type: string;
    structure?: string;
}

// Updated utility functions with new schema system
export function generateJsonTemplate(tableName: AutomationTableName): Record<string, any> {
    const schema = getSchemaForTable(tableName, ['generateJsonTemplate']);
    if (!schema) return {};

    const result: Record<string, any> = {};

    Object.entries(schema.entityFields).forEach(([fieldName, field]) => {
        result[fieldName] = initializeFieldValue(field.dataType);
    });

    return result;
}

export function initializeFieldValue(dataType: FieldDataType): any {
    switch (dataType) {
        case 'string':
            return '';
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'array':
            return [];
        case 'object':
            return {};
        case 'null':
            return null;
        case 'undefined':
            return undefined;
        case 'function':
            return () => {
            };
        case 'symbol':
            return Symbol();
        case 'bigint':
            return BigInt(0);
        case 'date':
            return new Date();
        case 'map':
            return new Map();
        case 'set':
            return new Set();
        case 'tuple':
            return [];
        case 'enum':
        case 'union':
        case 'intersection':
        case 'literal':
        case 'void':
        case 'any':
            return null; // or a default value if specific to your case
        case 'never':
            return null; // or a default value if specific to your case
        default:
            return null;
    }
}

// Get pretty name for table
export function getPrettyNameForTable(tableName: AutomationTableName): string | undefined {
    const schema = getSchemaForTable(tableName, ['getPrettyNameForTable']);
    return schema?.entityNameMappings.pretty;
}

// Get all non-relationship fields
export function getNonFkFields(tableName: AutomationTableName): FieldInfo[] {
    const schema = getSchemaForTable(tableName, ['getNonFkFields']);
    if (!schema) return [];

    return Object.entries(schema.entityFields)
        .filter(([_, field]) => field.structure === 'single')
        .map(([_, field]) => ({
            name: field.fieldNameVariations.frontend,
            pretty: field.fieldNameVariations.pretty,
            type: field.dataType
        }));
}

// Get foreign key fields
export function getForeignKeys(tableName: AutomationTableName): FieldInfo[] {
    const schema = getSchemaForTable(tableName, ['getForeignKeys']);
    if (!schema) return [];

    return Object.entries(schema.entityFields)
        .filter(([_, field]) => field.structure === 'foreignKey')
        .map(([_, field]) => ({
            name: field.fieldNameVariations.frontend,
            pretty: field.fieldNameVariations.pretty,
            type: field.dataType
        }));
}

// Get inverse foreign key fields
export function getInverseForeignKeys(tableName: AutomationTableName): FieldInfo[] {
    const schema = getSchemaForTable(tableName, ['getInverseForeignKeys']);
    if (!schema) return [];

    return Object.entries(schema.entityFields)
        .filter(([_, field]) => field.structure === 'inverseForeignKey')
        .map(([_, field]) => ({
            name: field.fieldNameVariations.frontend,
            pretty: field.fieldNameVariations.pretty,
            type: field.dataType
        }));
}

// Get all relationship fields
export function getAllKeys(tableName: AutomationTableName): FieldInfo[] {
    const schema = getSchemaForTable(tableName, ['getAllKeys']);
    if (!schema) return [];

    return Object.entries(schema.entityFields)
        .filter(([_, field]) =>
            field.structure === 'foreignKey' || field.structure === 'inverseForeignKey'
        )
        .map(([_, field]) => ({
            name: field.fieldNameVariations.frontend,
            pretty: field.fieldNameVariations.pretty,
            type: field.dataType,
            structure: field.structure
        }));
}

// Get all fields with their structure
export function getAllFields(tableName: AutomationTableName): FieldInfo[] {
    const schema = getSchemaForTable(tableName, ['getAllFields']);
    if (!schema) return [];

    return Object.entries(schema.entityFields).map(([_, field]) => ({
        name: field.fieldNameVariations.frontend,
        pretty: field.fieldNameVariations.pretty,
        type: field.dataType,
        structure: field.structure
    }));
}

export type DataWithOptionalId = { id?: string; [key: string]: any };
export type DataWithId = { id: string; [key: string]: any };

export function ensureId<T extends DataWithOptionalId | DataWithOptionalId[]>(input: T):
    T extends DataWithOptionalId[] ? DataWithId[] : DataWithId {
    if (Array.isArray(input)) {
        return input.map((item) => ({
            ...item,
            id: item.id ?? uuidv4(),
        })) as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
    } else {
        if ('id' in input && typeof input.id === 'string') {
            return input as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
        }
        return {...input, id: uuidv4()} as unknown as T extends DataWithOptionalId[] ? DataWithId[] : DataWithId;
    }
}


// Legacy table name resolution (for backward compatibility)
export function resolveTableNameOld(
    table: AutomationTableName,
    variant: NameFormat
): string | undefined {
    const schema = getSchemaForTable(table, ['resolveTableNameOld']);
    return schema?.entityNameMappings[variant];
}



type KeyMapping = { [oldKey: string]: string };

/**
 * Replaces keys in an object or array of objects based on a provided key mapping.
 * @param data - The object or array of objects to transform.
 * @param keyMapping - A mapping of old keys to new keys for replacement.
 * @returns The transformed object or array with updated keys.
 */
function replaceKeysInObject<T extends Record<string, any>>(
    data: T | T[],
    keyMapping: KeyMapping
): T | T[] {
    const replaceKeys = (obj: T): T => {
        return Object.keys(obj).reduce((acc, key) => {
            const newKey = keyMapping[key] || key;
            (acc as Record<string, any>)[newKey] = obj[key];
            return acc;
        }, {} as T);
    };

    if (Array.isArray(data)) {
        return data.map(replaceKeys);
    }

    return replaceKeys(data);
}

/**
 * Converts entity names in an object or array of objects to their canonical form.
 * @param data - The object or array of objects to transform.
 * @returns The transformed data with entity names in canonical format.
 */
export function convertEntityName<T extends Record<string, any>>(data: T | T[]): T | T[] {
    return replaceKeysInObject(data, entityNameToCanonical);
}

/**
 * Converts field names in an object or array of objects to their canonical form based on entity type.
 * @param data - The object or array of objects to transform.
 * @param entityName - The name of the entity to determine the correct field name mapping.
 * @returns The transformed data with field names in canonical format for the specified entity.
 */
export function convertFieldNames<T extends Record<string, any>>(
    data: T | T[],
    entityName: string
): T | T[] {
    const keyMapping = fieldNameToCanonical[entityName];
    if (!keyMapping) {
        throw new Error(`No mapping found for entity: ${entityName}`);
    }
    return replaceKeysInObject(data, keyMapping);
}

/**
 * Generates a mapping from canonical entity names to a specified format for all entities.
 * @param format - The target format for the entity names.
 * @returns An object mapping canonical entity names to the specified format.
 */
export function getEntityNameFormatMap(format: string): Record<string, string> {
    const formatMap: Record<string, string> = {};

    for (const [canonicalName, formats] of Object.entries(entityNameFormats)) {
        if (formats[format]) {
            formatMap[canonicalName] = formats[format];
        } else {
            console.warn(`Format "${format}" not found for entity "${canonicalName}".`);
        }
    }
    return formatMap;
}

/**
 * Converts entity names in an object or array of objects to a specified format.
 * @param data - The object or array of objects to transform.
 * @param format - The target format for entity names.
 * @returns The transformed data with entity names in the specified format.
 */
export function convertEntityNameFormat<T extends Record<string, any>>(
    data: T | T[],
    format: string
): T | T[] {
    const formatMap = getEntityNameFormatMap(format);
    return replaceKeysInObject(data, formatMap);
}

/**
 * Generates a mapping from canonical field names to a specified format for a specific entity.
 * @param entityName - The name of the entity to determine the correct field mappings.
 * @param format - The target format for the field names.
 * @returns An object mapping canonical field names to the specified format for the given entity.
 */
export function getFieldNameFormatMap(entityName: string, format: string): Record<string, string> {
    const entityFormats = fieldNameFormats[entityName];
    if (!entityFormats) {
        throw new Error(`No field formats found for entity: ${entityName}`);
    }

    const formatMap: Record<string, string> = {};
    for (const [canonicalField, formats] of Object.entries(entityFormats)) {
        if (formats[format]) {
            formatMap[canonicalField] = formats[format];
        } else {
            console.warn(`Format "${format}" not found for field "${canonicalField}" in entity "${entityName}".`);
        }
    }
    return formatMap;
}

/**
 * Converts field names in an object or array of objects to a specified format for a specific entity.
 * @param data - The object or array of objects to transform.
 * @param entityName - The name of the entity to determine the correct field mappings.
 * @param format - The target format for the field names.
 * @returns The transformed data with field names in the specified format for the given entity.
 */
export function convertFieldNameFormat<T extends Record<string, any>>(
    data: T | T[],
    entityName: string,
    format: string
): T | T[] {
    const formatMap = getFieldNameFormatMap(entityName, format);
    return replaceKeysInObject(data, formatMap);
}

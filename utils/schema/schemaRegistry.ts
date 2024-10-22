// File: lib/schemaRegistry.ts





import {NameFormat} from "@/types/AutomationSchemaTypes";

export interface ConversionOptions {
    maxDepth?: number;
    // Add more options as needed
}

function convertValue(value: any, converter: DataType): any {
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

export function getFrontendTableName(tableName: TableName, format: NameFormat): TableName {
    const availableNames: { [key: string]: string[] } = {};

    for (const [frontendName, schema] of Object.entries(globalSchemaRegistry)) {
        for (const [key, name] of Object.entries(schema.tableNameVariations)) {
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
    format: NameFormat = 'frontend'
): FrontendTableSchema | BackendTableSchema | DatabaseTableSchema | PrettyTableSchema | CustomTableSchema | undefined {
    console.log(`getSchema called with tableName: ${tableName} and format: ${format}`);

    const frontendTableName = getFrontendTableNameFromUnknown(tableName);

    // Use the global schema registry to find the schema by frontend name
    const schema = globalSchemaRegistry[frontendTableName];

    if (!schema) {
        console.warn(`No schema found for table name: ${tableName}`);
        return undefined;
    }

    // Use precomputed format-specific schemas directly
    const precomputedSchema = getPrecomputedFormat(schema, format);

    if (!precomputedSchema) {
        console.warn(`No schema found for table name: ${tableName} in format: ${format}`);
        return undefined;
    }

    console.log(`Schema found for ${frontendTableName} in ${format} format.`);
    return precomputedSchema as FrontendTableSchema | BackendTableSchema | DatabaseTableSchema | PrettyTableSchema | CustomTableSchema;
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

function applyCustomFormat(schema: TableSchema, customFormat: NameFormat): CustomTableSchema {
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
        (schema) => schema.tableNameVariations.frontend === frontendTableName
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
    sourceFormat: NameFormat,
    targetFormat: NameFormat,
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

        const frontendTableName = getFrontendTableName(relatedTableName, 'databaseName');
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
    sourceFormat: NameFormat,
    targetFormat: NameFormat,
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
    sourceFormat: NameFormat;
    targetFormat: NameFormat;
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

    // Get precomputed schema from the global registry (or Redux)
    const frontendTableName = getFrontendTableName(tableName, sourceFormat);
    const schema = globalSchemaRegistry[frontendTableName];

    if (!schema) {
        console.warn(`No schema registered for table: ${frontendTableName}. Returning original data.`);
        return data;
    }

    // Use precomputed formats for fast access to translated fields
    const translatedSchema = getPrecomputedFormat(schema, targetFormat);

    const result: any = {};
    const processedKeys: Set<string> = new Set();

    for (const [fieldName, converter] of Object.entries(translatedSchema.entityFields)) {
        const sourceKey = converter.fieldNameVariations[sourceFormat];
        const targetKey = converter.fieldNameVariations[targetFormat];

        if (sourceKey && targetKey && data.hasOwnProperty(sourceKey)) {
            let value = data[sourceKey];

            if (value !== undefined) {
                if (converter.structure === 'foreignKey' || converter.structure === 'inverseForeignKey') {
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
        for (const [format, name] of Object.entries(schema.tableNameVariations)) {
            if (name === tableName) {
                console.log(`Match found: ${tableName} (${format}) maps to frontend name: ${schema.name.frontend}`);
                return schema.tableNameVariations.frontend;
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


export function getRegisteredSchemaNames(format: NameFormat = 'database'): Array<AltOptions[typeof format]> {
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
    const schema = getSchema(tableName, 'databaseName');
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
        const dbKey = fieldSchema.alts['databaseName'];

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


type EnumValues<T> = T extends TypeBrand<infer U> ? U : never;

function extractEnumValues<T extends keyof SchemaRegistry>(
    tableName: T,
    fieldName: keyof SchemaRegistry[T]['tableFields']
): EnumValues<SchemaRegistry[T]['tableFields'][typeof fieldName]['typeReference']>[] | undefined {
    const schema = initialSchemas[tableName];
    if (!schema) return undefined;

    const field = schema.tableFields[fieldName as string];
    if (!field) return undefined;

    const typeReference = field.typeReference;

    // Check if typeReference is a union type (enum-like)
    if (typeof typeReference === 'object' && Object.keys(typeReference).length === 0) {
        // This is a TypeBrand with a union type
        // We need to use a type assertion here because TypeScript can't infer the type correctly
        return (Object.keys(typeReference) as EnumValues<typeof typeReference>[]).filter(key => key !== 'undefined');
    }

    return undefined;
}







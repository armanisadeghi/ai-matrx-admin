// // File: lib/schemaRegistry.ts
//
// import {
//     AllNameVariations,
//     AutomationTableName,
//     DataStructure,
//     FetchStrategy,
//     FieldDataType, FrontendName,
//     NameFormat, ProcessedSchema, SchemaEntityKeys, SchemaType
// } from "@/types/AutomationSchemaTypes";
// import {
//     EntityField,
//     EntityNameMappings,
//     TableRelationship,
//     TypeBrand
// } from "@/types/automationTableTypes";
// import {getGlobalCache, getTableKey, initializeSchemaSystem} from './precomputeUtil';
//
// const defaultTrace = [__filename.split('/').pop() || 'unknownFile']; // In a Node.js environment
//
// const trace: string[] = ['anotherFile'];
//
// let globalSchemaRegistry = getGlobalCache(trace);
//
//
// if (!globalSchemaRegistry) {
//     globalSchemaRegistry = initializeSchemaSystem(trace);
// }
//
// let schema: ProcessedSchema = globalSchemaRegistry.schema;
//
//
// export type AutomationTable = {
//     schemaType: 'table';
//     entityNameMappings: EntityNameMappings;
//     entityFields: {
//         [fieldName: string]: EntityField;
//     };
//     defaultFetchStrategy: FetchStrategy;
//     componentProps: Record<string, any>;
//     relationships: TableRelationship[];
// };
//
//
// export interface FieldConverter<T> {
//     fieldNameMappings: EntityNameMappings;
//     type: FieldDataType;
//     format: NameFormat;
//     structure: DataStructure;
//     databaseTable?: string;
//     typeReference: TypeBrand<T>;
// }
//
// export type ConverterMap = {
//     [key: string]: FieldConverter<any>;
// };
//
// export interface TableSchema {
//     name: EntityNameMappings;
//     schemaType: SchemaType;
//     fields: ConverterMap;
// }
//
// export interface SchemaRegistry {
//     [tableName: string]: TableSchema;
// }
//
// export function createTypeReference<T>(): TypeBrand<T> {
//     return {} as TypeBrand<T>;
// }
//
//
// function convertValue(value: any, converter: FieldConverter<any>, trace = defaultTrace): any {
//     trace = [...trace, 'convertValue'];
//     switch (converter.type) {
//         case 'string':
//             return String(value);
//         case 'number':
//             return Number(value) || 0;
//         case 'boolean':
//             return Boolean(value);
//         case 'array':
//             return Array.isArray(value) ? value : [value];
//         case 'object':
//             return typeof value === 'object' && value !== null ? value : {};
//         case 'null':
//             return null;
//         case 'undefined':
//             return undefined;
//         case 'function':
//             return typeof value === 'function' ? value : () => {
//             };
//         case 'symbol':
//             return typeof value === 'symbol' ? value : Symbol(value);
//         case 'bigint':
//             return typeof value === 'bigint' ? value : BigInt(value);
//         case 'date':
//             return value instanceof Date ? value : new Date(value);
//         case 'map':
//             return value instanceof Map ? value : new Map(Object.entries(value));
//         case 'set':
//             return value instanceof Set ? value : new Set(Array.isArray(value) ? value : [value]);
//         case 'tuple':
//             return Array.isArray(value) ? value : [value];
//         case 'enum':
//             return value;
//         case 'union':
//             return value;
//         case 'intersection':
//             return value;
//         case 'literal':
//             return value;
//         case 'void':
//             return undefined;
//         case 'never':
//             throw new Error('Cannot convert to never type');
//         case 'any':
//             return value;
//         default:
//             return value;
//     }
// }
//
// function getFrontendTableName(
//     tableName: AllNameVariations,
//     format: NameFormat,
//     trace = defaultTrace
// ): FrontendName {
//     trace = [...trace, 'getFrontendTableName'];
//     const availableNames: { [key: string]: string[] } = {};
//     for (const frontendName in globalSchemaRegistry.schema) {
//         const schema = globalSchemaRegistry.schema[frontendName as SchemaEntityKeys];
//
//         for (const [key, name] of Object.entries(schema.entityNameMappings)) {
//             if (name === tableName) {
//
//                 return frontendName as SchemaEntityKeys;
//             }
//             if (!availableNames[key]) {
//                 availableNames[key] = [];
//             }
//             availableNames[key].push(name);
//         }
//     }
//
//     console.warn(`Table name not found in registry: ${tableName}`);
//     for (const [key, names] of Object.entries(availableNames)) {
//         console.warn(`Available names in format '${key}': ${names.join(', ')}`);
//     }
//     return tableName;
// }
//
//
// function handleSingleRelationship(
//     item: any,
//     converter: FieldConverter<any>,
//     sourceFormat: NameFormat,
//     targetFormat: NameFormat,
//     options: ConversionOptions,
//     processedEntities: Set<string>,
//     trace = defaultTrace):
//     any {
//     trace = [...trace, 'handleSingleRelationship'];
//     if (typeof item === 'string') {
//         return {id: item};
//     } else if (typeof item === 'object' && item !== null) {
//         const relatedTableName = converter.databaseTable;
//         if (!relatedTableName) {
//             console.warn(`No database table specified for relationship: ${converter.fieldNameMappings[targetFormat]}`);
//             return item;
//         }
//
//         const frontendTableName = getFrontendTableName(relatedTableName, 'database');
//         const entityId = item.id || item.p_id;
//         if (entityId && processedEntities.has(`${frontendTableName}:${entityId}`)) {
//             return {id: entityId};
//         }
//
//         if (entityId) {
//             processedEntities.add(`${frontendTableName}:${entityId}`);
//         }
//
//         try {
//             return convertData(item, sourceFormat, targetFormat, frontendTableName, options, processedEntities);
//         } catch (error) {
//             if (error instanceof Error) {
//                 console.warn(`Error converting related data for ${frontendTableName}: ${error.message}`);
//             } else {
//                 console.warn(`Unknown error converting related data for ${frontendTableName}`);
//             }
//             return item;
//         }
//     }
//     return item;
// }
//
// function handleRelationship(
//     data: any,
//     converter: FieldConverter<any>,
//     sourceFormat: NameFormat,
//     targetFormat: NameFormat,
//     options: ConversionOptions,
//     processedEntities: Set<string>,
//     trace = defaultTrace):
//     any {
//     trace = [...trace, 'handleRelationship'];
//     if (Array.isArray(data)) {
//         return data.map(item => handleSingleRelationship(item, converter, sourceFormat, targetFormat, options, processedEntities));
//     } else {
//         return handleSingleRelationship(data, converter, sourceFormat, targetFormat, options, processedEntities);
//     }
// }
//
// export interface ConversionOptions {
//     maxDepth?: number;
//     // Add more options as needed
// }
//
//
// export function convertData(
//     data: any,
//     sourceFormat: NameFormat,
//     targetFormat: NameFormat,
//     tableName: string,
//     options: ConversionOptions = {},
//     processedEntities: Set<string> = new Set(),
//     trace = defaultTrace):
//     any {
//     trace = [...trace, 'convertData'];
//     const tableKey = getFrontendTableName(tableName, sourceFormat);
//     const tableSchema = schema[tableKey];
//     if (!schema) {
//         console.warn(`No schema registered for table: ${tableKey}. Returning original data.`);
//         return data;
//     }
//
//     const result: any = {};
//     const processedKeys: Set<string> = new Set();
//
//     for (const [fieldName, entityFields] of Object.entries(tableSchema.entityFields)) {
//         const sourceKey = entityFields.fieldNameMappings[sourceFormat];
//         const targetKey = entityFields.fieldNameMappings[targetFormat];
//
//         if (data.hasOwnProperty(sourceKey)) {
//             let value = data[sourceKey];
//
//             if (value !== undefined) {
//                 if (entityFields.structure === 'foreignKey' ||
//                     entityFields.structure === 'inverseForeignKey' ||
//                     entityFields.structure === 'manyToMany') {
//                     value = handleRelationship(value, entityFields, sourceFormat, targetFormat, options, processedEntities);
//                 } else {
//                     value = convertValue(value, entityFields);
//                 }
//
//                 result[targetKey] = value;
//                 processedKeys.add(sourceKey);
//             }
//         }
//     }
//
//     for (const [key, value] of Object.entries(data)) {
//         if (!processedKeys.has(key)) {
//             result[key] = value;
//         }
//     }
//
//     return result;
// }
//
//
// function getFrontendTableNameFromUnknown(tableName: string, trace = defaultTrace): string {
//     trace = [...trace, 'getFrontendTableNameFromUnknown'];
//     console.log(`getFrontendTableName called with tableName: ${tableName}`);
//
//     if (!globalSchemaRegistry) {
//         console.error("Error: Global schema registry is not defined or unavailable.");
//         return tableName;
//     }
//
//     for (const [schemaKey, schema] of Object.entries(globalSchemaRegistry.schema)) {
//         for (const [format, name] of Object.entries(schema.name)) {
//             if (name === tableName) {
//                 console.log(`Match found: ${tableName} (${format}) maps to frontend name: ${schema.name.frontend}`);
//                 return schema.name.frontend;
//             }
//         }
//     }
//
//     console.warn(`No matching schema found for: ${tableName}`);
//     console.log("Available schemas and their names:");
//     for (const [schemaKey, schema] of Object.entries(globalSchemaRegistry.schema)) {
//         console.log(`  ${schemaKey}:`);
//         for (const [format, name] of Object.entries(schema.name)) {
//             console.log(`    ${format}: ${name}`);
//         }
//     }
//
//     return tableName;
// }
//
//
// export function getRegisteredSchemas(format: NameFormat = 'database', trace = defaultTrace): Array<EntityNameMappings[typeof format]> {
//     trace = [...trace, 'getRegisteredSchemas'];
//     const schemaNames: Array<EntityNameMappings[typeof format]> = [];
//
//     for (const schema of Object.values(globalSchemaRegistry.schema)) {
//         const schemaName = schema.name[format];
//         if (schemaName) {
//             schemaNames.push(schemaName);
//         }
//     }
//
//     return schemaNames;
// }
//
//
// export function getSchema(tableNameVariant: string, format: NameFormat = 'frontend', trace = defaultTrace): TableSchema | undefined {
//     console.log(`getSchema called with tableName: ${tableNameVariant} and format: ${format}`);
//     trace = [...trace, 'getSchema'];
//     const tableKey = getTableKey(tableNameVariant, trace);
//
//     for (const [schemaKey, schema] of Object.entries(globalSchemaRegistry.schema)) {
//         const schemaInRequestedFormat = schema.name[format];
//         if (schemaInRequestedFormat) {
//             return schema;
//         } else {
//             console.warn(`Format ${format} not found for schema ${tableKey}. Returning schema in frontend format.`);
//             return schema;
//         }
//     }
//
//     console.warn(`No schema found for table name: ${tableNameVariant}`);
//     return undefined;
// }
//
//
// function removeEmptyFields(obj: Record<string, any>, trace = defaultTrace): Record<string, any> {
//     trace = [...trace, 'removeEmptyFields'];
//     return Object.fromEntries(
//         Object.entries(obj).filter(([_, value]) => {
//             if (value === null || value === undefined || value === '' || (typeof value === 'object' && Object.keys(value).length === 0)) {
//                 return false; // Drop null, undefined, empty strings, and empty objects
//             }
//             if (Array.isArray(value)) {
//                 return value.length > 0; // Keep non-empty arrays
//             }
//             return true; // Keep other types (strings, numbers, non-empty objects, etc.)
//         })
//     );
// }
//
//
// // Utility function to handle relationships based on schema structure
// function handleRelationshipField(fieldName: string, value: any, structureType: string, tableName: string, fieldSchema: any, trace = defaultTrace) {
//     trace = [...trace, 'handleRelationshipField'];
//     // Get the related table name from the schema structure
//     const relatedTable = fieldSchema.databaseTable;
//
//     if (structureType === 'foreignKey') {
//         if (typeof value === 'string' || typeof value === 'number') {
//             // Simple scalar value, treat it as a regular FK reference
//             return {
//                 type: 'fk',
//                 data: {[fieldName]: value},
//                 appData: {[`${fieldName}Fk`]: value}, // App-specific field
//                 table: relatedTable
//             };
//         } else if (typeof value === 'object' && value.id) {
//             // It's an object with an ID field
//             return {
//                 type: 'fk',
//                 data: {[fieldName]: value.id},
//                 appData: {[`${fieldName}Object`]: value},
//                 table: relatedTable
//             };
//         } else {
//             throw new Error(`Invalid value for foreign key field: ${fieldName}`);
//         }
//     } else if (structureType === 'inverseForeignKey') {
//         return {
//             type: 'ifk',
//             table: relatedTable,
//             data: value,
//             related_column: `${fieldName}_id`
//         };
//     }
//
//     throw new Error(`Unsupported structure type: ${structureType}`);
// }
//
//
// // Main utility function
// export function processDataForInsert(tableName: string, dbData: Record<string, any>, trace = defaultTrace) {
//     trace = [...trace, 'processDataForInsert'];
//     const schema = getSchema(tableName, 'database');
//     if (!schema) {
//         console.warn(`No schema found for table: ${tableName}. Returning original data.`);
//         return {
//             callMethod: 'single',
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
//         const dbKey = fieldSchema.fieldNameMappings['database'];
//
//         if (cleanedData.hasOwnProperty(dbKey)) {
//             const value = cleanedData[dbKey];
//             const structureType = fieldSchema.structure;
//
//             if (structureType === 'single') {
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
//         callMethod = 'single';
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
//
//
// export function initializeSchemas() {
//     console.log("Registered schemas:", Object.keys(globalSchemaRegistry.schema));
// }
//
//
// export type InferSchemaType<T extends TableSchema> = {
//     [K in keyof T['fields']]: T['fields'][K] extends FieldConverter<infer U> ? U : never;
// };
//
//
// const availableSchemas = getRegisteredSchemas('database');
//
// export type AvailableSchemas = typeof availableSchemas[number];

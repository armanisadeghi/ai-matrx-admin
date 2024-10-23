// hooks/useSchema.ts
'use client';

import {useContext, useCallback, useMemo} from 'react';
import {useSchema as useBaseSchema} from '@/providers/SchemaProvider';
import type {AutomationTableStructure, AutomationTable, TableNames} from '@/types/automationTableTypes';
import {v4 as uuidv4} from 'uuid';


import type {NameFormat} from '@/types/AutomationSchemaTypes';

interface FormattedSchema extends AutomationTable {
    formattedNames: Record<string, string>;
}

interface ApiWrapperSchema {
    schema: AutomationTable;
    frontend: FormattedSchema;
    database: FormattedSchema;
}

type FieldType =
    | 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null'
    | 'undefined' | 'function' | 'symbol' | 'bigint' | 'date' | 'map'
    | 'set' | 'tuple' | 'enum' | 'union' | 'intersection' | 'literal'
    | 'void' | 'any' | 'never';

interface FieldConverter<T> {
    type: FieldType;
    validate?: (value: unknown) => value is T;
    transform?: (value: unknown) => T;
}

export type DataWithOptionalId = { id?: string; [key: string]: any };
export type DataWithId = { id: string; [key: string]: any };
type ValidationFunction = (value: any) => boolean | void;


interface UseSchemaResult {
    // Schema Access
    schema: AutomationTableStructure;
    getTableSchema: (tableVariant: string) => AutomationTable | undefined;
    getAllTableNames: () => TableNames[];

    // Name Resolution
    resolveTableName: (variant: string) => string;
    resolveFieldName: (tableKey: string, fieldVariant: string) => string;

    // Field Operations
    getFieldSchema: (tableVariant: string, fieldVariant: string) => AutomationTable['entityFields'][string] | undefined;
    getPrimaryKey: (tableVariant: string) => string | undefined;
    getDisplayFields: (tableVariant: string) => string[];

    // Relationship Operations
    getTableRelationships: (tableVariant: string) => AutomationTable['relationships'] | undefined;
    getForeignKeyFields: (tableVariant: string) => string[];

    // Lookup Operations
    lookups: {
        tables: Record<string, string>;
        fields: Record<string, Record<string, string>>;
    };

    // Utility Functions
    getFieldValue: <T>(tableVariant: string, fieldVariant: string, format: 'frontend' | 'backend' | 'database' | 'pretty' | 'component') => T | undefined;
    validateFieldValue: (tableVariant: string, fieldVariant: string, value: any) => boolean;

    getSchemaInFormat: (tableVariant: string, format?: NameFormat) => AutomationTable | undefined;
    getFieldNameInFormat: (tableVariant: string, fieldVariant: string, format: NameFormat) => string;
    getApiWrapperSchema: (tableVariant: string) => ApiWrapperSchema | undefined;

    processDataForInsert: (tableVariant: string, data: Record<string, any>) => {
        callMethod: 'simple' | 'fk' | 'ifk' | 'fkAndIfk',
        processedData: Record<string, any>
    };
    getRelationshipType: (tableVariant: string, format?: NameFormat) => Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null>;
    removeEmptyFields: (obj: Record<string, any>) => Record<string, any>;

    convertDataFormatSimple: <T extends Record<string, any>>(tableVariant: string, data: T, fromFormat: NameFormat, toFormat: NameFormat) => Record<string, any>;
    convertDataFormatValidated: <T extends Record<string, any>>(tableVariant: string, data: T, fromFormat: NameFormat, toFormat: NameFormat) => Record<string, any>;

    convertDataFormat: <T extends Record<string, any>>(
        tableVariant: string,
        data: T,
        fromFormat: NameFormat,
        toFormat: NameFormat
    ) => Record<string, any>;

}

export function useSchema(): UseSchemaResult {
    const baseSchema = useBaseSchema(); // Use the base hook from SchemaProvider
    const {schema, lookups, resolveTableName, resolveFieldName} = baseSchema;

    // Memoized table names
    const allTableNames = useMemo(() =>
            Object.keys(schema) as TableNames[],
        [schema]
    );

    const getSchemaInFormat = useCallback((
        tableVariant: string,
        format: NameFormat = 'frontend'
    ): AutomationTable | undefined => {
        const tableKey = resolveTableName(tableVariant);
        const tableSchema = schema[tableKey];

        if (!tableSchema) {
            console.warn(`No schema found for table name: ${tableVariant}`);
            return undefined;
        }

        // Create formatted version of the schema
        const formattedSchema = {
            ...tableSchema,
            entityNameMappings: {
                ...tableSchema.entityNameMappings,
                current: tableSchema.entityNameMappings[format]
            },
            entityFields: Object.entries(tableSchema.entityFields).reduce((acc, [fieldKey, field]) => {
                const formattedFieldName = field.fieldNameMappings[fieldKey]?.[format] || fieldKey;
                acc[formattedFieldName] = {
                    ...field,
                    currentName: formattedFieldName
                };
                return acc;
            }, {} as Record<string, any>)
        };

        return formattedSchema;
    }, [schema, resolveTableName]);

    // Get multiple format versions of the schema
    const getApiWrapperSchema = useCallback((
        tableVariant: string
    ): ApiWrapperSchema | undefined => {
        const tableKey = resolveTableName(tableVariant);
        const baseTableSchema = schema[tableKey];

        if (!baseTableSchema) {
            console.warn(`No schema found for table name: ${tableVariant}`);
            return undefined;
        }

        return {
            schema: baseTableSchema,
            frontend: getSchemaInFormat(tableVariant, 'frontend') as FormattedSchema,
            database: getSchemaInFormat(tableVariant, 'database') as FormattedSchema
        };
    }, [schema, resolveTableName, getSchemaInFormat]);

    // Get field name in specific format
    const getFieldNameInFormat = useCallback((
        tableVariant: string,
        fieldVariant: string,
        format: NameFormat = 'frontend'
    ): string => {
        const tableKey = resolveTableName(tableVariant);
        const fieldKey = resolveFieldName(tableKey, fieldVariant);
        const tableSchema = schema[tableKey];

        if (!tableSchema) {
            return fieldVariant;
        }

        const field = tableSchema.entityFields[fieldKey];
        return field?.fieldNameMappings[fieldKey]?.[format] || fieldVariant;
    }, [schema, resolveTableName, resolveFieldName]);

    const convertDataFormatSimple = useCallback(<T extends Record<string, any>>(
        tableVariant: string,
        data: T,
        fromFormat: NameFormat,
        toFormat: NameFormat
    ): Record<string, any> => {
        const tableKey = resolveTableName(tableVariant);
        const tableSchema = schema[tableKey];

        if (!tableSchema) {
            return data;
        }

        return Object.entries(data).reduce((acc, [key, value]) => {
            const fieldKey = resolveFieldName(tableKey, key);
            const field = tableSchema.entityFields[fieldKey];
            if (field) {
                const newKey = field.fieldNameMappings[fieldKey]?.[toFormat] || key;
                acc[newKey] = value;
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, any>);
    }, [schema, resolveTableName, resolveFieldName]);


    const convertDataFormatValidated = useCallback(<T extends Record<string, any>>(
        tableVariant: string,
        data: T,
        fromFormat: NameFormat,
        toFormat: NameFormat
    ): Record<string, any> => {
        const validatedData = validateAndTransformData(tableVariant, data, fromFormat);
        const tableKey = resolveTableName(tableVariant);

        return Object.entries(validatedData).reduce((acc, [key, value]) => {
            const fieldKey = resolveFieldName(tableKey, key);
            const newKey = getFieldNameInFormat(tableKey, fieldKey, toFormat);
            acc[newKey] = value;
            return acc;
        }, {} as Record<string, any>);
    }, [resolveTableName, resolveFieldName, getFieldNameInFormat]);


    // Get table schema with name resolution
    const getTableSchema = useCallback((tableVariant: string): AutomationTable | undefined => {
        const tableKey = resolveTableName(tableVariant);
        return schema[tableKey];
    }, [schema, resolveTableName]);

    // Get field schema with name resolution
    const getFieldSchema = useCallback((tableVariant: string, fieldVariant: string) => {
        const tableKey = resolveTableName(tableVariant);
        const fieldKey = resolveFieldName(tableKey, fieldVariant);
        return schema[tableKey]?.entityFields[fieldKey];
    }, [schema, resolveTableName, resolveFieldName]);

    // Get primary key field
    const getPrimaryKey = useCallback((tableVariant: string): string | undefined => {
        const tableSchema = getTableSchema(tableVariant);
        if (!tableSchema) return undefined;

        return Object.entries(tableSchema.entityFields)
            .find(([_, field]) => field.isPrimaryKey)?.[0];
    }, [getTableSchema]);

    // Get display fields
    const getDisplayFields = useCallback((tableVariant: string): string[] => {
        const tableSchema = getTableSchema(tableVariant);
        if (!tableSchema) return [];

        return Object.entries(tableSchema.entityFields)
            .filter(([_, field]) => field.isDisplayField)
            .map(([fieldName]) => fieldName);
    }, [getTableSchema]);

    // Get table relationships
    const getTableRelationships = useCallback((tableVariant: string) => {
        const tableSchema = getTableSchema(tableVariant);
        return tableSchema?.relationships;
    }, [getTableSchema]);

    // Get foreign key fields
    const getForeignKeyFields = useCallback((tableVariant: string): string[] => {
        const relationships = getTableRelationships(tableVariant);
        if (!relationships) return [];

        return relationships
            .filter(rel => rel.relationshipType === 'foreignKey')
            .map(rel => rel.column);
    }, [getTableRelationships]);

    // Get field value in specific format
    const getFieldValue = useCallback(<T>(
        tableVariant: string,
        fieldVariant: string,
        format: 'frontend' | 'backend' | 'database' | 'pretty' | 'component'
    ): T | undefined => {
        const fieldSchema = getFieldSchema(tableVariant, fieldVariant);
        if (!fieldSchema) return undefined;

        const fieldKey = resolveFieldName(resolveTableName(tableVariant), fieldVariant);
        return fieldSchema.fieldNameMappings[fieldKey]?.[format] as T;
    }, [getFieldSchema, resolveTableName, resolveFieldName]);

    // Validate field value
    const validateFieldValue = useCallback((
        tableVariant: string,
        fieldVariant: string,
        value: any
    ): boolean => {
        const fieldSchema = getFieldSchema(tableVariant, fieldVariant);
        if (!fieldSchema) return false;

        // Add your validation logic here based on fieldSchema.validationFunctions
        // This is a basic example
        if (fieldSchema.isRequired && (value === null || value === undefined)) {
            return false;
        }

        return true;
    }, [getFieldSchema]);


    const removeEmptyFields = useCallback((obj: Record<string, any>): Record<string, any> => {
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
    }, []);

    const handleRelationshipField = useCallback((
        fieldName: string,
        value: any,
        fieldSchema: AutomationTable['entityFields'][string],
        tableName: string
    ) => {
        const relatedTable = fieldSchema.databaseTable;
        const relationshipType = fieldSchema.structure;

        if (relationshipType === 'foreignKey') {
            if (typeof value === 'string' || typeof value === 'number') {
                return {
                    type: 'fk',
                    data: {[fieldName]: value},
                    appData: {[`${fieldName}Fk`]: value},
                    table: relatedTable
                };
            } else if (typeof value === 'object' && 'id' in value) {
                return {
                    type: 'fk',
                    data: {[fieldName]: value.id},
                    appData: {[`${fieldName}Object`]: value},
                    table: relatedTable
                };
            }
            throw new Error(`Invalid value for foreign key field: ${fieldName}`);
        }

        if (relationshipType === 'inverseForeignKey') {
            return {
                type: 'ifk',
                table: relatedTable,
                data: value,
                related_column: `${fieldName}_id`
            };
        }

        throw new Error(`Unsupported structure type: ${relationshipType}`);
    }, []);

    const processDataForInsert = useCallback((
        tableVariant: string,
        data: Record<string, any>
    ): { callMethod: 'simple' | 'fk' | 'ifk' | 'fkAndIfk', processedData: Record<string, any> } => {
        const tableKey = resolveTableName(tableVariant);
        const tableSchema = getSchemaInFormat(tableKey, 'database');

        if (!tableSchema) {
            console.warn(`No schema found for table: ${tableVariant}. Returning original data.`);
            return {
                callMethod: 'simple',
                processedData: data
            };
        }

        const cleanedData = removeEmptyFields(data);
        let result: Record<string, any> = {};
        const relatedTables: Array<Record<string, any>> = [];
        let hasForeignKey = false;
        let hasInverseForeignKey = false;

        for (const [fieldName, field] of Object.entries(tableSchema.entityFields)) {
            const dbFieldName = getFieldNameInFormat(tableKey, fieldName, 'database');

            if (cleanedData.hasOwnProperty(dbFieldName)) {
                const value = cleanedData[dbFieldName];

                if (field.structure === 'single') {
                    result[dbFieldName] = value;
                } else if (['foreignKey', 'inverseForeignKey'].includes(field.structure)) {
                    const relationship = handleRelationshipField(
                        dbFieldName,
                        value,
                        field,
                        tableKey
                    );

                    if (relationship.type === 'fk') {
                        hasForeignKey = true;
                        result = {...result, ...relationship.data, ...relationship.appData};
                    } else if (relationship.type === 'ifk') {
                        hasInverseForeignKey = true;
                        relatedTables.push({
                            table: relationship.table,
                            data: relationship.data,
                            related_column: relationship.related_column
                        });
                    }
                }
            }
        }

        // Explicitly typing the callMethod to satisfy TypeScript
        const callMethod: 'simple' | 'fk' | 'ifk' | 'fkAndIfk' = !hasForeignKey && !hasInverseForeignKey ? 'simple'
            : hasForeignKey && !hasInverseForeignKey ? 'fk'
                : !hasForeignKey && hasInverseForeignKey ? 'ifk'
                    : 'fkAndIfk';

        if (relatedTables.length > 0) {
            result.relatedTables = relatedTables;
        }

        return {
            callMethod,
            processedData: result
        };
    }, [resolveTableName, getSchemaInFormat, getFieldNameInFormat]);

    const getRelationshipType = useCallback(async (
        tableVariant: string,
        format: NameFormat = 'frontend'
    ): Promise<'simple' | 'fk' | 'ifk' | 'fkAndIfk' | null> => {
        const tableKey = resolveTableName(tableVariant);
        const tableSchema = getSchemaInFormat(tableKey, format);

        if (!tableSchema) {
            console.error(`Schema not found for table: ${tableVariant}`);
            return null;
        }

        let hasForeignKey = false;
        let hasInverseForeignKey = false;

        for (const field of Object.values(tableSchema.entityFields)) {
            if (field.structure === 'foreignKey') {
                hasForeignKey = true;
            } else if (field.structure === 'inverseForeignKey') {
                hasInverseForeignKey = true;
            }

            if (hasForeignKey && hasInverseForeignKey) {
                return 'fkAndIfk';
            }
        }

        return hasForeignKey ? 'fk'
            : hasInverseForeignKey ? 'ifk'
                : 'simple';
    }, [resolveTableName, getSchemaInFormat]);


    const initializeFieldValue = useCallback((converter: FieldConverter<any>): any => {
        switch (converter.type) {
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
                return null;
            case 'never':
                throw new Error('Cannot initialize a value for "never" type');
            default:
                return null;
        }
    }, []);

    // Ensure IDs exist in data
    const ensureId = useCallback(<T extends DataWithOptionalId | DataWithOptionalId[]>(
        input: T
    ): T extends DataWithOptionalId[] ? DataWithId[] : DataWithId => {
        if (Array.isArray(input)) {
            return input.map((item) => ({
                ...item,
                id: item.id ?? uuidv4(),
            })) as any;
        }

        if ('id' in input && typeof input.id === 'string') {
            return input as any;
        }

        return {...input, id: uuidv4()} as any;
    }, []);

    // Initialize data based on schema
    const initializeDataFromSchema = useCallback((
        tableVariant: string,
        format: NameFormat = 'frontend'
    ): Record<string, any> => {
        const tableKey = resolveTableName(tableVariant);
        const tableSchema = getSchemaInFormat(tableKey, format);

        if (!tableSchema) {
            throw new Error(`No schema found for table: ${tableVariant}`);
        }

        return Object.entries(tableSchema.entityFields).reduce((acc, [fieldName, field]) => {
            const converter: FieldConverter<any> = {
                type: field.dataType.toLowerCase() as FieldType
            };

            acc[fieldName] = initializeFieldValue(converter);
            return acc;
        }, {} as Record<string, any>);
    }, [resolveTableName, getSchemaInFormat, initializeFieldValue]);


    const convertDataFormat = useCallback(<T extends Record<string, any>>(
        tableVariant: string,
        data: T,
        fromFormat: NameFormat,
        toFormat: NameFormat
    ): Record<string, any> => {
        return convertDataFormatValidated(tableVariant, data, fromFormat, toFormat);
    }, [convertDataFormatValidated]);

    // Validate and transform data based on schema
    const validateAndTransformData = useCallback((
        tableVariant: string,
        data: Record<string, any>,
        format: NameFormat = 'frontend'
    ): Record<string, any> => {
        const tableKey = resolveTableName(tableVariant);
        const tableSchema = schema[tableKey];

        if (!tableSchema) {
            throw new Error(`No schema found for table: ${tableVariant}`);
        }

        const result = { ...data };

        for (const [fieldName, field] of Object.entries(tableSchema.entityFields)) {
            const value = result[fieldName];
            const converter: FieldConverter<any> = {
                type: field.dataType.toLowerCase() as FieldType
            };

            // If value is undefined or null and field is required, initialize it
            if ((value === undefined || value === null) && field.isRequired) {
                result[fieldName] = initializeFieldValue(converter);
                continue;
            }

            // Validate value if validator exists
            if (field.validationFunctions?.length) {
                try {
                    field.validationFunctions.forEach(validationFnName => {
                        // Assume validationFunctions is an array of function names or actual functions
                        const validationFn = typeof validationFnName === 'string'
                            ? (globalValidations as Record<string, ValidationFunction>)[validationFnName]
                            : validationFnName;

                        if (typeof validationFn === 'function') {
                            validationFn(value);
                        }
                    });
                } catch (error) {
                    console.error(`Validation failed for field ${fieldName}:`, error);
                    result[fieldName] = initializeFieldValue(converter);
                }
            }
        }

        return ensureId(result);
    }, [resolveTableName, schema]);


    return {
        schema,
        getTableSchema,
        getAllTableNames: () => allTableNames,
        resolveTableName,
        resolveFieldName,
        getFieldSchema,
        getPrimaryKey,
        getDisplayFields,
        getTableRelationships,
        getForeignKeyFields,
        getSchemaInFormat,
        getApiWrapperSchema,
        getFieldNameInFormat,
        convertDataFormatSimple,
        convertDataFormatValidated,
        convertDataFormat,
        lookups,
        getFieldValue,
        validateFieldValue,
        processDataForInsert,
        getRelationshipType,
        removeEmptyFields,

    };
}

const globalValidations: Record<string, ValidationFunction> = {
    // Add your global validation functions here
    required: (value: any) => {
        if (value === undefined || value === null || value === '') {
            throw new Error('Value is required');
        }
    },
    // Add more validation functions as needed
};

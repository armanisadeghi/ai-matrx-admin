// hooks/useSchema.ts
'use client';

import {useContext, useCallback, useMemo} from 'react';
import {useSchemaResolution, useSchema as useBaseSchema} from '@/providers/SchemaProvider';
// import type {
//     AutomationTableStructure,
//     AutomationTable,
//     TableNames,
//     AllTableNameVariations,
//     AllFieldNameVariations,
//     TableFields,
//     TableNameBackend,
//     TableNameFrontend,
//     TableNameDatabase,
//     FieldNameFrontend, FieldNameBackend, FieldNameDatabase
// } from '@/types/automationTableTypes';
import {v4 as uuidv4} from 'uuid';


import type {AutomationTableName, NameFormat} from '@/types/AutomationSchemaTypes';

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
type GetFieldValueOptions = {
    returnOriginal?: boolean;
    warnOnMissing?: boolean;
};
type RemoveEmptyConfig = {
    removeEmpty: boolean;
    removeNull: boolean;
    removeUndefined: boolean;
    removeEmptyArrays: boolean;
    removeEmptyObjects: boolean;
};
type ConvertedData<T extends AutomationTableName> = {
    [K in keyof TableFields<T>]: any;
};

const defaultRemoveConfig: RemoveEmptyConfig = {
    removeEmpty: true,
    removeNull: true,
    removeUndefined: true,
    removeEmptyArrays: true,
    removeEmptyObjects: true
};
type WithId = { id: string; };
type WithOptionalId = { id?: string; };


interface UseSchemaResult {
    // Schema Access
    schema: AutomationTableStructure;
    getTableSchema: <T extends AutomationTableName>(tableVariant: AllTableNameVariations) => AutomationTableStructure[T] | undefined;
    getAllTableNames: () => AutomationTableName[];

    // Name Resolution
    resolveTableName: (variant: AllTableNameVariations) => AutomationTableName;
    resolveFieldName: <T extends AutomationTableName>(
        tableName: T,
        fieldVariant: AllFieldNameVariations<T>
    ) => keyof TableFields<T>;

    // Field Operations
    getFieldSchema: <T extends AutomationTableName>(
        tableVariant: AllTableNameVariations,
        fieldVariant: AllFieldNameVariations<T>
    ) => AutomationTableStructure[T]['entityFields'][keyof AutomationTableStructure[T]['entityFields']] | undefined;

    getPrimaryKey: <T extends AutomationTableName>(tableVariant: AllTableNameVariations) => keyof TableFields<T> | undefined;
    getDisplayFields: <T extends AutomationTableName>(tableVariant: AllTableNameVariations) => Array<keyof TableFields<T>>;

    // Format conversion helpers
    getSchemaInFormat: <T extends AutomationTableName>(
        tableVariant: AllTableNameVariations,
        format?: NameFormat
    ) => AutomationTableStructure[T] | undefined;

    getFieldNameInFormat: <T extends AutomationTableName>(
        tableVariant: AllTableNameVariations,
        fieldVariant: AllFieldNameVariations<T>,
        format: NameFormat
    ) => keyof TableFields<T>;

    // Data conversion methods
    convertDataFormat: <T extends AutomationTableName, TData extends Record<string, any>>(
        tableVariant: AllTableNameVariations,
        data: TData,
        fromFormat: NameFormat,
        toFormat: NameFormat
    ) => Record<keyof TableFields<T>, any>;

    getFrontendTableName: <T extends AutomationTableName>(tableKey: T) => TableNameFrontend<T>;
    getBackendTableName: <T extends AutomationTableName>(tableKey: T) => TableNameBackend<T>;
    getDatabaseTableName: <T extends AutomationTableName>(tableKey: T) => TableNameDatabase<T>;

    getFrontendFieldName: <T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ) => FieldNameFrontend<T, typeof fieldKey>;
    getBackendFieldName: <T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ) => FieldNameBackend<T, typeof fieldKey>;
    getDatabaseFieldName: <T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ) => FieldNameDatabase<T, typeof fieldKey>;

}

export function useSchema(): UseSchemaResult {
    const baseSchema = useBaseSchema();
    const { schema } = baseSchema;
    const {
        getTableNameInFormat,
        getFieldNameInFormat,
        resolveTableKey,
        resolveFieldKey
    } = useSchemaResolution();

    const allTableNames = useMemo(() =>
            Object.keys(schema) as TableNames[],
        [schema]
    );

    const getFrontendTableName = useCallback(<T extends AutomationTableName>(
        tableKey: T
    ): TableNameFrontend<T> => {
        return getTableNameInFormat(tableKey, 'frontend') as TableNameFrontend<T>;
    }, [getTableNameInFormat]);

    const getBackendTableName = useCallback(<T extends AutomationTableName>(
        tableKey: T
    ): TableNameBackend<T> => {
        return getTableNameInFormat(tableKey, 'backend') as TableNameBackend<T>;
    }, [getTableNameInFormat]);

    const getDatabaseTableName = useCallback(<T extends AutomationTableName>(
        tableKey: T
    ): TableNameDatabase<T> => {
        return getTableNameInFormat(tableKey, 'database') as TableNameDatabase<T>;
    }, [getTableNameInFormat]);

    const getFrontendFieldName = useCallback(<T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ): FieldNameFrontend<T, typeof fieldKey> => {
        return getFieldNameInFormat(tableKey, fieldKey, 'frontend') as FieldNameFrontend<T, typeof fieldKey>;
    }, [getFieldNameInFormat]);

    const getBackendFieldName = useCallback(<T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ): FieldNameBackend<T, typeof fieldKey> => {
        return getFieldNameInFormat(tableKey, fieldKey, 'backend') as FieldNameBackend<T, typeof fieldKey>;
    }, [getFieldNameInFormat]);

    const getDatabaseFieldName = useCallback(<T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ): FieldNameDatabase<T, typeof fieldKey> => {
        return getFieldNameInFormat(tableKey, fieldKey, 'database') as FieldNameDatabase<T, typeof fieldKey>;
    }, [getFieldNameInFormat]);

    const getSchemaInFormat = useCallback(<T extends AutomationTableName>(
        tableVariant: string,
        format: NameFormat = 'frontend'
    ): AutomationTableStructure[T] | undefined => {
        const tableKey = resolveTableKey(tableVariant) as T;
        const tableSchema = schema[tableKey];

        if (!tableSchema) {
            console.warn(`No schema found for table name: ${tableVariant}`);
            return undefined;
        }

        const formattedName = getTableNameInFormat(tableKey, format);

        // Create formatted version of the schema
        const formattedSchema = {
            ...tableSchema,
            entityNameMappings: {
                ...tableSchema.entityNameMappings,
                current: formattedName
            },
            entityFields: Object.entries(tableSchema.entityFields).reduce((acc, [fieldKey, field]) => {
                const resolvedFieldKey = resolveFieldKey(tableKey, fieldKey);
                const formattedFieldName = getFieldNameInFormat(tableKey, resolvedFieldKey, format);

                acc[formattedFieldName] = {
                    ...field,
                    currentName: formattedFieldName
                };
                return acc;
            }, {} as Record<string, any>)
        };

        return formattedSchema as AutomationTableStructure[T];
    }, [schema, resolveTableKey, getFieldNameInFormat, getTableNameInFormat]);


        const getApiWrapperSchema = useCallback(<T extends AutomationTableName>(
            tableVariant: string
        ): ApiWrapperSchema | undefined => {
            const tableKey = resolveTableKey(tableVariant) as T;
            const baseTableSchema = schema[tableKey];

            if (!baseTableSchema) {
                console.warn(`No schema found for table name: ${tableVariant}`);
                return undefined;
            }

            return {
                schema: baseTableSchema,
                frontend: getSchemaInFormat<T>(tableVariant, 'frontend') as FormattedSchema,
                database: getSchemaInFormat<T>(tableVariant, 'database') as FormattedSchema
            };
        }, [schema, resolveTableKey, getSchemaInFormat]);


        const convertDataFormatSimple = useCallback(<T extends AutomationTableName>(
            tableVariant: string,
            data: Record<string, any>,
            fromFormat: NameFormat,
            toFormat: NameFormat
        ): Record<string, any> => {
            try {
                const tableKey = resolveTableKey(tableVariant) as T;
                const tableSchema = schema[tableKey];

                if (!tableSchema) {
                    console.warn(`No schema found for table ${tableVariant}, returning original data`);
                    return data;
                }

                return Object.entries(data).reduce((acc, [key, value]) => {
                    try {
                        const fieldKey = resolveFieldKey(tableKey, key);
                        // Use type assertion here since we know fieldKey is valid
                        const field = tableSchema.entityFields[fieldKey as keyof typeof tableSchema.entityFields];

                        if (field) {
                            const newKey = getFieldNameInFormat(tableKey, fieldKey, toFormat);
                            acc[newKey] = value;
                        } else {
                            console.log(`Unrecognized field key ${key} in table ${tableVariant}, keeping original`);
                            acc[key] = value;
                        }
                    } catch (error) {
                        console.log(`Unable to convert field ${key} in table ${tableVariant}: ${error.message}`);
                        acc[key] = value;
                    }
                    return acc;
                }, {} as Record<string, any>);
            } catch (error) {
                console.error(`Error converting data format for table ${tableVariant}: ${error.message}`);
                return data;
            }
        }, [schema, resolveTableKey, resolveFieldKey, getFieldNameInFormat]);


        const getFieldValue = useCallback(<T extends unknown>(
            tableVariant: string,
            fieldVariant: string,
            format: NameFormat,
            options: GetFieldValueOptions = {}
        ): T | undefined => {
            try {
                const tableKey = resolveTableKey(tableVariant);
                const fieldKey = resolveFieldKey(tableKey, fieldVariant);
                const formattedName = getFieldNameInFormat(tableKey, fieldKey, format);

                return formattedName as T;
            } catch (error) {
                if (options.warnOnMissing) {
                    console.warn(`Unable to get ${format} value for field ${fieldVariant} in table ${tableVariant}: ${error.message}`);
                }
                return options.returnOriginal ? fieldVariant as T : undefined;
            }
        }, [resolveTableKey, resolveFieldKey, getFieldNameInFormat]);


        const removeEmptyFields = useCallback(<T extends Record<string, any>>(
            obj: T,
            config: Partial<RemoveEmptyConfig> = defaultRemoveConfig
        ): Partial<T> => {
            const finalConfig = {...defaultRemoveConfig, ...config};

            return Object.entries(obj).reduce((acc, [key, value]) => {
                const shouldKeep = (() => {
                    if (value === null) return !finalConfig.removeNull;
                    if (value === undefined) return !finalConfig.removeUndefined;
                    if (value === '') return !finalConfig.removeEmpty;

                    if (Array.isArray(value)) {
                        return !finalConfig.removeEmptyArrays || value.length > 0;
                    }

                    if (typeof value === 'object') {
                        return !finalConfig.removeEmptyObjects || Object.keys(value).length > 0;
                    }

                    return true;
                })();

                if (shouldKeep) {
                    acc[key as keyof T] = value;
                }
                return acc;
            }, {} as Partial<T>);
        }, []);


        const ensureId = useCallback(<T extends Record<string, any>>(
            input: T | T[]
        ): T extends T[] ? (T[number] & WithId)[] : T & WithId => {
            if (Array.isArray(input)) {
                return input.map(item => ({
                    ...item,
                    id: ('id' in item && typeof item.id === 'string') ?
                        item.id :
                        uuidv4()
                })) as T extends T[] ? (T[number] & WithId)[] : never;
            }

            if ('id' in input && typeof input.id === 'string') {
                return input as T & WithId;
            }

            return {
                ...input,
                id: uuidv4()
            } as T extends T[] ? never : T & WithId;
        }, []);


        const convertDataFormatValidated = useCallback(<T extends AutomationTableName>(
            tableVariant: AllTableNameVariations,
            data: Partial<Record<AllFieldNameVariations<T>, any>>,
            fromFormat: NameFormat,
            toFormat: NameFormat
        ): Partial<Record<keyof TableFields<T>, any>> => {
            const validatedData = validateAndTransformData<T>(tableVariant, data, fromFormat);
            const tableKey = resolveTableName(tableVariant) as T;

            return Object.entries(validatedData).reduce<Partial<Record<keyof TableFields<T>, any>>>((acc, [key, value]) => {
                const fieldKey = resolveFieldName(
                    tableKey,
                    key as AllFieldNameVariations<T>
                );

                // Use the FieldVariantMap type for the new key
                const newKey = getFieldNameInFormat(
                    tableKey,
                    fieldKey,
                    toFormat
                ) as keyof TableFields<T>;

                acc[newKey] = value;
                return acc;
            }, {});
        }, [resolveTableName, resolveFieldName, getFieldNameInFormat]);


        const resolveTableSchema = useCallback(<T extends AutomationTableName>(
            tableVariant: string
        ): AutomationTableStructure[T] | undefined => {
            try {
                const tableKey = resolveTableKey(tableVariant) as T;
                return schema[tableKey];
            } catch (error) {
                console.warn(`Unable to resolve schema for table ${tableVariant}: ${error.message}`);
                return undefined;
            }
        }, [schema, resolveTableKey]);

        const getFieldSchema = useCallback(<T extends AutomationTableName>(
            tableVariant: string,
            fieldVariant: string
        ): AutomationTableStructure[T]['entityFields'][keyof TableFields<T>] | undefined => {
            const tableSchema = resolveTableSchema<T>(tableVariant);
            if (!tableSchema) return undefined;

            try {
                const tableKey = resolveTableKey(tableVariant) as T;
                const fieldKey = resolveFieldKey(tableKey, fieldVariant);
                return tableSchema.entityFields[fieldKey];
            } catch (error) {
                console.warn(`Unable to resolve field schema for ${fieldVariant} in table ${tableVariant}: ${error.message}`);
                return undefined;
            }
        }, [resolveTableSchema, resolveTableKey, resolveFieldKey]);

        // const getPrimaryKey = useCallback(<T extends AutomationTableName>(
        //     tableVariant: string
        // ): keyof TableFields<T> | undefined => {
        //     const tableSchema = resolveTableSchema<T>(tableVariant);
        //     if (!tableSchema) return undefined;
        //
        //     const primaryField = Object.entries(tableSchema.entityFields)
        //         .find(([_, field]) => field.isPrimaryKey);
        //
        //     return primaryField?.[0] as keyof TableFields<T>;
        // }, [resolveTableSchema]);
        //
        // const getDisplayFields = useCallback(<T extends AutomationTableName>(
        //     tableVariant: string
        // ): Array<keyof TableFields<T>> => {
        //     const tableSchema = resolveTableSchema<T>(tableVariant);
        //     if (!tableSchema) return [];
        //
        //     return Object.entries(tableSchema.entityFields)
        //         .filter(([_, field]) => field.isDisplayField)
        //         .map(([fieldName]) => fieldName as keyof TableFields<T>);
        // }, [resolveTableSchema]);

        const getTableRelationships = useCallback(<T extends AutomationTableName>(
            tableVariant: string
        ) => {
            const tableSchema = resolveTableSchema<T>(tableVariant);
            return tableSchema?.relationships;
        }, [resolveTableSchema]);

        const getForeignKeyFields = useCallback(<T extends AutomationTableName>(
            tableVariant: string
        ): Array<keyof TableFields<T>> => {
            const relationships = getTableRelationships<T>(tableVariant);
            if (!relationships) return [];

            return relationships
                .filter(rel => rel.relationshipType === 'foreignKey')
                .map(rel => rel.column as keyof TableFields<T>);
        }, [getTableRelationships]);


        const validateFieldValue = useCallback((
            tableVariant: string,
            fieldVariant: string,
            value: any
        ): boolean => {
            const fieldSchema = getFieldSchema(tableVariant, fieldVariant);
            if (!fieldSchema) return false;


            // TODO: validate data type for now.
            // Add your validation logic here based on fieldSchema.validationFunctions
            // This is a basic example


            if (fieldSchema.isRequired && (value === null || value === undefined)) {
                return false;
            }

            return true;
        }, [getFieldSchema]);


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

        const validateAndTransformData = useCallback(<T extends AutomationTableName>(
            tableVariant: AllTableNameVariations,
            data: Partial<Record<AllFieldNameVariations<T>, any>>,
            format: NameFormat = 'frontend'
        ): Record<keyof TableFields<T>, any> => {
            const tableKey = resolveTableName(tableVariant);
            const tableSchema = schema[tableKey as T];

            if (!tableSchema) {
                throw new Error(`No schema found for table: ${tableVariant}`);
            }

            const result = {...data} as Record<keyof TableFields<T>, any>;

            for (const [fieldName, field] of Object.entries(tableSchema.entityFields)) {
                const value = result[fieldName as keyof TableFields<T>];
                const converter: FieldConverter<any> = {
                    type: field.dataType.toLowerCase() as FieldType
                };

                if ((value === undefined || value === null) && field.isRequired) {
                    result[fieldName as keyof TableFields<T>] = initializeFieldValue(converter);
                    continue;
                }

                if (field.validationFunctions?.length) {
                    try {
                        field.validationFunctions.forEach(validationFnName => {
                            const validationFn = typeof validationFnName === 'string'
                                ? (globalValidations as Record<string, ValidationFunction>)[validationFnName]
                                : validationFnName;

                            if (typeof validationFn === 'function') {
                                validationFn(value);
                            }
                        });
                    } catch (error) {
                        console.error(`Validation failed for field ${fieldName}:`, error);
                        result[fieldName as keyof TableFields<T>] = initializeFieldValue(converter);
                    }
                }
            }

            return ensureId(result);
        }, [resolveTableName, schema]);


    return {
        schema,
        resolveTableName,
        getFrontendTableName,
        getBackendTableName,
        getDatabaseTableName,
        getFrontendFieldName,
        getBackendFieldName,
        getDatabaseFieldName,
        getTableNameInFormat,
        getFieldNameInFormat,
        getAllTableNames: () => allTableNames,
        getFieldSchema,
        getTableRelationships,
        getForeignKeyFields,
        getSchemaInFormat,
        getApiWrapperSchema,
        convertDataFormatSimple,
        convertDataFormatValidated,
        convertDataFormat,
        getFieldValue,
        validateFieldValue,
        processDataForInsert,
        getRelationshipType,
        removeEmptyFields,
        getFrontendTableName,
        getBackendTableName,
        getDatabaseTableName,
        getFrontendFieldName,
        getBackendFieldName,
        getDatabaseFieldName,
        getSchemaInFormat,

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

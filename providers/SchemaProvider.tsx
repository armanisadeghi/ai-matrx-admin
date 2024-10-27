import {createContext, useContext, useRef} from 'react';
import {
    TableKeys,
    UnifiedSchemaCache,
    TableNameVariant,
    TableName,
    NameFormatType,
    EntityNameMappings,
    FieldKey,
    AnyFieldNameVariant,
    TableNameFrontend,
    TableNameBackend,
    TableNameDatabase,
    TableNamePretty,
    TableNameComponent,
    TableNameKebab,
    TableNameSqlFunctionRef,
    TableNameRestAPI,
    TableNameGraphQL,
    TableNameCustom,
    TableNameVariation,
    AnyFieldKey,
    AnyTableKey,
    FieldNameFrontend,
    FieldNameBackend,
    FieldNameDatabase,
    FieldNamePretty,
    FieldNameComponent,
    FieldNameKebab,
    FieldNameSqlFunctionRef,
    FieldNameRestAPI,
    FieldNameGraphQL,
    FieldNameCustom,
    FieldNameFormatType,
    AnyTableNameVariant,
    TableFields,
    FieldNameVariation,
    FieldFormatVariation,
    AutomationTable,
    EntityField,
    FormattedTableSchema,
    GenerateFormattedTableType,
    CustomTableType,
    GraphQLTableType,
    RestAPITableType,
    SqlFunctionRefTableType,
    KebabTableType,
    ComponentTableType,
    PrettyTableType,
    DatabaseTableType,
    BackendTableType, FrontendTableType, FieldNameFormats
} from '@/types/automationTableTypes';
import { v4 as uuidv4 } from 'uuid';

type SchemaContextType = UnifiedSchemaCache;

const SchemaContext = createContext<SchemaContextType | null>(null);

interface SchemaProviderProps {
    children: React.ReactNode;
    initialSchema: SchemaContextType;
}

export function SchemaProvider({children, initialSchema}: SchemaProviderProps) {
    const schemaRef = useRef<SchemaContextType>(initialSchema);

    if (!initialSchema) {
        throw new Error('Schema must be provided to SchemaProvider');
    }

    return (
        <SchemaContext.Provider value={schemaRef.current}>
            {children}
        </SchemaContext.Provider>
    );
}

export function useSchema() {
    const context = useContext(SchemaContext);
    if (!context) {
        throw new Error('useSchema must be used within a SchemaProvider');
    }
    return context;
}

export function useSchemaResolution() {
    const {schema, tableNameMap, fieldNameMap, reverseTableNameMap, reverseFieldNameMap} = useSchema();

    const resolveTableKey = (tableName: TableNameVariant): AnyTableKey => {
        if (!(tableName in tableNameMap)) {
            throw new Error(`Invalid table name: ${tableName}`);
        }
        return tableNameMap[tableName] as AnyTableKey;
    };

    const getTableSchema = (tableName: TableNameVariant) => {
        const tableKey = resolveTableKey(tableName);
        const tableSchema = schema[tableKey] as AutomationTable<TableKeys>;
        if (!tableSchema) {
            throw new Error(`No table found for key: ${tableKey}`);
        }
        return tableSchema as AutomationTable<TableKeys>;
    }


    const findPrimaryKeyFieldKey = (tableName: TableNameVariant): AnyFieldKey | null => {
        const table = getTableSchema(tableName);
        const entityFields = table.entityFields;
        for (const fieldKey in entityFields) {
            const field = entityFields[fieldKey as keyof typeof entityFields];
            if (field.isPrimaryKey) {
                return fieldKey as AnyFieldKey;
            }
        }
        throw new Error(`No primary key found for table: ${tableName}`);
    };

    const findDisplayFieldKey = (tableName: TableNameVariant): AnyFieldKey | null => {
        const table = getTableSchema(tableName);
        const entityFields = table.entityFields;

        for (const fieldKey in entityFields) {
            const field = entityFields[fieldKey as keyof typeof entityFields];
            if (field.isDisplayField) {
                return fieldKey as AnyFieldKey;
            }
        }
        return null;
    };

    const getFieldData = (tableName: TableNameVariant, fieldName: AnyFieldNameVariant): EntityField<TableKeys, TableFields<TableKeys>> => {
        const { tableKey, fieldKey } = resolveTableAndFieldKeys(tableName, fieldName);
        const table = getTableSchema(tableKey);
        const entityFields = table.entityFields;
        const fieldData = entityFields[fieldKey as keyof typeof entityFields];
        if (!fieldData) {
            throw new Error(`Field data not found for field: ${fieldKey}`);
        }
        return fieldData as EntityField<TableKeys, TableFields<TableKeys>>;
    };

    const findFieldsByCondition = (
        tableName: TableNameVariant,
        conditionCallback: (field: EntityField<TableKeys, TableFields<TableKeys>>) => boolean
    ): AnyFieldKey[] => {
        const table = getTableSchema(tableName);
        const entityFields = table.entityFields;

        const matchingFields: AnyFieldKey[] = [];
        for (const currentFieldKey in entityFields) {
            const field = entityFields[currentFieldKey as keyof typeof entityFields];
            if (conditionCallback(field)) {
                matchingFields.push(currentFieldKey as AnyFieldKey);
            }
        }
        return matchingFields.length > 0 ? matchingFields : [];
    };

    const findFieldsWithDefaultGeneratorFunction = (tableName: TableNameVariant): AnyFieldKey[] => {
        return findFieldsByCondition(tableName, (field) => field.defaultGeneratorFunction !== null);
    };

    const getFieldsWithAttribute = (
        tableName: TableNameVariant,
        attributeName: keyof EntityField<TableKeys, TableFields<TableKeys>>
    ): { [key: string]: any } => {
        const table = getTableSchema(tableName);
        const entityFields = table.entityFields;

        const result: { [key: string]: any } = {};
        for (const fieldKey in entityFields) {
            const field = entityFields[fieldKey as keyof typeof entityFields];
            if (field && attributeName in field) {
                result[fieldKey] = field[attributeName];
            }
        }
        return result;
    };

    const getTableNameInFormat = (tableKey: AnyTableKey, format: NameFormatType): TableNameVariation<TableName, NameFormatType> => {
        if (!(tableKey in reverseTableNameMap) || !(format in reverseTableNameMap[tableKey])) {
            throw new Error(`Invalid table key or format: ${tableKey}, ${format}`);
        }

        switch (format) {
            case 'frontend':
                return reverseTableNameMap[tableKey][format] as TableNameFrontend<TableName>;
            case 'backend':
                return reverseTableNameMap[tableKey][format] as TableNameBackend<TableName>;
            case 'database':
                return reverseTableNameMap[tableKey][format] as TableNameDatabase<TableName>;
            case 'pretty':
                return reverseTableNameMap[tableKey][format] as TableNamePretty<TableName>;
            case 'component':
                return reverseTableNameMap[tableKey][format] as TableNameComponent<TableName>;
            case 'kebab':
                return reverseTableNameMap[tableKey][format] as TableNameKebab<TableName>;
            case 'sqlFunctionRef':
                return reverseTableNameMap[tableKey][format] as TableNameSqlFunctionRef<TableName>;
            case 'RestAPI':
                return reverseTableNameMap[tableKey][format] as TableNameRestAPI<TableName>;
            case 'GraphQL':
                return reverseTableNameMap[tableKey][format] as TableNameGraphQL<TableName>;
            case 'custom':
                return reverseTableNameMap[tableKey][format] as TableNameCustom<TableName>;
            default:
                return reverseTableNameMap[tableKey][format] as TableNameVariation<TableName, NameFormatType>;
        }
    };

    const resolveFieldKey = (tableKey: TableName, fieldName: AnyFieldNameVariant): AnyFieldKey => {
        if (!(tableKey in fieldNameMap) || !(fieldName in fieldNameMap[tableKey])) {
            throw new Error(`Invalid table key or field name: ${tableKey}, ${fieldName}`);
        }
        return fieldNameMap[tableKey][fieldName];
    };

    const resolveTableAndFieldKeys = (tableName: AnyTableNameVariant, fieldName: AnyFieldNameVariant): {
        tableKey: AnyTableKey;
        fieldKey: AnyFieldKey
    } => {
        const tableKey = resolveTableKey(tableName);
        const fieldKey = resolveFieldKey(tableKey, fieldName);
        return {tableKey, fieldKey};
    };


    const resolveTableNameInFormat = (tableName: AnyTableNameVariant, format: NameFormatType): EntityNameMappings<TableName>[typeof format] => {
        const tableKey = tableNameMap[tableName] as TableKeys;
        return getTableNameInFormat[tableKey][format];
    };

    const getTableObjectInFormat = <
        AnyTableKey extends TableKeys
    >(
        tableName: TableNameVariant,
        format: NameFormatType
    ) => {
        const tableSchema = getTableSchema(tableName);
        const tableKey = resolveTableKey(tableName);

        if (!(format in reverseTableNameMap[tableKey])) {
            throw new Error(`Invalid format for table: ${format}`);
        }

        const transformedFields: { [key: string]: any } = {};
        Object.entries(tableSchema.entityFields).forEach(([fieldKey, fieldValue]) => {
            const formattedFieldKey = getFieldNameInFormat(
                tableKey as AnyTableKey,
                fieldKey as TableFields<AnyTableKey>,
                format as NameFormatType
            );
            transformedFields[formattedFieldKey] = fieldValue;
        });

        switch (format) {
            case 'frontend':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as FrontendTableType<AnyTableKey>;
            case 'backend':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as BackendTableType<AnyTableKey>;
            case 'database':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as DatabaseTableType<AnyTableKey>;
            case 'pretty':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as PrettyTableType<AnyTableKey>;
            case 'component':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as ComponentTableType<AnyTableKey>;
            case 'kebab':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as KebabTableType<AnyTableKey>;
            case 'sqlFunctionRef':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as SqlFunctionRefTableType<AnyTableKey>;
            case 'RestAPI':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as RestAPITableType<AnyTableKey>;
            case 'GraphQL':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as GraphQLTableType<AnyTableKey>;
            case 'custom':
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as CustomTableType<AnyTableKey>;
            default:
                return {
                    ...tableSchema,
                    entityFields: transformedFields
                } as GenerateFormattedTableType<AnyTableKey, NameFormatType>;
        }
    };


    const getFieldNameInFormat =<
        AnyTableKey extends TableKeys,
        AnyFieldKey extends TableFields<AnyTableKey>,
        Format extends NameFormatType
    >(
        tableKey: AnyTableKey,
        fieldKey: AnyFieldKey,
        format: Format
): Format extends keyof FieldNameFormats<AnyTableKey, AnyFieldKey>
        ? FieldNameFormats<AnyTableKey, AnyFieldKey>[Format]
: never => {
        if (!(tableKey in reverseFieldNameMap) ||
            !(fieldKey in reverseFieldNameMap[tableKey]) ||
            !(format in reverseFieldNameMap[tableKey][fieldKey])) {
            throw new Error(`Invalid table key, field key or format: ${tableKey}, ${fieldKey}, ${String(format)}`);
        }

        return reverseFieldNameMap[tableKey][fieldKey][format] as FieldNameFormats<AnyTableKey, AnyFieldKey>[Format];
    };

    const resolveFieldNameInFormat =<
        Format extends NameFormatType
    >(
        tableName: TableNameVariant,
        fieldName: AnyFieldNameVariant,
        format: Format
) => {
        const {tableKey, fieldKey} = resolveTableAndFieldKeys(tableName, fieldName);
        return getFieldNameInFormat(tableKey, fieldKey, format);
    };

    const defaultGeneratorFunctions = {
        generateUUID: () => uuidv4(),
    };

    // 2. Helper function to call default generator functions if defined
    const generateDefaultValue = (generatorName: string | null) => {
        if (generatorName && generatorName in defaultGeneratorFunctions) {
            return defaultGeneratorFunctions[generatorName as keyof typeof defaultGeneratorFunctions]();
        }
        return null; // No generator, return null
    };

    // 3. Function to get fields marked as 'single' and set their default value
    const setSingleFieldsToDefault = (tableName: TableNameVariant): { [key: string]: any } => {
        const table = getTableSchema(tableName);
        const entityFields = table.entityFields;

        const fieldValues: { [key: string]: any } = {};

        for (const fieldKey in entityFields) {
            const field = entityFields[fieldKey as keyof typeof entityFields];

            if (field.structure === 'single') {
                let value;

                // Check if a defaultGeneratorFunction is defined and is a string
                if (typeof field.defaultGeneratorFunction === 'string') {
                    value = generateDefaultValue(field.defaultGeneratorFunction);
                } else {
                    // Use the defaultValue if no valid generator function is defined
                    value = field.defaultValue;
                }

                // Set the field value to the generated or default value
                fieldValues[fieldKey] = value;
            }
        }

        return fieldValues; // Return an object with the field keys and their corresponding values
    };


    return {
        resolveTableKey,
        setSingleFieldsToDefault,
        resolveFieldKey,
        resolveTableAndFieldKeys,
        getTableNameInFormat,
        getTableSchema,
        resolveTableNameInFormat,
        getFieldNameInFormat,
        resolveFieldNameInFormat,
        findPrimaryKeyFieldKey,
        findDisplayFieldKey,
        getFieldData,
        findFieldsByCondition,
        findFieldsWithDefaultGeneratorFunction,
        getFieldsWithAttribute,
    } as const;
}



export function useTableSchema(tableVariant: TableNameVariant) {
    const {schema} = useSchema();
    const {resolveTableKey} = useSchemaResolution();
    const tableKey = resolveTableKey(tableVariant);
    return schema[tableKey];
}


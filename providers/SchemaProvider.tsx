import {createContext, useContext, useRef} from 'react';
import type {
    TableKeys,
    FieldName,
    UnifiedSchemaCache,
    TableNameVariant,
    TableName,
    NameFormatType,
    FieldNameVariant,
    EntityNameMappings,
    FieldNameMappings,
} from '@/types/automationTableTypes';


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

export function useNameResolution() {
    const { tableNameMap, fieldNameMap, reverseTableNameMap, reverseFieldNameMap } = useSchema();

    const resolveTableKey = (
        tableName: TableNameVariant
    ): TableName => {
        const key = tableNameMap.get(tableName);
        if (!key) {
            throw new Error(`Unable to resolve table key for name: ${tableName}`);
        }
        return key;
    };

    const resolveFieldKey = <T extends TableName>(
        tableKey: T,
        fieldName: FieldNameVariant<T>
    ): FieldName<T> => {
        const fieldMap = fieldNameMap.get(tableKey);
        const fieldKey = fieldMap?.get(fieldName as string);
        if (!fieldKey) {
            throw new Error(`Unable to resolve field key for table ${tableKey}, field: ${fieldName}`);
        }
        return fieldKey as FieldName<T>;
    };

    const resolveTableAndFieldKeys = <T extends TableName>(
        tableName: TableNameVariant,
        fieldName: FieldNameVariant<T>
    ): {
        tableKey: T;
        fieldKey: FieldName<T>;
    } => {
        const tableKey = resolveTableKey(tableName) as T;
        const fieldKey = resolveFieldKey(tableKey, fieldName);
        return { tableKey, fieldKey };
    };

    const getTableNameInFormat = <T extends TableName>(
        tableKey: T,
        format: NameFormatType
    ): EntityNameMappings<T>[typeof format] => {
        const formatMap = reverseTableNameMap.get(tableKey);
        if (!formatMap) {
            throw new Error(`No format map found for table: ${tableKey}`);
        }
        const name = formatMap[format];
        if (!name) {
            throw new Error(`Unable to get ${format} name for table ${tableKey}`);
        }
        return name;
    };

    const resolveTableNameInFormat = <T extends TableName>(
        tableName: TableNameVariant,
        format: NameFormatType
    ): EntityNameMappings<T>[typeof format] => {
        const tableKey = resolveTableKey(tableName) as T;
        return getTableNameInFormat(tableKey, format);
    };

    const getFieldNameInFormat = <T extends TableName, F extends FieldName<T>>(
        tableKey: T,
        fieldKey: F,
        format: NameFormatType
    ): FieldNameMappings<T, F>[typeof format] => {
        const tableMap = reverseFieldNameMap.get(tableKey);
        if (!tableMap) {
            throw new Error(`No field map found for table: ${tableKey}`);
        }
        const fieldMap = tableMap.get(fieldKey);
        if (!fieldMap) {
            throw new Error(`No field map found for field: ${String(fieldKey)}`);
        }
        const name = fieldMap[format];
        if (!name) {
            throw new Error(`Unable to get ${format} name for field ${String(fieldKey)} in table ${tableKey}`);
        }
        return name;
    };

    const resolveFieldNameInFormat = <T extends TableName>(
        tableName: TableNameVariant,
        fieldName: FieldNameVariant<T>,
        format: NameFormatType
    ): FieldNameVariant<T> => {
        const { tableKey, fieldKey } = resolveTableAndFieldKeys(tableName, fieldName);
        return getFieldNameInFormat(tableKey, fieldKey, format);
    };

    return {
        resolveTableKey,
        resolveFieldKey,
        resolveTableAndFieldKeys,
        getTableNameInFormat,
        resolveTableNameInFormat,
        getFieldNameInFormat,
        resolveFieldNameInFormat
    } as const;
}

export function useTableSchema(tableVariant: TableNameVariant) {
    const {schema} = useSchema();
    const {resolveTableKey} = useNameResolution();
    const tableKey = resolveTableKey(tableVariant);
    return schema[tableKey];
}

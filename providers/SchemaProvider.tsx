// First, let's define our core types for the lookups
import { createContext, useContext, useRef } from 'react';
import {
    AutomationTableStructure,
    TableFields,
    TableNameMap,
    FieldNameMap,
    ReverseTableNameMap,
    ReverseFieldNameMap,
    AllTableNameVariations,
    AllFieldNameVariations,
    UnifiedSchemaCache
} from '@/types/automationTableTypes';
import { AutomationTableName, NameFormat } from '@/types/AutomationSchemaTypes';


type SchemaContextType = UnifiedSchemaCache;

const SchemaContext = createContext<SchemaContextType | null>(null);

interface SchemaProviderProps {
    children: React.ReactNode;
    initialSchema: SchemaContextType;
}

export function SchemaProvider({ children, initialSchema }: SchemaProviderProps) {
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

    const resolveTableKey = <T extends AutomationTableName>(
        tableName: AllTableNameVariations
    ): T => {
        const key = tableNameMap.get(tableName);
        if (!key) {
            throw new Error(`Unable to resolve table key for name: ${tableName}`);
        }
        return key as T;
    };

    const resolveFieldKey = <T extends AutomationTableName>(
        tableKey: T,
        fieldName: AllFieldNameVariations<T>
    ): keyof TableFields<T> => {
        const fieldMap = fieldNameMap.get(tableKey);
        const fieldKey = fieldMap?.get(fieldName);
        if (!fieldKey) {
            throw new Error(`Unable to resolve field key for table ${tableKey}, field: ${fieldName}`);
        }
        return fieldKey;
    };

    const resolveTableAndFieldKeys = <T extends AutomationTableName>(
        tableName: AllTableNameVariations,
        fieldName: AllFieldNameVariations<T>
    ): {
        tableKey: T;
        fieldKey: keyof TableFields<T>;
    } => {
        const tableKey = resolveTableKey<T>(tableName);
        const fieldKey = resolveFieldKey(tableKey, fieldName);
        return { tableKey, fieldKey };
    };

    const getTableNameInFormat = <T extends AutomationTableName>(
        tableKey: T,
        format: NameFormat
    ): AllTableNameVariations => {
        const formatMap = reverseTableNameMap.get(tableKey);
        if (!formatMap) {
            throw new Error(`No format map found for table: ${tableKey}`);
        }
        const names = formatMap.values();
        const name = Array.from(names).find(n => n);
        if (!name) {
            throw new Error(`Unable to get ${format} name for table ${tableKey}`);
        }
        return name as AllTableNameVariations;
    };

    const resolveTableNameInFormat = <T extends AutomationTableName>(
        tableName: AllTableNameVariations,
        format: NameFormat
    ): AllTableNameVariations => {
        const tableKey = resolveTableKey<T>(tableName);
        return getTableNameInFormat(tableKey, format);
    };

    const getFieldNameInFormat = <T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>,
        format: NameFormat
    ): AllFieldNameVariations<T> => {
        const tableMap = reverseFieldNameMap.get(tableKey);
        if (!tableMap) {
            throw new Error(`No field map found for table: ${tableKey}`);
        }
        const fieldMap = tableMap.get(fieldKey);
        if (!fieldMap) {
            throw new Error(`No field map found for field: ${String(fieldKey)}`);
        }
        const names = fieldMap.values();
        const name = Array.from(names).find(n => n);
        if (!name) {
            throw new Error(`Unable to get ${format} name for field ${String(fieldKey)} in table ${tableKey}`);
        }
        return name as AllFieldNameVariations<T>;
    };

    const resolveFieldNameInFormat = <T extends AutomationTableName>(
        tableName: AllTableNameVariations,
        fieldName: AllFieldNameVariations<T>,
        format: NameFormat
    ): AllFieldNameVariations<T> => {
        const { tableKey, fieldKey } = resolveTableAndFieldKeys<T>(tableName, fieldName);
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


// Schema access hook
export function useTableSchema<T extends AutomationTableName>(tableVariant: string) {
    const { schema } = useSchema();
    const { resolveTableKey } = useNameResolution();
    const tableKey = resolveTableKey<T>(tableVariant);
    return schema[tableKey];
}

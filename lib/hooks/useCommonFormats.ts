import { useCallback } from 'react';
import {
    TableNameFrontend,
    TableNameBackend,
    TableNameDatabase,
    FieldNameFrontend,
    FieldNameBackend,
    FieldNameDatabase,
    TableFields
} from '@/types/automationTableTypes';
import { useSchema as useBaseSchema } from '@/providers/SchemaProvider';
import {AutomationTableName} from "@/types/AutomationSchemaTypes";

export function useCommonFormats() {
    const { tableNameMap, fieldNameMap, reverseTableNameMap, reverseFieldNameMap } = useBaseSchema();

    // Direct table name getters
    const getFrontendTableName = useCallback(<T extends AutomationTableName>(
        tableKey: T
    ): TableNameFrontend<T> => {
        const formatMap = reverseTableNameMap.get(tableKey);
        const name = formatMap?.get('frontend');
        if (!name) {
            throw new Error(`No frontend name found for table ${tableKey}`);
        }
        return name as TableNameFrontend<T>;
    }, [reverseTableNameMap]);

    const getBackendTableName = useCallback(<T extends AutomationTableName>(
        tableKey: T
    ): TableNameBackend<T> => {
        const formatMap = reverseTableNameMap.get(tableKey);
        const name = formatMap?.get('backend');
        if (!name) {
            throw new Error(`No backend name found for table ${tableKey}`);
        }
        return name as TableNameBackend<T>;
    }, [reverseTableNameMap]);

    const getDatabaseTableName = useCallback(<T extends AutomationTableName>(
        tableKey: T
    ): TableNameDatabase<T> => {
        const formatMap = reverseTableNameMap.get(tableKey);
        const name = formatMap?.get('database');
        if (!name) {
            throw new Error(`No database name found for table ${tableKey}`);
        }
        return name as TableNameDatabase<T>;
    }, [reverseTableNameMap]);

    // Direct field name getters
    const getFrontendFieldName = useCallback(<T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ): FieldNameFrontend<T, typeof fieldKey> => {
        const tableMap = reverseFieldNameMap.get(tableKey);
        const fieldMap = tableMap?.get(fieldKey as string);
        const name = fieldMap?.get('frontend');
        if (!name) {
            throw new Error(`No frontend name found for field ${String(fieldKey)} in table ${tableKey}`);
        }
        return name as FieldNameFrontend<T, typeof fieldKey>;
    }, [reverseFieldNameMap]);

    const getBackendFieldName = useCallback(<T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ): FieldNameBackend<T, typeof fieldKey> => {
        const tableMap = reverseFieldNameMap.get(tableKey);
        const fieldMap = tableMap?.get(fieldKey as string);
        const name = fieldMap?.get('backend');
        if (!name) {
            throw new Error(`No backend name found for field ${String(fieldKey)} in table ${tableKey}`);
        }
        return name as FieldNameBackend<T, typeof fieldKey>;
    }, [reverseFieldNameMap]);

    const getDatabaseFieldName = useCallback(<T extends AutomationTableName>(
        tableKey: T,
        fieldKey: keyof TableFields<T>
    ): FieldNameDatabase<T, typeof fieldKey> => {
        const tableMap = reverseFieldNameMap.get(tableKey);
        const fieldMap = tableMap?.get(fieldKey as string);
        const name = fieldMap?.get('database');
        if (!name) {
            throw new Error(`No database name found for field ${String(fieldKey)} in table ${tableKey}`);
        }
        return name as FieldNameDatabase<T, typeof fieldKey>;
    }, [reverseFieldNameMap]);

    return {
        // Table name getters
        getFrontendTableName,
        getBackendTableName,
        getDatabaseTableName,

        // Field name getters
        getFrontendFieldName,
        getBackendFieldName,
        getDatabaseFieldName
    };
}

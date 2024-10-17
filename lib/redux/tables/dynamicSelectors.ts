// lib/redux/tables/selectors.ts

import { RootState } from "@/lib/redux/store";
import { TableSchema } from "@/utils/schema/schemaRegistry";

// Selector to check if data is loaded and retrieve the data
export function selectTableData<K extends keyof RootState>(tableName: K) {
    return (state: RootState) => state[tableName]?.data || [];
}

// Selector to check if the data has already been loaded
export function selectIsTableDataLoaded<K extends keyof RootState>(tableName: K) {
    return (state: RootState) => !!state[tableName]?.isLoaded;
}

// Selector to retrieve a single item by ID
export function selectTableItemById<K extends keyof RootState>(tableName: K, id: string) {
    return (state: RootState) => state[tableName]?.data?.find((item: any) => item.id === id);
}

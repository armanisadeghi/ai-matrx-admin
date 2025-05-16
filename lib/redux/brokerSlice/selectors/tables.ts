import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { Table, Column, Row } from "../types";
import { resolveBrokerId } from "../utils";

// Type guard for Table
const isTable = (value: any): value is Table =>
    value &&
    typeof value === "object" &&
    "columns" in value &&
    "rows" in value &&
    Array.isArray(value.columns) &&
    Array.isArray(value.rows);

// Input selector to avoid object creation
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Selectors
const selectTable = createSelector(
    [
        (state: RootState) => state.brokerConcept,
        selectIdArgs
    ],
    (brokerConcept, idArgs): Table | undefined => {
        const brokerId = resolveBrokerId(brokerConcept, idArgs);
        if (!brokerId) return undefined;
        
        const brokerValue = brokerConcept.brokers[brokerId];
        return isTable(brokerValue) ? brokerValue : undefined;
    }
);

const selectSortedRows = createSelector(
    [selectTable],
    (table): Row[] => {
        if (!table) return [];
        return [...table.rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
);

const selectSortedColumns = createSelector(
    [selectTable],
    (table): Column[] => {
        if (!table) return [];
        return [...table.columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
);

const selectTableExists = createSelector(
    [selectTable],
    (table): boolean => table !== undefined
);

const selectRowCount = createSelector(
    [selectTable],
    (table): number => table?.rows.length || 0
);

const selectColumnCount = createSelector(
    [selectTable],
    (table): number => table?.columns.length || 0
);

const selectRowById = createSelector(
    [selectTable, (_: RootState, __: BrokerIdentifier, rowId: string) => rowId],
    (table, rowId): Row | undefined => table?.rows.find(row => row.id === rowId)
);

const selectColumnById = createSelector(
    [selectTable, (_: RootState, __: BrokerIdentifier, columnId: string) => columnId],
    (table, columnId): Column | undefined => table?.columns.find(col => col.id === columnId)
);

export const tableSelectors = {
    selectTable,
    selectSortedRows,
    selectSortedColumns,
    selectTableExists,
    selectRowCount,
    selectColumnCount,
    selectRowById,
    selectColumnById,
};
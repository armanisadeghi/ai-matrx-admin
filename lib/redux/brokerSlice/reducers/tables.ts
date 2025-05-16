import { createSelector } from "reselect";
import { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../types";
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

// Utilities
export const normalizeTable = (table: Partial<Table> & Pick<Table, "columns" | "rows">): Table => ({
    columns: table.columns.map((col, index) => ({
        id: col.id,
        name: col.name,
        type: col.type ?? "text",
        order: col.order ?? index,
        isFixed: col.isFixed ?? false,
        minWidthClass: col.minWidthClass ?? "min-w-[150px]",
    })),
    rows: table.rows.map((row, index) => ({
        id: row.id,
        cells: { ...row.cells },
        order: row.order ?? index,
    })),
});

// Generate unique IDs for new rows/columns
const generateRowId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateColumnId = () => `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Reducers
export const tableReducers = {
    // Sets the complete table structure
    setTable(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            table: Partial<Table> & Pick<Table, "columns" | "rows">;
        }>
    ) {
        const { idArgs, table } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = normalizeTable(table);
        state.error = undefined;
    },

    // Updates a specific cell value
    updateCell(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            rowId: string;
            columnId: string;
            value: any;
        }>
    ) {
        const { idArgs, rowId, columnId, value } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const rowIndex = brokerValue.rows.findIndex(r => r.id === rowId);
        if (rowIndex === -1) return;

        const updatedRows = [...brokerValue.rows];
        updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            cells: {
                ...updatedRows[rowIndex].cells,
                [columnId]: value
            }
        };
        
        state.brokers[targetBrokerId] = {
            ...brokerValue,
            rows: updatedRows
        };
        state.error = undefined;
    },

    // Adds a new row to the table
    addRow(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            rowData?: { id?: string; cells?: { [columnId: string]: any } };
        }>
    ) {
        const { idArgs, rowData } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const defaultCells = brokerValue.columns.reduce((acc, col) => {
            acc[col.id] = "";
            return acc;
        }, {} as { [columnId: string]: any });

        const newRow: Row = {
            id: rowData?.id || generateRowId(),
            cells: { ...defaultCells, ...rowData?.cells },
            order: brokerValue.rows.length,
        };

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            rows: [...brokerValue.rows, newRow]
        };
        state.error = undefined;
    },

    // Removes a row from the table
    removeRow(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            rowId: string;
        }>
    ) {
        const { idArgs, rowId } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const updatedRows = brokerValue.rows
            .filter(row => row.id !== rowId)
            .map((row, index) => ({ ...row, order: index }));

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            rows: updatedRows
        };
        state.error = undefined;
    },

    // Adds a new column to the table
    addColumn(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            column: Partial<Column> & Pick<Column, "name">;
            defaultValue?: any;
        }>
    ) {
        const { idArgs, column, defaultValue = "" } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const newColumn: Column = {
            id: column.id || generateColumnId(),
            name: column.name,
            type: column.type ?? "text",
            order: brokerValue.columns.length,
            isFixed: column.isFixed ?? false,
            minWidthClass: column.minWidthClass ?? "min-w-[150px]",
        };

        const updatedRows = brokerValue.rows.map(row => ({
            ...row,
            cells: {
                ...row.cells,
                [newColumn.id]: defaultValue
            }
        }));

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            columns: [...brokerValue.columns, newColumn],
            rows: updatedRows
        };
        state.error = undefined;
    },

    // Removes a column from the table
    removeColumn(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            columnId: string;
        }>
    ) {
        const { idArgs, columnId } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const updatedColumns = brokerValue.columns
            .filter(col => col.id !== columnId)
            .map((col, index) => ({ ...col, order: index }));

        const updatedRows = brokerValue.rows.map(row => {
            const { [columnId]: removed, ...remainingCells } = row.cells;
            return { ...row, cells: remainingCells };
        });

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            columns: updatedColumns,
            rows: updatedRows
        };
        state.error = undefined;
    },

    // Updates a column's properties
    updateColumn(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            columnId: string;
            updates: Partial<Omit<Column, "id">>;
        }>
    ) {
        const { idArgs, columnId, updates } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const columnIndex = brokerValue.columns.findIndex(col => col.id === columnId);
        if (columnIndex === -1) return;

        const updatedColumns = [...brokerValue.columns];
        updatedColumns[columnIndex] = {
            ...updatedColumns[columnIndex],
            ...updates
        };

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            columns: updatedColumns
        };
        state.error = undefined;
    },

    // Updates row order based on provided IDs
    updateRowOrder(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            rowIds: string[];
        }>
    ) {
        const { idArgs, rowIds } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const rowMap = new Map(brokerValue.rows.map(row => [row.id, row]));
        const reorderedRows = rowIds
            .map((id, index) => {
                const row = rowMap.get(id);
                return row ? { ...row, order: index } : null;
            })
            .filter(Boolean) as Row[];

        if (reorderedRows.length !== brokerValue.rows.length) return;

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            rows: reorderedRows
        };
        state.error = undefined;
    },

    // Updates column order based on provided IDs
    updateColumnOrder(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            columnIds: string[];
        }>
    ) {
        const { idArgs, columnIds } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        const columnMap = new Map(brokerValue.columns.map(col => [col.id, col]));
        const reorderedColumns = columnIds
            .map((id, index) => {
                const col = columnMap.get(id);
                return col ? { ...col, order: index } : null;
            })
            .filter(Boolean) as Column[];

        if (reorderedColumns.length !== brokerValue.columns.length) return;

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            columns: reorderedColumns
        };
        state.error = undefined;
    },

    // Clears all table data
    clearTable(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue || !isTable(brokerValue)) return;

        state.brokers[targetBrokerId] = {
            ...brokerValue,
            rows: []
        };
        state.error = undefined;
    },
};


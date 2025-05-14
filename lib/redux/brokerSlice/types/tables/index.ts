import { createSelector } from 'reselect';
import { PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux';
import { BrokerState, BrokerIdentifier } from '../../core/types';
import { Table, Column, Row } from './types';
import { ensureBrokerIdAndMapping, getBrokerId } from '../../core/helpers';

// Utilities
export const normalizeTable = (table: Partial<Table> & Pick<Table, 'columns' | 'rows'>): Table => ({
    columns: table.columns.map((col, index) => ({
        id: col.id,
        name: col.name,
        type: col.type ?? 'text',
        order: col.order ?? index,
        isFixed: col.isFixed ?? false,
        minWidthClass: col.minWidthClass ?? 'min-w-[150px]',
    })),
    rows: table.rows.map((row, index) => ({
        id: row.id,
        cells: { ...row.cells },
        order: row.order ?? index,
    })),
});

// Actions
export const tableReducers = {
    setBrokerTable(state: BrokerState, action: PayloadAction<{
        idArgs: BrokerIdentifier;
        table: Partial<Table> & Pick<Table, 'columns' | 'rows'>;
    }>) {
        const { idArgs, table } = action.payload;
        const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
        if (!targetBrokerId) {
            state.error = 'No brokerId could be resolved or created for table';
            return;
        }
        state.brokers[targetBrokerId] = normalizeTable(table);
        state.error = undefined;
    },
    updateTableCell(state: BrokerState, action: PayloadAction<{
        idArgs: BrokerIdentifier;
        rowId: string;
        columnId: string;
        value: any;
    }>) {
        const { idArgs, rowId, columnId, value } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        const row = table.rows.find(r => r.id === rowId);
        if (row) row.cells[columnId] = value;
    },
    addTableRow(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        const newRow: Row = {
            id: `row-${Date.now()}`,
            cells: table.columns.reduce((acc, col) => {
                acc[col.id] = '';
                return acc;
            }, {} as { [columnId: string]: any }),
            order: table.rows.length,
        };
        table.rows.push(newRow);
    },
    deleteTableRow(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; rowId: string }>) {
        const { idArgs, rowId } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        table.rows = table.rows.filter(row => row.id !== rowId).map((row, index) => ({
            ...row,
            order: index,
        }));
    },
    addTableColumn(state: BrokerState, action: PayloadAction<{
        idArgs: BrokerIdentifier;
        column: Partial<Column> & Pick<Column, 'id' | 'name'>;
    }>) {
        const { idArgs, column } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        const newColumn: Column = {
            id: column.id,
            name: column.name,
            type: column.type ?? 'text',
            order: table.columns.length,
            isFixed: column.isFixed ?? false,
            minWidthClass: column.minWidthClass ?? 'min-w-[150px]',
        };
        table.columns.push(newColumn);
        table.rows.forEach(row => {
            row.cells[newColumn.id] = '';
        });
    },
    deleteTableColumn(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; columnId: string }>) {
        const { idArgs, columnId } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        table.columns = table.columns.filter(col => col.id !== columnId).map((col, index) => ({
            ...col,
            order: index,
        }));
        table.rows.forEach(row => {
            delete row.cells[columnId];
        });
    },
    renameTableColumn(state: BrokerState, action: PayloadAction<{
        idArgs: BrokerIdentifier;
        columnId: string;
        newName: string;
    }>) {
        const { idArgs, columnId, newName } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        const column = table.columns.find(col => col.id === columnId);
        if (column) column.name = newName;
    },
    reorderTableRows(state: BrokerState, action: PayloadAction<{
        idArgs: BrokerIdentifier;
        rowIds: string[];
    }>) {
        const { idArgs, rowIds } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        const rowMap = new Map(table.rows.map(row => [row.id, row]));
        table.rows = rowIds.map((id, index) => ({
            ...rowMap.get(id)!,
            order: index,
        }));
    },
    reorderTableColumns(state: BrokerState, action: PayloadAction<{
        idArgs: BrokerIdentifier;
        columnIds: string[];
    }>) {
        const { idArgs, columnIds } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId || !state.brokers[targetBrokerId]) return;
        const table = state.brokers[targetBrokerId] as Table;
        const columnMap = new Map(table.columns.map(col => [col.id, col]));
        table.columns = columnIds.map((id, index) => ({
            ...columnMap.get(id)!,
            order: index,
        }));
    },
};

// Selectors
const selectBrokerTable = createSelector(
    [(state: RootState, idArgs: BrokerIdentifier) => state.brokerConcept.brokers[getBrokerId(state.brokerConcept, idArgs) || '']],
    (brokerValue): Table | undefined => {
        if (brokerValue && 'columns' in brokerValue && 'rows' in brokerValue) {
            return brokerValue as Table;
        }
        return undefined;
    }
);

const selectSortedTableRows = createSelector(
    [selectBrokerTable],
    (table): Row[] => table?.rows.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || []
);

const selectSortedTableColumns = createSelector(
    [selectBrokerTable],
    (table): Column[] => table?.columns.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || []
);

export const tableSelectors = {
    selectBrokerTable,
    selectSortedTableRows,
    selectSortedTableColumns,
};
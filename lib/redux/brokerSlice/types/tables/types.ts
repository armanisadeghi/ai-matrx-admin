// lib/redux/brokerSlice/types/tables/types.ts

export interface Table {
    columns: Column[];
    rows: Row[];
}

export interface Column {
    id: string;
    name: string;
    type?: string;
    order?: number;
    isFixed?: boolean;        // Whether the column is draggable/deletable
    minWidthClass?: string;   // CSS class for minimum width
}

export interface Row {
    id: string;
    cells: { [columnId: string]: any };
    order?: number;
}
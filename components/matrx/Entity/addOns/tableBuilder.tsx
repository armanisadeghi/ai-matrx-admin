'use client';
import { createTableColumnDefinitions } from './columnDefinitions';
import { ColumnDef } from "@tanstack/react-table";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { ColumnOptions } from '@/components/matrx/Entity/types/tableBuilderTypes';

export const buildTableColumns = <TEntity extends EntityKeys>(
    columns: ColumnOptions[]
): ColumnDef<EntityData<TEntity>>[] => {
    const columnDefinitions = createTableColumnDefinitions<TEntity>();

    return columns.map((column) => {
        const creator = columnDefinitions[`create${column.type.charAt(0).toUpperCase() + column.type.slice(1)}Column`];
        if (!creator) {
            throw new Error(`Unsupported column type: ${column.type}`);
        }

        if (column.type === 'select') {
            return creator();
        }
        return creator('options' in column ? column.options : {});
    });
};

export const buildColumnsFromTableColumns = <TEntity extends EntityKeys>(
    tableColumns: Array<{ key: string; title: string }>,
    additionalColumns: ColumnOptions[] = []
): ColumnDef<EntityData<TEntity>>[] => {
    const basicColumns = tableColumns.map(col => ({
        type: "data" as const,
        options: {
            key: col.key,
            title: col.title,
        }
    }));

    return buildTableColumns<TEntity>([
        { type: "select" },
        ...basicColumns,
        ...additionalColumns
    ]);
};

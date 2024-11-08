// app/(authenticated)/tests/table-test/entity-table-test/page.tsx

'use client';

import React, { useEffect } from 'react';
import ModernTable from "@/app/(authenticated)/tests/table-test/custom-table/ModernTable";
import { MatrixColumn, TableData } from "@/types/tableTypes";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAllFieldPrettyNames } from "@/lib/redux/schema/globalCacheSelectors";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { useEntity } from "@/lib/redux/entity/useEntity";
import { MatrxRecordId } from '@/lib/redux/entity/types';

interface EntityTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

export function EntityTable<TEntity extends EntityKeys>({ entityKey }: EntityTableProps<TEntity>) {
    const entity = useEntity(entityKey);

    // Log initial mount
    useEffect(() => {
        console.log('EntityTable mounted with key:', entityKey);
        console.log('Initial records:', entity.allRecords);
        console.log('Initial metadata:', entity.metadataSummary);
    }, []);

    // Modified fetch effect
    useEffect(() => {
        console.log('Fetching records...');
        entity.fetchAll();
    }, [entityKey]);

    // Get pretty names for fields
    const fieldPrettyNames = useAppSelector((state) =>
        selectAllFieldPrettyNames(state, { entityName: entityKey })
    );

    const columns: MatrixColumn<TableData>[] = [
        ...Object.entries(fieldPrettyNames).map(([fieldName, prettyName]) => ({
            Header: prettyName,
            accessor: fieldName,
        })),
        {
            Header: 'Actions',
            accessor: 'actions',
            Cell: () => null,
            actions: [
                { name: 'view', position: 'after' },
                { name: 'edit', position: 'after' },
                { name: 'delete', position: 'after' },
            ],
        }
    ];

    // Default visible columns (excluding some internal fields if needed)
    const defaultVisibleColumns = Object.keys(fieldPrettyNames).concat(['actions']);

    // Fetch data on mount
    useEffect(() => {
        entity.fetchAll();
    }, []);

    const handleExpand = (item: TableData) => {
        console.log('Expanding item:', item);
    };

    const tableData = Object.values(entity.allRecords) as TableData[];

    if (entity.loadingState.loading) {
        return <div>Loading...</div>;
    }

    const handleAdd = (record: EntityData<TEntity>) => {
        console.log('Add action:', record);
    }

    const handleEdit = (record: EntityData<TEntity>) => {
        console.log('Edit action:', record);
    }

    const handleDelete = (record: EntityData<TEntity>) => {
        console.log('Delete action:', record);
    }

    return (
        <div className="p-2">
            <ModernTable
                columns={columns}
                data={tableData}
                defaultVisibleColumns={defaultVisibleColumns}
                className="pb-4 rounded-3xl bg-neutral-100 dark:bg-neutral-800"
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onExpand={handleExpand}
            />
        </div>
    );
}

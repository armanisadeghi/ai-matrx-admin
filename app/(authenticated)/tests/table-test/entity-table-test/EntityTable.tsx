// app/(authenticated)/tests/table-test/entity-table-test/page.tsx

'use client';

import React, { useEffect } from 'react';
import ModernTable from "@/app/(authenticated)/tests/table-test/ModernTable";
import { MatrixColumn, TableData } from "@/types/tableTypes";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAllFieldPrettyNames } from "@/lib/redux/schema/globalCacheSelectors";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { createEntityHooks } from "@/lib/redux/entity/useEntity";
import { MatrxRecordId } from '@/lib/redux/entity/types';

interface EntityTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

export function EntityTable<TEntity extends EntityKeys>({ entityKey }: EntityTableProps<TEntity>) {
    const useEntity = createEntityHooks(entityKey);
    const {
        records,
        loading,
        fetchRecords,
        actions,  // Get actions directly
        metadata
    } = useEntity();

    // Log initial mount
    useEffect(() => {
        console.log('EntityTable mounted with key:', entityKey);
        console.log('Initial records:', records);
        console.log('Initial metadata:', metadata);
    }, [entityKey, records, metadata]);

    // Modified fetch effect
    useEffect(() => {
        console.log('Fetching records...');
        fetchRecords(1, 1000);
        // Also try dispatching directly
        // dispatch(actions.fetchRecords({ page: 1, pageSize: 1000 }));
    }, [fetchRecords]);

    // Get pretty names for fields
    const fieldPrettyNames = useAppSelector((state) =>
        selectAllFieldPrettyNames(state, { entityName: entityKey })
    );

    // Create columns based on field names
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
        fetchRecords(1, 1000); // Fetch all records for now
    }, [fetchRecords]);

    // Table action handlers
    const handleAdd = async (newItem: Omit<TableData, 'id'>) => {
        try {
            await createRecord(newItem as EntityType);
        } catch (error) {
            console.error('Error adding record:', error);
        }
    };

    const handleEdit = async (item: TableData) => {
        try {
            const typedItem = item as EntityType;
            const primaryKeyValues = metadata.primaryKeyMetadata.fields.reduce((acc, field) => {
                acc[field] = typedItem[field];
                return acc;
            }, {} as Record<string, MatrxRecordId>);

            await updateRecord(typedItem, { ...typedItem });
        } catch (error) {
            console.error('Error updating record:', error);
        }
    };

    const handleDelete = async (item: TableData) => {
        try {
            const typedItem = item as EntityType;
            const primaryKeyValues = metadata.primaryKeyMetadata.fields.reduce((acc, field) => {
                acc[field] = typedItem[field];
                return acc;
            }, {} as Record<string, MatrxRecordId>);

            await deleteRecord(typedItem);
        } catch (error) {
            console.error('Error deleting record:', error);
        }
    };

    const handleExpand = (item: TableData) => {
        console.log('Expanding item:', item);
    };

    // Convert records object to array for table data
    const tableData = Object.values(records) as TableData[];

    if (loading.loading) {
        return <div>Loading...</div>;
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

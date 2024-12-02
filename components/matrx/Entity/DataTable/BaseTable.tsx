"use client"

import * as React from "react"
import {Row, useReactTable,} from "@tanstack/react-table"
import {EntityKeys} from "@/types/entityTypes"
import {buildColumnsFromTableColumns} from "@/components/matrx/Entity/addOns/tableBuilder";
import {createDefaultTableActions} from '@/components/matrx/Entity/action/defaultActions';
import {DefaultTable} from "@/components/matrx/Entity/DataTable/variants/DefaultTable";
import {DEFAULT_TABLE_OPTIONS, useEntityDataTable} from "@/components/matrx/Entity/hooks/useEntityDataTable";
import {EntityDataWithId} from "@/lib/redux/entity/types/stateTypes";

export interface DataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    variant?: 'default' | 'compact' | 'cards' | 'minimal';
    options?: {
        showCheckboxes?: boolean;
        showFilters?: boolean;
        showActions?: boolean;
        actions?: {
            showEdit?: boolean;
            showDelete?: boolean;
            showExpand?: boolean;
            custom?: Array<{
                label: string;
                onClick: (row: EntityDataWithId<TEntity>) => void;
                variant?: "outline" | "destructive";
                size?: "xs" | "sm";
            }>;
        };
    };
}

export const DEFAULT_OPTIONS = {
    showCheckboxes: true,
    showFilters: true,
    showActions: true,
    actions: {
        showEdit: true,
        showDelete: true,
        showExpand: true,
    }
};

export function EntityBaseTable<TEntity extends EntityKeys>(
    {
        entityKey,
        options = DEFAULT_OPTIONS
    }: DataTableProps<TEntity>) {
    const {
        loadingState,
        paginationInfo,
        handleSingleSelection,
        primaryKeyMetadata,
        matrxTableData: {
            tanstackConfig,
            tableState,
            tanstackColumns,
            tanstackUtils,
            columnUtils,
            defaults,
        },
    } = useEntityDataTable(entityKey);

    React.useEffect(() => {
        tanstackConfig.onPaginationChange?.({
            pageIndex: 0,
            pageSize: defaults.defaultPageSize
        });
    }, [entityKey]);


    const [selectedRow, setSelectedRow] = React.useState<EntityDataWithId<TEntity> | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<string>('view');

    const handleAction = React.useCallback((actionName: string, row: Row<EntityDataWithId<TEntity>>) => {
        console.log('Action:', actionName, 'Row:', row.original);
        handleSingleSelection(row.original.matrxRecordId);
        setSelectedRow(row.original);
        setActiveTab(actionName);
        setIsModalOpen(true);
    }, [setSelectedRow, setActiveTab, setIsModalOpen, handleSingleSelection]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRow(null);
    };

    const defaultActions = React.useMemo(() =>
            createDefaultTableActions(handleAction)
        , [handleAction]);

    const columnsWithActions = React.useMemo(() => {
        const baseColumns = (tanstackConfig.columns || []).map(col => ({
            key: col.id,
            title: String(col.header)
        }));

        return buildColumnsFromTableColumns<TEntity>(
            baseColumns,
            options.showActions ? [defaultActions.expanded] : []
        );
    }, [tanstackConfig.columns, options.showActions, defaultActions.expanded]);

    const table = useReactTable<EntityDataWithId<TEntity>>({
        ...tanstackConfig,
        columns: columnsWithActions,
        data: tanstackConfig.data || [],
        state: {
            ...tanstackConfig.state,
            columnVisibility: tableState.columnVisibility,
            globalFilter: tableState.globalFilter,
        },
        onColumnVisibilityChange: tanstackConfig.onColumnVisibilityChange,
        onGlobalFilterChange: tanstackConfig.onGlobalFilterChange,
    });


    return (
        <div className="space-y-4">
            {options.showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filter row */}
                </div>
            )}
            <DefaultTable
                table={table}
                config={tanstackConfig}
                options={options}
                tableState={tableState}
                loadingState={loadingState}
                paginationInfo={paginationInfo}
                columnsWithActions={columnsWithActions}
                selectedRow={selectedRow}
                isModalOpen={isModalOpen}
                handleCloseModal={handleCloseModal}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setIsModalOpen={setIsModalOpen}
                handleAction={handleAction}
            />
        </div>
    );
}





"use client"

import * as React from "react"
import {useReactTable,} from "@tanstack/react-table"
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {useEntity} from "@/lib/redux/entity/useEntity"
import {EntityKeys, EntityData} from "@/types/entityTypes"
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert"
import {buildColumnsFromTableColumns} from "@/components/matrx/Entity/addOns/tableBuilder";
import {createDefaultTableActions} from '@/components/matrx/Entity/action/defaultActions';
import {DataTableProps, DEFAULT_OPTIONS} from "@/components/matrx/Entity/types/entityTable";
import {DefaultTable} from "@/components/matrx/Entity/DataTable/variants/DefaultTable";

export function EntityBaseTable<TEntity extends EntityKeys>(
    {
        entityKey,
        options = DEFAULT_OPTIONS
    }: DataTableProps<TEntity>) {
    const {
        loadingState,
        paginationInfo,
        matrxTableData: {
            config,
            state: tableState,
            utils: tableUtils,
            defaultPageSize,
        }
    } = useEntity(entityKey);

    React.useEffect(() => {
        config.onPaginationChange?.({
            pageIndex: 0,
            pageSize: defaultPageSize
        });
    }, [entityKey]);

    // Modal state
    const [selectedRow, setSelectedRow] = React.useState<EntityData<TEntity> | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<string>('view');

    const handleAction = React.useCallback((actionName: string, rowData: EntityData<TEntity>) => {
        setSelectedRow(rowData);
        setActiveTab(actionName);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRow(null);
    };

    const defaultActions = React.useMemo(() =>
            createDefaultTableActions(handleAction)
        , [handleAction]);

    const columnsWithActions = React.useMemo(() => {
        const baseColumns = (config.columns || []).map(col => ({
            key: col.id,
            title: String(col.header)
        }));

        return buildColumnsFromTableColumns<TEntity>(
            baseColumns,
            options.showActions ? [defaultActions.expanded] : []
        );
    }, [config.columns, options, defaultActions]);

    const table = useReactTable({
        ...config,
        columns: columnsWithActions,
        data: config.data || [],
        state: {
            ...config.state,
            columnVisibility: tableState.columnVisibility,
            globalFilter: tableState.globalFilter,
        },
        onColumnVisibilityChange: config.onColumnVisibilityChange,
        onGlobalFilterChange: config.onGlobalFilterChange,
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
                config={config}
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





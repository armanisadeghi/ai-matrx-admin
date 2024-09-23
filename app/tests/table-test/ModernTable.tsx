import React, { useState, useMemo, useCallback } from 'react';
import {
    useTable,
    useSortBy,
    useGlobalFilter,
    usePagination,
    Column,
    UseGlobalFiltersInstanceProps,
    UsePaginationInstanceProps,
    UseSortByInstanceProps,
    UseTableInstanceProps,
    TableState
} from 'react-table';
import { Table } from '@/components/ui/table';
import DialogForm from "./DialogForm";
import ColumnSettingsModal from "@/app/tests/table-test/ColumnSettingsModal";
import TableBottomSection from "@/app/tests/table-test/TableBottomSection";
import { cn } from "@/styles/themes/utils"
import TableTopOptions from "@/app/tests/table-test/TableTopOptions";
import {deleteAction, editAction, expandAction, viewAction} from "@/app/tests/table-test/actionDefinitions";
import CustomTableHeader from "@/app/tests/table-test/CustomTableHeader";
import CustomTableBody from "@/app/tests/table-test/CustomTableBody";

export interface TableData {
    id: number | string;
    [key: string]: any;
}

interface ModernTableProps {
    columns: Column<TableData>[];
    data: TableData[];
    defaultVisibleColumns?: string[];
    className?: string;
}

type TableInstance = UseTableInstanceProps<TableData> &
    UseGlobalFiltersInstanceProps<TableData> &
    UsePaginationInstanceProps<TableData> &
    UseSortByInstanceProps<TableData>;

interface ExtendedTableState extends TableState<TableData> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
}

const ModernTable: React.FC<ModernTableProps> = ({ columns, data, defaultVisibleColumns, className }) => {
    const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleColumns || columns.map(col => col.accessor as string));
    const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

    const allColumns = useMemo(() => columns, [columns]);

    const visibleColumnsData = useMemo(
        () => allColumns.filter(column => visibleColumns.includes(column.accessor as string)),
        [allColumns, visibleColumns]
    );

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        page,
        prepareRow,
        state,
        setGlobalFilter,
        nextPage,
        previousPage,
        canNextPage,
        canPreviousPage,
        pageCount,
        gotoPage,
        setPageSize,
    } =  useTable(
        {
            columns: visibleColumnsData,
            data,
            initialState: {pageSize: 10} as Partial<ExtendedTableState>,
        },
        useGlobalFilter,
        useSortBy,
        usePagination
    ) as unknown as TableInstance;

    const { globalFilter, pageIndex, pageSize } = state as ExtendedTableState;

    const pageNumbers = [];
    const totalPages = pageCount;
    const currentPage = pageIndex + 1;

    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        if (currentPage <= 3) {
            pageNumbers.push(1, 2, 3, 4, 5);
        } else if (currentPage >= totalPages - 2) {
            pageNumbers.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pageNumbers.push(currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2);
        }
    }



    const truncateText = (text: unknown, maxLength: number = 100): string => {
        if (typeof text !== 'string') {
            return String(text);
        }
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'delete' | 'view'>('add');
    const [selectedItem, setSelectedItem] = useState<TableData | null>(null);

    const handleDialogAction = useCallback((action: string, formData?: Record<string, string>) => {
        const handler = (window as any)[`handle${action.charAt(0).toUpperCase() + action.slice(1)}`];
        if (typeof handler === 'function') {
            handler(selectedItem, formData);
        } else {
            console.warn(`Handler for action "${action}" not found`);
        }
        setModalOpen(false);
        setSelectedItem(null);
    }, [selectedItem]);

    const openModal = useCallback((mode: 'add' | 'edit' | 'delete' | 'view', item: TableData | null = null) => {
        setDialogMode(mode);
        setSelectedItem(item);
        setModalOpen(true);
    }, []);

    const handleSearchChange = (value: string) => {
        setGlobalFilter(value);
    };

    const columnNames = useMemo(() => allColumns.map((col) => col.Header as string), [allColumns]);

    const handleAction = useCallback((actionName: string, rowData: TableData) => {
        switch(actionName) {
            case 'view':
                openModal('view', rowData);
                break;
            case 'edit':
                openModal('edit', rowData);
                break;
            case 'delete':
                openModal('delete', rowData);
                break;
            case 'expand':
                console.log('Expanding', rowData);
                // Implement expand logic here
                break;
            default:
                console.warn(`Unknown action: ${actionName}`);
        }
    }, [openModal]);


    const bodyProps = {
        page,
        prepareRow,
        truncateText,
        actions: [
            { ...expandAction, name: 'expand' },
            { ...viewAction, name: 'view' },
            { ...editAction, name: 'edit' },
            { ...deleteAction, name: 'delete' }
        ],
        onAction: handleAction,
        visibleColumns,
    };


    return (
        <div className={cn("p-3 space-y-4", className)}>
            <TableTopOptions
                columnNames={columnNames}
                handleSearchChange={handleSearchChange}
                pageSize={pageSize}
                setPageSize={setPageSize}
                handleAdd={() => openModal('add')}
                setColumnSettingsOpen={setColumnSettingsOpen}
                columnSettingsOpen={columnSettingsOpen}
            />
            <div className="relative overflow-hidden shadow-md sm:rounded-lg">
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden border rounded-xl bg-matrxBorder">
                            <Table {...getTableProps()}
                                   className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <CustomTableHeader headerGroups={headerGroups}/>
                                <CustomTableBody {...bodyProps} />
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
            <TableBottomSection
                currentPage={currentPage}
                pageNumbers={pageNumbers}
                canPreviousPage={canPreviousPage}
                canNextPage={canNextPage}
                previousPage={previousPage}
                nextPage={nextPage}
                gotoPage={gotoPage}
            />
            <DialogForm
                open={modalOpen}
                onOpenChange={setModalOpen}
                mode={dialogMode}
                columns={allColumns}
                data={selectedItem}
                onAction={handleDialogAction}
            />
            <ColumnSettingsModal
                open={columnSettingsOpen}
                onOpenChange={setColumnSettingsOpen}
                columns={allColumns}
                visibleColumns={visibleColumns}
                setVisibleColumns={setVisibleColumns}
            />
        </div>
    );
};

export default ModernTable;

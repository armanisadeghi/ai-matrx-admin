// app/(authenticated)/tests/matrx-table/components/MatrxTable.tsx

import React, {useMemo} from 'react';
import dynamic from 'next/dynamic';
import {useTable, useSortBy} from 'react-table';
import {Table} from "@/components/ui/table";
import {TableData} from "./table.types";
const MatrxTableHeader = dynamic(() => import('./MatrxTableHeader'), {ssr: false});
const MatrxTableBody = dynamic(() => import('./MatrxTableBody'), {ssr: false});

interface MatrxTableProps {
    data: TableData[];
    actions?: string[];
    onAction?: (actionName: string, rowData: TableData) => void;
    visibleColumns?: string[];
    truncateAt?: number;
    customModalContent?: (rowData: TableData) => React.ReactNode;
}

const MatrxTable: React.FC<MatrxTableProps> = (
    {
        data,
        actions,
        onAction,
        visibleColumns,
        truncateAt,
        customModalContent
    }) => {
    const columns = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).map(key => ({
            Header: key.charAt(0).toUpperCase() + key.slice(1),
            accessor: key,
        }));
    }, [data]);

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable(
        {
            columns,
            data,
        },
        useSortBy
    );

    return (
        <div className="relative overflow-hidden shadow-md sm:rounded-lg">
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden border rounded-xl bg-matrxBorder">
                        <Table {...getTableProps()}
                               className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <MatrxTableHeader headerGroups={headerGroups}/>
                            <MatrxTableBody
                                data={data}
                                actions={actions}
                                onAction={onAction}
                                visibleColumns={visibleColumns}
                                truncateAt={truncateAt}
                                customModalContent={customModalContent}
                                getTableBodyProps={getTableBodyProps}
                            />
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatrxTable;



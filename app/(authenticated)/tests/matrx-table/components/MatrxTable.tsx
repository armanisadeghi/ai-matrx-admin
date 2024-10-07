// app/(authenticated)/tests/matrx-table/components/MatrxTable.tsx
'use client';

import React, {useMemo} from 'react';
import dynamic from 'next/dynamic';
import {useTable, useSortBy} from 'react-table';
import {Table} from "@/components/ui/table";
import {TableData} from "./table.types";
import MatrxTableHeader from "@/app/(authenticated)/tests/matrx-table/components/MatrxTableHeader";
import MatrxTableBody from "@/app/(authenticated)/tests/matrx-table/components/MatrxTableBody";
// const MatrxTableHeader = dynamic(() => import('./MatrxTableHeader'), {ssr: false});
// const MatrxTableBody = dynamic(() => import('./MatrxTableBody'), {ssr: false});

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
        <div className="relative overflow-hidden shadow-md sm:rounded-lg scrollbar-hide">
            <div className="overflow-x-auto scrollbar-hide">
                <div className="inline-block min-w-full align-middle scrollbar-hide">
                    <div className="overflow-hidden border rounded-xl bg-matrxBorder scrollbar-hide">
                        <Table {...getTableProps()}
                               className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 scrollbar-hide">
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



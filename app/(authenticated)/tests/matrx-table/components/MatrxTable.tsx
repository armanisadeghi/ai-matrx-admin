// app/(authenticated)/tests/matrx-table/components/MatrxTable.tsx

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTable, useSortBy } from 'react-table';
import { Table } from "@/components/ui/table";
import { TableData } from "./table.types";

const DynamicCustomTableHeader = dynamic(() => import('./CustomTableHeader'), { ssr: false });
const DynamicCustomTableBody = dynamic(() => import('./MatrxTableBody'), { ssr: false });

interface MatrxTableProps {
    data: TableData[];
    actions?: string[];
    onAction?: (actionName: string, rowData: TableData) => void;
    visibleColumns?: string[];
    truncateAt?: number;
    customModalContent?: (rowData: TableData) => React.ReactNode;
}

const MatrxTable: React.FC<MatrxTableProps> = ({
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
        <Table {...getTableProps()}>
            <DynamicCustomTableHeader headerGroups={headerGroups} />
            <DynamicCustomTableBody
                data={data}
                actions={actions}
                onAction={onAction}
                visibleColumns={visibleColumns}
                truncateAt={truncateAt}
                customModalContent={customModalContent}
                getTableBodyProps={getTableBodyProps}
            />
        </Table>
    );
};

export default MatrxTable;

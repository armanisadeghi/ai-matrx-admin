// app/(authenticated)/tests/table-test/hold-hold-page.tsx

'use client';

import React from 'react';
import ModernTable from "@/app/(authenticated)/tests/table-test/custom-table/ModernTable";
import {CurrentTableData, currentData} from "@/app/(authenticated)/tests/table-test/custom-table/data";
import {MatrixColumn} from "@/types/tableTypes";

const defaultVisibleColumns = [
    'name', 'age', 'email', 'country', 'occupation', 'salary', 'start_date', 'actions',
];

const columns: MatrixColumn<CurrentTableData>[] = [
    {Header: 'ID', accessor: 'id'},
    {Header: 'Name', accessor: 'name'},
    {Header: 'Age', accessor: 'age'},
    {Header: 'Email', accessor: 'email'},
    {Header: 'Country', accessor: 'country'},
    {
        Header: 'Occupation',
        accessor: 'occupation',
        actions: [{name: 'expand', position: 'before'}]
    },
    {Header: 'Salary', accessor: 'salary'},
    {Header: 'Start Date', accessor: 'start_date'},
    {
        Header: 'Actions', accessor: 'actions', Cell: () => null,
        actions: [
            {name: 'view', position: 'after'},
            {name: 'edit', position: 'after'},
            {name: 'delete', position: 'after'},
        ],
    },
];

export default function TablePage() {
    const handleAdd = (newItem: Omit<CurrentTableData, 'id'>) => {
        console.log('Adding new item.tsx:', newItem);
    };

    const handleEdit = (item: CurrentTableData) => {
        console.log('Editing item.tsx:', item);
    };

    const handleDelete = (item: CurrentTableData) => {
        console.log('Deleting item.tsx:', item);
    };

    const handleExpand = (item: CurrentTableData) => {
        console.log('Expanding item.tsx:', item);
    };

    return (
        <div className="p-2">
            <ModernTable
                columns={columns}
                data={currentData}
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

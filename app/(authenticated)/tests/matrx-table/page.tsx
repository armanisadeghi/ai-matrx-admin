// app/(authenticated)/tests/matrx-table/hold-hold-page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { EmployeeData } from "@/app/(authenticated)/tests/matrx-table/test-data/sample-employees";
import { FlashcardData } from "@/app/(authenticated)/tests/matrx-table/test-data/sample-flashcards";
import MatrxTablePage from "@/app/(authenticated)/tests/matrx-table/components/MatrxTablePage";
import {currentData, CurrentTableData} from "@/app/(authenticated)/tests/table-test/data";
import {MatrixColumn} from "@/app/(authenticated)/tests/table-test/table.types";

const DynamicMatrxTable = dynamic(() => import('./components/MatrxTable'), { ssr: false });

const tableDataOne = EmployeeData;
const tableDataTwo = FlashcardData;


// This should not be needed, for the most part. The new system has automated this.

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

// --------------------------------------------------------------------------------


const MatrxTableTestPage: React.FC = () => {
    const handleAction = (actionName: string, rowData: any) => {
        console.log(`Action: ${actionName}`, rowData);
    };


    const handleAddTemp = (newItem: Omit<CurrentTableData, 'id'>) => {
        console.log('Adding new item:', newItem);
    };

    const handleEditTemp = (item: CurrentTableData) => {
        console.log('Editing item:', item);
    };

    const handleDeleteTemp = (item: CurrentTableData) => {
        console.log('Deleting item:', item);
    };

    const handleExpandTemp = (item: CurrentTableData) => {
        console.log('Expanding item:', item);
    };


    return (

        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">MatrxTable Test Page</h1>

            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Employee Data Table (Default Modal)</h2>
                <DynamicMatrxTable
                    data={tableDataOne}
                    onAction={handleAction}
                />
            </div>

            {/*<div className="mb-8">*/}
            {/*    <h2 className="text-xl font-semibold mb-2">Employee Data Table (Default Modal)</h2>*/}
            {/*    <MatrxTablePage*/}
            {/*        data={tableDataOne}*/}
            {/*        onAction={handleAction}*/}
            {/*        columns={columns}*/}
            {/*        defaultVisibleColumns={defaultVisibleColumns}*/}
            {/*        className="pb-4 rounded-3xl bg-neutral-100 dark:bg-neutral-800"*/}
            {/*        onAdd={handleAddTemp}*/}
            {/*        onEdit={handleEditTemp}*/}
            {/*        onDelete={handleDeleteTemp}*/}
            {/*        onExpand={handleExpandTemp}*/}

            {/*    />*/}
            {/*</div>*/}


            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Flashcard Data Table (Custom Modal Content)</h2>
                <DynamicMatrxTable
                    data={tableDataTwo}
                    onAction={handleAction}
                    actions={['view', 'edit', 'delete']}
                    truncateAt={50}
                    customModalContent={(rowData) => (
                        <div className="p-4 bg-accent rounded-md">
                            <h3 className="text-lg font-semibold mb-2">{rowData.front}</h3>
                            <p>{rowData.back}</p>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

export default MatrxTableTestPage;

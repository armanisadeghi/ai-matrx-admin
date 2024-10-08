// app/(authenticated)/tests/matrx-table/hold-hold-page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { EmployeeData } from "@/app/(authenticated)/tests/matrx-table/test-data/sample-employees";
import { FlashcardData } from "@/app/(authenticated)/tests/matrx-table/test-data/sample-flashcards";
import MatrxTablePage from "@/app/(authenticated)/tests/matrx-table/components/MatrxTablePage";
import {currentData, CurrentTableData} from "@/app/(authenticated)/tests/table-test/data";
import {MatrixColumn} from "@/app/(authenticated)/tests/table-test/table.types";
import {useFlashcard} from "@/app/(authenticated)/flash-cards/hooks/useFlashcard";

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
    const {
        allFlashcards,
        currentIndex,
        activeFlashcard,
        firstName,
        isFlipped,
        fontSize,
        editingCard,
        isModalOpen,
        modalMessage,
        modalDefaultTab,
        isExpandedChatOpen,
        handleFlip,
        handleNext,
        handlePrevious,
        handleSelectChange,
        shuffleCards,
        handleAnswer,
        handleEditCard,
        handleSaveEdit,
        showModal,
        handleAskQuestion,
        setFontSize,
        setIsModalOpen,
        setIsExpandedChatOpen,
        setEditingCard
    } = useFlashcard();

    const handleAction = (actionName: string, data: any) => {
        switch (actionName) {
            case 'add':
                console.log('Adding new item:', data);
                break;
            case 'edit':
                console.log('Editing item:', data);
                break;
            case 'delete':
                console.log('Deleting item:', data);
                break;
            case 'expand':
                console.log('Expanding item:', data);
                break;
            default:
                console.log(`Unknown action: ${actionName}`);
        }
    };

    const data = tableDataOne;
    const actions = undefined;
    const onAction = handleAction;
    const defaultVisibleColumns = undefined;
    const truncateAt = undefined;
    const customModalContent = undefined;
    const className = undefined;


    return (

        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">MatrxTable Test Page</h1>

            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Employee Data Table (Default Modal)</h2>
                <DynamicMatrxTable
                    data={data}
                    actions={actions}
                    onAction={onAction}
                    defaultVisibleColumns={defaultVisibleColumns}
                    truncateAt={truncateAt}
                    className={className}
                    customModalContent={customModalContent}
                />
            </div>



            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Flashcard Data Table (Custom Modal Content)</h2>
                <DynamicMatrxTable
                    data={tableDataTwo}
                    actions={['view', 'edit', 'delete']}
                    onAction={handleAction}
                    defaultVisibleColumns={defaultVisibleColumns}
                    truncateAt={50}
                    className={className}
                    customModalContent={(rowData) => (
                        <div className="p-6 bg-accent rounded-md space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Question:</h3>
                                <p className="text-base">{rowData.front}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Answer:</h3>
                                <p className="text-base">{rowData.back}</p>
                            </div>
                            <div className="space-y-3">
                                {Object.keys(rowData).filter((key) => key !== 'front' && key !== 'back').map((key) => (
                                    <div key={key} className="flex flex-col">
                                        <span className="font-semibold">{key}:</span>
                                        <span className="text-base">{rowData[key]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

export default MatrxTableTestPage;

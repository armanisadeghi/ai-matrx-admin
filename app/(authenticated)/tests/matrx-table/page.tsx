// app/(authenticated)/tests/matrx-table/page.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { EmployeeData } from "@/app/(authenticated)/tests/matrx-table/test-data/sample-employees";
import { FlashcardData } from "@/app/(authenticated)/tests/matrx-table/test-data/sample-flashcards";

const DynamicMatrxTable = dynamic(() => import('./components/MatrxTable'), { ssr: false });

const tableDataOne = EmployeeData;
const tableDataTwo = FlashcardData;



const MatrxTableTestPage: React.FC = () => {
    const handleAction = (actionName: string, rowData: any) => {
        console.log(`Action: ${actionName}`, rowData);
    };

    return (

        <></>

        // <div className="p-4">
        //     <h1 className="text-2xl font-bold mb-4">MatrxTable Test Page</h1>
        //
        //     <div className="mb-8">
        //         <h2 className="text-xl font-semibold mb-2">Employee Data Table (Default Modal)</h2>
        //         <DynamicMatrxTable
        //             data={tableDataOne}
        //             onAction={handleAction}
        //         />
        //     </div>
        //
        //     <div className="mb-8">
        //         <h2 className="text-xl font-semibold mb-2">Flashcard Data Table (Custom Modal Content)</h2>
        //         <DynamicMatrxTable
        //             data={tableDataTwo}
        //             onAction={handleAction}
        //             actions={['view', 'edit', 'delete']}
        //             truncateAt={50}
        //             customModalContent={(rowData) => (
        //                 <div className="p-4 bg-accent rounded-md">
        //                     <h3 className="text-lg font-semibold mb-2">{rowData.front}</h3>
        //                     <p>{rowData.back}</p>
        //                 </div>
        //             )}
        //         />
        //     </div>
        // </div>
    );
};

export default MatrxTableTestPage;

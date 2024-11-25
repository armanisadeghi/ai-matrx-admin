'use client';

import React, {useState} from 'react';
import FieldAction from '@/components/matrx/ArmaniForm/action-system/FieldAction';
import {EntityTextarea} from '@/components/matrx/ArmaniForm/field-components';
import {ACTION_COMPONENTS_REGISTRY} from "@/components/matrx/ArmaniForm/action-system/action-components/new";


const TestFieldActionPage = () => {
    const matrxActionKeys = ['entityQuickSidebar'];
    const matrxAction = ACTION_COMPONENTS_REGISTRY;

    console.log('matrxAction:', matrxAction);

    const [log, setLog] = useState('');

    const appendToLog = (message) => {
        setLog((prev) => `${prev}\n${message}`);
    };

    if (!matrxAction) {
        return (
            <div className="p-4">
                <h1 className="text-lg font-bold mb-4">Action Not Found</h1>
                <p>Ensure the selected action exists in the `ACTION_REGISTRY`.</p>
            </div>
        );
    }

    const fieldProps = {
        componentProps: {
            entityName: 'registeredFunction',
        },
        name: 'exampleField',
        value: 'exampleValue',
    }


    return (
        <div className="p-4">

            <EntityTextarea
                value={log}
                readOnly
                rows={10}
                placeholder="Logs will appear here..."
                field={{'name': 'exampleField'}}
                onChange={function (value: string): void {
                    throw new Error('Function not implemented.');
                }}
            />

            <FieldAction
                matrxAction={matrxAction}
                field={fieldProps}
                value="This is some random value"
                onChange={(newValue) => {
                    console.log('Field Changed:', newValue);
                    appendToLog(`Field Changed: ${newValue}`);
                }}
                onActionComplete={(isOpen, result) => {
                    console.log('Action Completed. Open:', isOpen, 'Result:', result);
                    appendToLog(`Action Completed. Open: ${isOpen}, Result: ${JSON.stringify(result)}`);
                }}
                density="compact"
                animationPreset="smooth"
            />
        </div>
    );
};

export default TestFieldActionPage;



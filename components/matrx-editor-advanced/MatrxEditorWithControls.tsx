'use client';

import React, { useCallback, useState } from 'react';
import { MatrxEditor } from './MatrxEditor';
import type { DocumentState, EditorBroker } from './types';
import EditorToolbar from './components/EditorToolbar';
import { InsertBrokerButton } from './broker/InsertBrokerButton';
import { ConvertBrokerButton } from './broker/ConvertBrokerButton';
import { useRefManager } from '@/lib/refs';
import { SmartBrokerButton } from './broker/SmartBrokerButton';

interface MatrxEditorWithControlsProps {
    editorId: string;
    onStateChange?: (state: DocumentState) => void;
    showDebugControls?: boolean;
}

export const MatrxEditorWithControls: React.FC<MatrxEditorWithControlsProps> = ({ 
    editorId, 
    onStateChange, 
    showDebugControls = false 
}) => {
    const refManager = useRefManager();
    const [selectedText, setSelectedText] = useState<string | null>(null);

    const handleBrokerCreate = useCallback((broker: EditorBroker) => {
        refManager.call(editorId, 'insertBroker', broker);
    }, [editorId, refManager]);

    const handleBrokerConvert = useCallback((broker: EditorBroker) => {
        refManager.call(editorId, 'convertToBroker', broker);
    }, [editorId, refManager]);

    const handleSelectionChange = useCallback((selection: string | null) => {
        setSelectedText(selection);
    }, []);

    return (
        <div className='flex flex-col h-full gap-4'>
            <div className='flex items-center gap-2'>
                <SmartBrokerButton
                    editorId={editorId}
                    onBrokerCreate={handleBrokerCreate}
                    onBrokerConvert={handleBrokerConvert}
                />
                <InsertBrokerButton 
                    editorId={editorId}
                    onBrokerCreate={handleBrokerCreate} 
                />
                <ConvertBrokerButton
                    editorId={editorId}
                    selectedText={selectedText}
                    onBrokerConvert={handleBrokerConvert}
                />
                <EditorToolbar 
                    editorId={editorId}
                    refManager={refManager}
                />
            </div>
            <div className='flex-1 min-h-0'>
                <MatrxEditor
                    editorId={editorId}
                    onStateChange={onStateChange}
                    onSelectionChange={handleSelectionChange}
                />
            </div>
        </div>
    );
};

export default MatrxEditorWithControls;

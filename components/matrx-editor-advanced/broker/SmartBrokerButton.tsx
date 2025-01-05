'use client';

import React, { useCallback } from 'react';
import { Variable, Highlighter } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBrokerSync } from '@/providers/brokerSync/BrokerSyncProvider';
import { useCreateRecord } from '@/app/entities/hooks/crud/useCreateRecord';
import { useUpdateFields } from '@/app/entities/hooks/crud/useUpdateFields';
import { generateBrokerName } from '../utils/generateBrokerName';
import { useBrokerValue } from './useBrokerValue';
import { EditorBroker } from '../types';

interface SmartBrokerButtonProps {
    onBrokerCreate: (broker: EditorBroker) => void;
    onBrokerConvert: (broker: EditorBroker) => void;
    getSelectedText: () => string | null;
    editorId: string;
}

export const SmartBrokerButton: React.FC<SmartBrokerButtonProps> = ({ onBrokerCreate, onBrokerConvert, getSelectedText, editorId }) => {
    const { updateFields } = useUpdateFields('broker');
    const { updateBrokerValue } = useBrokerValue();
    const { createRecord } = useCreateRecord('broker');
    const { handleTextToBroker } = useBrokerSync();

    const selectedText = getSelectedText?.();
    const hasSelection = Boolean(selectedText);

    const handleClick = useCallback(async () => {
        if (hasSelection) {
            const text = getSelectedText?.() || window.getSelection()?.toString();
            if (text) {
                const displayName = generateBrokerName(text);
                const temporaryId = await handleTextToBroker(text, editorId);

                // Update name and dataType
                updateFields(temporaryId, {
                    displayName: displayName,
                    name: displayName,
                });

                // Update broker value using the specialized hook
                updateBrokerValue(temporaryId, text);

                createRecord(temporaryId);

                onBrokerConvert({
                    id: temporaryId,
                    displayName: displayName,
                    name: displayName,
                    stringValue: text,
                    value: { broker_value: text }, // This matches what updateBrokerValue does
                    dataType: 'str',
                });
            }
        } else {
            const temporaryId = await handleTextToBroker('', editorId);
            const displayName = `New Broker`;

            updateFields(temporaryId, {
                name: displayName,
                dataType: 'str',
            });

            // Update broker value with empty string
            updateBrokerValue(temporaryId, '');

            createRecord(temporaryId);

            onBrokerCreate({
                id: temporaryId,
                displayName: displayName,
                name: displayName,
                stringValue: '',
                value: { broker_value: null }, // This matches what updateBrokerValue does
                dataType: 'str',
            });
        }
    }, [handleTextToBroker, updateFields, updateBrokerValue, createRecord, hasSelection, getSelectedText, editorId, onBrokerCreate, onBrokerConvert]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className='h-10 w-10 flex items-center justify-center cursor-pointer rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                    onClick={handleClick}
                >
                    {hasSelection ? (
                        <Highlighter className='h-6 w-6 transition-transform hover:scale-110' />
                    ) : (
                        <Variable className='h-6 w-6 transition-transform hover:scale-110' />
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent>{hasSelection ? 'Convert Selection to Broker' : 'Insert New Broker'}</TooltipContent>
        </Tooltip>
    );
};

export default SmartBrokerButton;

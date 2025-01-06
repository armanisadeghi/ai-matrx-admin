'use client';

import React, { useCallback } from 'react';
import { Variable, Highlighter } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBrokerSync } from '@/providers/brokerSync/BrokerSyncProvider';
import { useRefManager } from '@/lib/refs';
import { generateBrokerName } from '../utils/generateBrokerName';
import { EditorBroker } from '../types';

interface SmartBrokerButtonProps {
    editorId: string;
    onBrokerCreate: (broker: EditorBroker) => void;
    onBrokerConvert: (broker: EditorBroker) => void;
}

export const SmartBrokerButton: React.FC<SmartBrokerButtonProps> = ({ editorId, onBrokerCreate, onBrokerConvert }) => {
    const refManager = useRefManager();
    const { initializeBroker } = useBrokerSync();

    const selectedText = refManager.call(editorId, 'getSelectedText');
    const hasSelection = Boolean(selectedText);

    const handleClick = useCallback(async () => {
        if (hasSelection) {
            const displayName = generateBrokerName(selectedText);
            const stringValue = selectedText || '';
            const brokerId = await initializeBroker(editorId, displayName, stringValue);

            const broker: EditorBroker = {
                id: brokerId,
                displayName,
                stringValue: selectedText,
                editorId,
                isConnected: false,
                progressStep: 'tempRequested' as const,
            };

            // Convert selected text to a broker
            refManager.call(editorId, 'convertToBroker', { ...broker, id: brokerId });

            // Invoke the parent's onBrokerConvert
            onBrokerConvert(broker);
        } else {
            const stringValue = '';
            const displayName = 'New Broker';
            const brokerId = await initializeBroker(editorId, displayName, stringValue);
            const broker: EditorBroker = {
                id: brokerId,
                displayName,
                stringValue,
                editorId,
                isConnected: false,
                progressStep: 'tempRequested' as const,
            };

            // Insert a new broker
            refManager.call(editorId, 'insertBroker', { ...broker, id: brokerId });

            // Invoke the parent's onBrokerCreate
            onBrokerCreate(broker);
        }
    }, [editorId, selectedText, hasSelection, initializeBroker, refManager, onBrokerCreate, onBrokerConvert]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className="h-10 w-10 flex items-center justify-center cursor-pointer rounded-md 
                              text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={handleClick}
                >
                    {hasSelection ? (
                        <Highlighter className="h-6 w-6 transition-transform hover:scale-110" />
                    ) : (
                        <Variable className="h-6 w-6 transition-transform hover:scale-110" />
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                {hasSelection ? 'Convert Selection to Broker' : 'Insert New Broker'}
            </TooltipContent>
        </Tooltip>
    );
};

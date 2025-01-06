'use client';

import { useCallback } from 'react';
import { useBrokerSync } from '@/providers/brokerSync/BrokerSyncProvider';
import { BrokerChipCreationOptions } from '../broker/BrokerChipRender';
import { analyzeSelection } from './selection';
import { handleLineSelection, handleMultiSelection, handleSingleNodeSelection } from './brokerSelectionUtils';
import { createBrokerNode } from './core-dom-utils';

export const useSelectionToBroker = () => {
    const { initializeBroker } = useBrokerSync();

    const convertSelectionToBrokerChip = useCallback(
        async ({ editorRef, broker, onProcessContent }: BrokerChipCreationOptions) => {
            if (!editorRef.current) return;

            const selectionResult = analyzeSelection(editorRef);
            if (!selectionResult) return;

            const { type, content, range, insertionInfo } = selectionResult;
            const editorId = editorRef.current.dataset.editorId;

            try {
                // Create broker node with minimal info - chip will handle the rest
                const { node: chipContainer } = createBrokerNode(broker);

                // Handle different selection types
                if (type === 'line') {
                    handleLineSelection({ 
                        chipContainer, 
                        broker,
                        insertionInfo, 
                        editorId,
                        onProcessContent 
                    });
                } else if (type === 'multi') {
                    handleMultiSelection({
                        chipContainer,
                        range,
                        broker,
                        insertionInfo,
                        editorId,
                        onProcessContent
                    });
                } else {
                    handleSingleNodeSelection({
                        chipContainer,
                        broker,
                        insertionInfo,
                        editorId,
                        onProcessContent
                    });
                }

                // Process content after chip is inserted
                setTimeout(() => onProcessContent(), 0);

            } catch (error) {
                console.error('Error converting selection to broker chip:', error);
            }
        },
        [initializeBroker]
    );

    return { convertSelectionToBrokerChip };
};
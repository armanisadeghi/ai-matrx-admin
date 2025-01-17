'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useQuickRef } from '@/app/entities/hooks/useQuickRef';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import SingleBrokerRecordDisplay from './SingleBrokerRecordDisplay';

const BrokerRecordDisplay = <TEntity extends EntityKeys>({ unifiedLayoutProps }: { unifiedLayoutProps: UnifiedLayoutProps }) => {
    const entityName = 'dataBroker' as EntityKeys;
    const { selectors } = useEntityTools(entityName);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const context = useEditorContext();
    const { handleToggleSelection, setSelectionMode } = useQuickRef(entityName);

    useEffect(() => {
        setSelectionMode('multiple');
    }, []); // Empty dependency array

    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
    const prevRecordIdsRef = useRef<string[]>([]);


    // Update open states when selected records change
    useEffect(() => {
        const currentRecordIds = Object.keys(selectedRecords);
        const prevRecordIds = prevRecordIdsRef.current;

        // Check if the arrays are different
        const hasChanged =
            currentRecordIds.length !== prevRecordIds.length ||
            currentRecordIds.some((id) => !prevRecordIds.includes(id)) ||
            prevRecordIds.some((id) => !currentRecordIds.includes(id));

        if (hasChanged) {
            setOpenStates((prevStates) => {
                const newStates = { ...prevStates };

                // Add new records
                currentRecordIds.forEach((recordId) => {
                    if (!(recordId in newStates)) {
                        newStates[recordId] = true;
                    }
                });

                // Remove old records
                Object.keys(newStates).forEach((recordId) => {
                    if (!currentRecordIds.includes(recordId)) {
                        delete newStates[recordId];
                    }
                });

                return newStates;
            });

            // Update ref with current IDs
            prevRecordIdsRef.current = currentRecordIds;
        }
    }, [selectedRecords]);

    const toggleOpen = useCallback((recordId: MatrxRecordId) => {
        setOpenStates((prev) => ({
            ...prev,
            [recordId]: !prev[recordId],
        }));
    }, []);

    const handleRemove = useCallback(
        (recordId: MatrxRecordId) => {
            handleToggleSelection(recordId);
            setOpenStates((prev) => {
                const newState = { ...prev };
                delete newState[recordId];
                return newState;
            });
        },
        [handleToggleSelection]
    );

    if (!Object.keys(selectedRecords).length) {
        return null;
    }

    return (
        <div className='w-full space-y-4'>
            {Object.entries(selectedRecords).map(([recordId, record]) => (
                <SingleBrokerRecordDisplay
                    key={recordId}
                    recordId={recordId}
                    record={record}
                    unifiedLayoutProps={unifiedLayoutProps}
                    onDelete={handleRemove}
                />
            ))}
        </div>
    );
};

export default BrokerRecordDisplay;

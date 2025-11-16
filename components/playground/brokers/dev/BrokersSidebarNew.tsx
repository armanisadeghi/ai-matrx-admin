'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { EntityRecordMap, MatrxRecordId, QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import BrokerRecordDisplay from './EntityBrokerCardNew';
import { SmartNewButton } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';
import { useQuickRef } from '@/app/entities/hooks/useQuickRef';
import { useEntitySelectionCrud } from '@/app/entities/hooks/crud/useCrudById';

const initialLayoutProps = getUnifiedLayoutProps({
    entityKey: 'broker',
    formComponent: 'MINIMAL',
    quickReferenceType: 'LIST',
    isExpanded: true,
    handlers: {},
});

const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
    formComponent: 'MINIMAL',
    dynamicStyleOptions: {
        density: 'compact',
        size: 'sm',
    },
    dynamicLayoutOptions: {
        formStyleOptions: {
            fieldFiltering: {
                excludeFields: ['id', 'otherSourceParams'],
                defaultShownFields: ['displayName', 'value', 'dataType', 'defaultSource', 'defaultDestination'],
            },
        },
    },
});

interface BrokerSidebarProps {
    selectedBroker?: QuickReferenceRecord;
    onBrokerChange?: (brokerQuickRef: QuickReferenceRecord) => void;
    initialSelectedBroker?: QuickReferenceRecord;
}

export default function BrokerSidebar({
    selectedBroker: externalSelectedBroker,
    onBrokerChange: externalOnBrokerChange,
    initialSelectedBroker,
}: BrokerSidebarProps) {
    const entityName = 'broker';
    const [internalSelectedBroker, setInternalSelectedBroker] = React.useState<QuickReferenceRecord | undefined>(initialSelectedBroker);
    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
    const selectedBroker = externalSelectedBroker ?? internalSelectedBroker;

    const { selectedRecordIds, handleToggleSelection, setSelectionMode } = useQuickRef(entityName);

    useEffect(() => {
        setSelectionMode('multiple');
    }, [setSelectionMode]);

    const { getEffectiveRecordOrDefaults } = useEntitySelectionCrud(entityName);

    // New function to get all selected records
    const getSelectedRecordsWithKeys = () => {
        return selectedRecordIds.reduce((acc, recordId) => {
            const record = getEffectiveRecordOrDefaults(recordId);
            if (record) {
                acc[recordId] = record;
            }
            return acc;
        }, {} as EntityRecordMap<typeof entityName>);
    };

    const handleRemove = (recordId: MatrxRecordId) => {
        handleToggleSelection(recordId);
        setOpenStates((prev) => {
            const newState = { ...prev };
            delete newState[recordId];
            return newState;
        });
    };

    const handleBrokerChange = (brokerQuickRef: QuickReferenceRecord) => {
        if (externalOnBrokerChange) {
            externalOnBrokerChange(brokerQuickRef);
        } else {
            setInternalSelectedBroker(brokerQuickRef);
        }
    };


    return (
        <div className='flex flex-col h-full py-3'>
            <SmartNewButton entityKey='broker' />
            <ScrollArea className='flex-1'>
                <AnimatePresence>
                    <BrokerRecordDisplay
                        unifiedLayoutProps={layoutProps}
                        entityName={entityName}
                        selectedRecordsWithKeys={getSelectedRecordsWithKeys()}
                        onRecordRemove={handleRemove}
                    />
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}
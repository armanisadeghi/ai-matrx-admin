'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import BrokerRecords from '../brokers/BrokerRecords';
import { SmartCrudButtons } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';
import { createEntitySelectors, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import BrokerRecordsSimple from '../brokers/BrokerRecordsSimple';

const initialLayoutProps = getUnifiedLayoutProps({
    entityKey: 'dataBroker',
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
                excludeFields: ['id'],
                defaultShownFields: ['name', 'defaultValue', 'dataType', 'defaultComponent', 'color'],
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
    const dispatch = useAppDispatch();
    const [lastActiveRecipeId, setLastActiveRecipeId] = useState<string | null>(null);
    const selectors = createEntitySelectors('recipe');
    const brokerActions = useEntityTools('dataBroker').actions;
    const activeRecipeId = useAppSelector(selectors.selectActiveRecordId);

    useEffect(() => {
        dispatch(brokerActions.setSelectionMode('multiple'));
    }, []);

    useEffect(() => {
        if (activeRecipeId && activeRecipeId !== lastActiveRecipeId) {
            setLastActiveRecipeId(activeRecipeId);
        }
    }, [activeRecipeId]);

    useEffect(() => {
        if (activeRecipeId && lastActiveRecipeId && activeRecipeId !== lastActiveRecipeId) {
            dispatch(brokerActions.clearSelection());
        }
    }, [lastActiveRecipeId]);

    return (
        <div className='flex flex-col h-full py-3'>
            <ScrollArea className='flex-1 scrollbar-none'>
                <AnimatePresence>
                    {/* This would be a great place to add an "Orphan Chip Watcher" */}

                    {/* <BrokerRecords unifiedLayoutProps={layoutProps} /> */}
                    <BrokerRecordsSimple
                        key={activeRecipeId} // This will force a complete remount when activeRecipeId changes
                        unifiedLayoutProps={layoutProps}
                    />
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}

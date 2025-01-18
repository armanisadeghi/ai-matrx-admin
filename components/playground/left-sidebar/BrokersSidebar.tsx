'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import BrokerRecords from '../brokers/BrokerRecords';
import { SmartCrudButtons } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';

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
                defaultShownFields: ['name', 'defaultValue', 'dataType', 'defaultComponent'],
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

    




    return (
        <div className='flex flex-col h-full py-3'>
            <SmartCrudButtons
                entityKey='dataBroker'
                options={{ allowCreate: true, allowEdit: false, allowDelete: false, allowRefresh: true, allowCancel: true }}
                layout={{ buttonLayout: 'row', buttonSize: 'icon', buttonsPosition: 'top', buttonSpacing: 'normal' }}
                unifiedLayoutProps={layoutProps}
            />
            <ScrollArea className='flex-1'>
                <AnimatePresence>

                    {/* This would be a great place to add an "Orphan Chip Watcher" */}


                    <BrokerRecords unifiedLayoutProps={layoutProps} />
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}

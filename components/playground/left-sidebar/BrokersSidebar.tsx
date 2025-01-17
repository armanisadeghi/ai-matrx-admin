'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import BrokerRecordDisplay from '../brokers/BrokerRecordDisplay';
import { SmartCrudButtons, SmartNewButton } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';

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
    const [internalSelectedBroker, setInternalSelectedBroker] = React.useState<QuickReferenceRecord | undefined>(initialSelectedBroker);

    const selectedBroker = externalSelectedBroker ?? internalSelectedBroker;

    const handleBrokerChange = (brokerQuickRef: QuickReferenceRecord) => {
        if (externalOnBrokerChange) {
            externalOnBrokerChange(brokerQuickRef);
        } else {
            setInternalSelectedBroker(brokerQuickRef);
        }
    };

    return (
        <div className='flex flex-col h-full py-3'>
            <SmartCrudButtons
                entityKey='dataBroker'
                options={{ allowCreate: true, allowEdit: false, allowDelete: false, allowRefresh: true, allowCancel: true }}
                layout={{ buttonLayout: 'row', buttonSize: 'icon', buttonsPosition: 'top', buttonSpacing: 'normal' }}
            />
            <ScrollArea className='flex-1'>
                <AnimatePresence>

                    {/* This would be a great place to add an "Orphan Chip Watcher" */}


                    <BrokerRecordDisplay unifiedLayoutProps={layoutProps} />
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}

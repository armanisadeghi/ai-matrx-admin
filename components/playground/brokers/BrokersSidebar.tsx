'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { createEntitySelectors, useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import BrokerRecordsSimple from '../brokers/BrokerRecordsSimple';
import { CockpitPanelProps } from '../types';

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

const BrokerSidebar: React.FC<CockpitPanelProps> = ({ playgroundControls }) => {
    const dispatch = useAppDispatch();
    const [lastActiveRecipeId, setLastActiveRecipeId] = useState<string | null>(null);
    const selectors = createEntitySelectors('recipe');
    const brokerActions = useEntityTools('dataBroker').actions;
    const activeRecipeId = useAppSelector(selectors.selectActiveRecordId);

    useEffect(() => {
        dispatch(brokerActions.setSelectionMode('multiple'));
    }, [dispatch, brokerActions]);

    useEffect(() => {
        if (activeRecipeId && activeRecipeId !== lastActiveRecipeId) {
            setLastActiveRecipeId(activeRecipeId);
        }
    }, [activeRecipeId, lastActiveRecipeId]);

    useEffect(() => {
        if (activeRecipeId && lastActiveRecipeId && activeRecipeId !== lastActiveRecipeId) {
            dispatch(brokerActions.clearSelection());
        }
    }, [activeRecipeId, lastActiveRecipeId, dispatch, brokerActions]);

    return (
        <div className="flex flex-col h-full py-3">
            <ScrollArea className="flex-1 scrollbar-none">
                <AnimatePresence>
                    <BrokerRecordsSimple
                        unifiedLayoutProps={layoutProps}
                    />
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
};

export default BrokerSidebar;
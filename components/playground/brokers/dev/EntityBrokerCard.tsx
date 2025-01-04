'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import BrokerHeader from '../BrokerEditorHeader';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { EntityFormMinimalAnyRecord } from '@/app/entities/forms/EntityFormRecordSelections';
import { useQuickRef } from '@/app/entities/hooks/useQuickRef';

const BrokerRecordDisplay = <TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps) => {
    const { selectSelectedRecordsWithKey, handleToggleSelection, setSelectionMode } = useQuickRef('broker');

    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setSelectionMode('multiple');
    }, [setSelectionMode]);

    if (!Object.keys(selectSelectedRecordsWithKey).length) {
        return null;
    }

    const toggleOpen = (recordId: MatrxRecordId) => {
        setOpenStates((prev) => ({
            ...prev,
            [recordId]: !prev[recordId],
        }));
    };

    const handleDelete = (recordId: MatrxRecordId) => {
        handleToggleSelection(recordId);

        setOpenStates((prev) => {
            const newState = { ...prev };
            delete newState[recordId];
            return newState;
        });
    };

    return (
        <div className='w-full space-y-4'>
            {Object.entries(selectSelectedRecordsWithKey).map(([recordId, record]) => (
                <motion.div
                    key={recordId}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className='my-4 last:mb-0'
                >
                    <Card className='bg-elevation2 border border-elevation3 rounded-lg'>
                        <BrokerHeader
                            data={record}
                            isOpen={openStates[recordId] || false}
                            onToggle={() => toggleOpen(recordId)}
                            onDelete={() => handleDelete(recordId)}
                        />

                        <AnimatePresence>
                            {openStates[recordId] && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className='overflow-hidden'
                                >
                                    <CardContent className='p-2 bg-background space-y-2 border-t'>
                                        <EntityFormMinimalAnyRecord<TEntity>
                                            key={recordId}
                                            recordId={recordId}
                                            unifiedLayoutProps={unifiedLayoutProps}
                                        />
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
};

export default BrokerRecordDisplay;

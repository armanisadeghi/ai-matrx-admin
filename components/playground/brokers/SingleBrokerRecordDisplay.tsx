'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { EntityFormMinimalAnyRecord } from '@/app/entities/forms/EntityFormMinimalAnyRecord';
import BrokerCardHeader from './BrokerCardHeader';

interface SingleBrokerRecordDisplayProps<TEntity extends EntityKeys> {
    recordId: MatrxRecordId;
    getRecord: (recordId: MatrxRecordId) => any;
    unifiedLayoutProps: UnifiedLayoutProps;
    onDelete?: (recordId: MatrxRecordId) => void;
}

const SingleBrokerRecordDisplay = <TEntity extends EntityKeys>({
    recordId,
    getRecord,
    unifiedLayoutProps,
    onDelete
}: SingleBrokerRecordDisplayProps<TEntity>) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className='my-4 last:mb-0'
        >
            <Card className='bg-elevation2 border border-elevation3 rounded-lg'>
                <BrokerCardHeader
                    recordId={recordId}
                    getRecord={getRecord}
                    isOpen={isOpen}
                    onToggle={toggleOpen}
                    onDelete={onDelete ? () => onDelete(recordId) : undefined}
                />

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className='overflow-hidden'
                        >
                            <CardContent className='p-2 bg-background space-y-2 border-t'>
                                <EntityFormMinimalAnyRecord<TEntity>
                                    recordId={recordId}
                                    unifiedLayoutProps={unifiedLayoutProps}
                                />
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

export default SingleBrokerRecordDisplay;
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { EntityFormMinimalAnyRecord } from '@/app/entities/forms/EntityFormMinimalAnyRecord';
import { useQuickRef } from '@/app/entities/hooks/useQuickRef';
import BrokerCardHeader from './BrokerCardHeader';
import { useEntitySelectionCrud } from '@/app/entities/hooks/crud/useCrudById';

const BrokerRecordDisplay = <TEntity extends EntityKeys>({ 
    unifiedLayoutProps 
}: { 
    unifiedLayoutProps: UnifiedLayoutProps 
}) => {
    const entityName = 'broker' as EntityKeys;
    const { handleToggleSelection, setSelectionMode } = useQuickRef(entityName);
    const { selectedRecordsOrDefaultsWithKeys, getEffectiveRecordOrDefaults } = useEntitySelectionCrud(entityName);
    const [openStates, setOpenStates] = useState<Record<string, boolean>>({});
    
    // Ref to track previous record IDs
    const prevRecordIdsRef = useRef<string[]>([]);

    // Set selection mode only once on mount
    useEffect(() => {
        setSelectionMode('multiple');
    }, []); // Empty dependency array

    // Update open states when selected records change
    useEffect(() => {
        const currentRecordIds = Object.keys(selectedRecordsOrDefaultsWithKeys);
        const prevRecordIds = prevRecordIdsRef.current;
        
        // Check if the arrays are different
        const hasChanged = 
            currentRecordIds.length !== prevRecordIds.length ||
            currentRecordIds.some(id => !prevRecordIds.includes(id)) ||
            prevRecordIds.some(id => !currentRecordIds.includes(id));
            
        if (hasChanged) {
            setOpenStates(prevStates => {
                const newStates = { ...prevStates };
                
                // Add new records
                currentRecordIds.forEach(recordId => {
                    if (!(recordId in newStates)) {
                        newStates[recordId] = true;
                    }
                });
                
                // Remove old records
                Object.keys(newStates).forEach(recordId => {
                    if (!currentRecordIds.includes(recordId)) {
                        delete newStates[recordId];
                    }
                });
                
                return newStates;
            });
            
            // Update ref with current IDs
            prevRecordIdsRef.current = currentRecordIds;
        }
    }, [selectedRecordsOrDefaultsWithKeys]);

    const toggleOpen = useCallback((recordId: MatrxRecordId) => {
        setOpenStates(prev => ({
            ...prev,
            [recordId]: !prev[recordId]
        }));
    }, []);

    const handleRemove = useCallback((recordId: MatrxRecordId) => {
        handleToggleSelection(recordId);
        setOpenStates(prev => {
            const newState = { ...prev };
            delete newState[recordId];
            return newState;
        });
    }, [handleToggleSelection]);

    if (!Object.keys(selectedRecordsOrDefaultsWithKeys).length) {
        return null;
    }

    return (
        <div className="w-full space-y-4">
            {Object.keys(selectedRecordsOrDefaultsWithKeys).map((recordId) => (
                <motion.div
                    key={recordId}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="my-4 last:mb-0"
                >
                    <Card className="bg-elevation2 border border-elevation3 rounded-lg">
                        <BrokerCardHeader
                            recordId={recordId}
                            getRecord={getEffectiveRecordOrDefaults}
                            isOpen={openStates[recordId] || false}
                            onToggle={() => toggleOpen(recordId)}
                            onDelete={() => handleRemove(recordId)}
                        />

                        <AnimatePresence>
                            {openStates[recordId] && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <CardContent className="p-2 bg-background space-y-2 border-t">
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
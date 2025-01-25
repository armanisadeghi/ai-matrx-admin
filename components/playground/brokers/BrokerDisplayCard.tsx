'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { MatrxRecordId } from '@/types';
import { EntityFormMinimalAnyRecord } from '@/app/entities/forms/EntityFormMinimalAnyRecord';
import BrokerCardHeader from './BrokerCardHeader';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import { TailwindColor } from '@/features/rich-text-editor/constants';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ChipColorPicker from '@/features/rich-text-editor/admin/sidebar-analyzer/ChipColorPicker';
import { EnhancedRecord, QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import QuickRefSelect from '@/app/entities/quick-reference/QuickRefSelectFloatingLabel';
import { DataBrokerData } from './BrokerRecordsSimple';
import { updateChipMetadata } from '@/features/rich-text-editor/utils/enhancedChipUtils';

interface EnhancedBrokerRecord extends EnhancedRecord {
    chips?: ChipData[];
}

interface BrokerDisplayCardProps {
    recordId: MatrxRecordId | null;
    record: any | null;
    unifiedLayoutProps: UnifiedLayoutProps;
    chips: ChipData[];
    onDelete?: (recordId: MatrxRecordId) => void;
    onChipUpdate?: (chipId: string, updates: Partial<ChipData>) => void;
    brokerOptions?: QuickReferenceRecord[];
}

const BrokerDisplayCard = ({ recordId, record, unifiedLayoutProps, chips, onDelete, onChipUpdate, brokerOptions }: BrokerDisplayCardProps) => {
    const [isOpen, setIsOpen] = useState(true);

    // Initialize color from first chip or default to teal
    const [color, setColor] = useState<TailwindColor>(() => {
        return (chips[0]?.color as TailwindColor) || 'teal';
    });

    const isBrokerCard = Boolean(recordId && record);
    const hasChips = chips.length > 0;
    const isConnected = isBrokerCard && hasChips;

    // Update function to ensure all chip fields are properly synced
    const updateChips = useCallback(
        (updates: Partial<ChipData>) => {
            if (!hasChips || !onChipUpdate) return;

            chips.forEach((chip) => {
                onChipUpdate(chip.id, {
                    ...updates,
                    editorId: chip.editorId,
                });
            });
        },
        [chips, onChipUpdate, hasChips]
    );

    // Handle updates from the broker form
    const handleBrokerFieldChange = useCallback(
        (field: string, value: any) => {
            if (!hasChips || !onChipUpdate) return;
            console.log('== -- === -- - field', field, 'value', value);

            // Sync relevant broker fields to all associated chips
            switch (field) {
                case 'name':
                    updateChips({
                        label: value,
                        brokerId: recordId || undefined, // Ensure brokerId is synced
                    });
                    break;
                case 'defaultValue':
                    updateChips({
                        stringValue: value,
                        brokerId: recordId || undefined,
                    });
                    break;
                default:
                    break;
            }
        },
        [updateChips, recordId]
    );

    // Handle updates from the broker form
    const handleBrokerFieldUpdate= useCallback(
        (field: string, value: any) => {
            const updates: Record<string, any> = {
                [field]: value,
            };
            updateChipMetadata(recordId, updates);
        },
        [recordId]
    );
    // Handle orphan chip updates
    const handleOrphanChipUpdate = useCallback(
        (field: string, value: any) => {
            if (!chips[0] || !onChipUpdate) return;

            const chip = chips[0];
            switch (field) {
                case 'label':
                    onChipUpdate(chip.id, {
                        label: value,
                        editorId: chip.editorId,
                    });
                    break;
                case 'stringValue':
                    onChipUpdate(chip.id, {
                        stringValue: value,
                        editorId: chip.editorId,
                    });
                    break;
                case 'brokerId':
                    const selectedBroker = brokerOptions?.find((b) => b.recordKey === value);
                    if (selectedBroker) {
                        // When a broker is selected, sync all relevant fields
                        onChipUpdate(chip.id, {
                            id: value, // Set chip ID to match broker ID
                            brokerId: value, // Set broker ID
                            editorId: chip.editorId, // Preserve editor ID
                            label: selectedBroker.displayValue, // Use broker's name as label
                            color: color, // Maintain current color
                            stringValue: record?.defaultValue || chip.stringValue, // Use broker's default value if available
                        });
                    } else {
                        // If broker is deselected, maintain chip as orphan
                        onChipUpdate(chip.id, {
                            brokerId: undefined,
                            editorId: chip.editorId,
                            label: chip.label,
                            color: color,
                            stringValue: chip.stringValue,
                        });
                    }
                    break;
                default:
                    break;
            }
        },
        [chips, onChipUpdate, brokerOptions, color, record]
    );

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
                    record={record}
                    chips={chips}
                    color={color}
                    isConnected={isConnected}
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                    onDelete={recordId && onDelete ? () => onDelete(recordId) : undefined}
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
                                {isBrokerCard ? (
                                    // Broker form for broker cards
                                    <EntityFormMinimalAnyRecord
                                        recordId={recordId!}
                                        unifiedLayoutProps={unifiedLayoutProps}
                                        onFieldChange={handleBrokerFieldUpdate}
                                    />
                                ) : (
                                    // Orphan chip form
                                    <>
                                        <div className='space-y-2'>
                                            <label className='text-sm text-muted-foreground'>Label</label>
                                            <Input
                                                value={chips[0]?.label || ''}
                                                onChange={(e) => handleOrphanChipUpdate('label', e.target.value)}
                                                className='h-8'
                                            />
                                        </div>

                                        <div className='space-y-2'>
                                            <label className='text-sm text-muted-foreground'>Value</label>
                                            <Textarea
                                                value={chips[0]?.stringValue || ''}
                                                onChange={(e) => handleOrphanChipUpdate('stringValue', e.target.value)}
                                                className='min-h-[80px] text-sm font-mono resize-none'
                                            />
                                        </div>

                                        <div className='space-y-2'>
                                            <label className='text-sm text-muted-foreground'>Broker</label>
                                            <QuickRefSelect
                                                entityKey='dataBroker'
                                                onRecordChange={(record) => handleOrphanChipUpdate('brokerId', record.recordKey)}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Color picker is always visible */}
                                <div className='space-y-2'>
                                    <label className='text-sm text-muted-foreground'>Color</label>
                                    <ChipColorPicker
                                        value={color}
                                        onValueChange={(newColor) => {
                                            setColor(newColor);
                                            updateChips({ color: newColor });
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

export default BrokerDisplayCard;

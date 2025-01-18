'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import { TailwindColor } from '@/features/rich-text-editor/constants';
import ChipHeader from './ChipHeader';
import ChipColorPicker from '@/features/rich-text-editor/admin/sidebar-analyzer/ChipColorPicker';

interface ChipDisplayProps {
    chip: ChipData;
    brokers: Array<{
        recordKey: string;
        displayValue: string;
    }>;
    onUpdate: (chipId: string, updates: Partial<ChipData>) => void;
}

const ChipDisplay = ({ chip, brokers, onUpdate }: ChipDisplayProps) => {
    const [isOpen, setIsOpen] = useState(true);

    // Determine chip status
    const status = useMemo(() => {
        if (!chip.brokerId || chip.brokerId === 'disconnected') return 'disconnected';
        return 'notFetched';
    }, [chip.brokerId]);

    const selectedBroker = useMemo(() => 
        brokers.find(b => b.recordKey === chip.brokerId),
        [brokers, chip.brokerId]
    );

    const handleFieldUpdate = useCallback((field: keyof ChipData, value: any) => {
        const updates: Partial<ChipData> = { [field]: value };
        
        if (field === 'brokerId') {
            const broker = brokers.find(b => b.recordKey === value);
            if (broker) {
                updates.label = broker.displayValue;
            }
        }

        onUpdate(chip.id, updates);
    }, [onUpdate, chip.id, brokers]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="my-2 last:mb-0"
        >
            <Card className="bg-elevation2 border border-elevation3 rounded-lg">
                <ChipHeader
                    chip={chip}
                    status={status}
                    isOpen={isOpen}
                    onToggle={() => setIsOpen(!isOpen)}
                />

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <CardContent className="p-2 bg-background space-y-3 border-t">
                                <div className="space-y-2">
                                    <label className="text-sm text-muted-foreground">Label</label>
                                    <Input
                                        value={chip.label}
                                        onChange={(e) => handleFieldUpdate('label', e.target.value)}
                                        className="h-8"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-muted-foreground">Color</label>
                                    <ChipColorPicker
                                        value={chip.color as TailwindColor}
                                        onValueChange={(color) => handleFieldUpdate('color', color)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-muted-foreground">Broker</label>
                                    <Select
                                        value={chip.brokerId}
                                        onValueChange={(value) => handleFieldUpdate('brokerId', value)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue>
                                                {selectedBroker?.displayValue || 'Select Broker'}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brokers.map(({ recordKey, displayValue }) => (
                                                <SelectItem
                                                    key={recordKey}
                                                    value={recordKey}
                                                >
                                                    {displayValue}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {status === 'disconnected' && (
                                    <div className="space-y-2">
                                        <label className="text-sm text-muted-foreground">Value</label>
                                        <Textarea
                                            value={chip.stringValue}
                                            onChange={(e) => handleFieldUpdate('stringValue', e.target.value)}
                                            className="min-h-[80px] text-sm font-mono resize-none"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

export default ChipDisplay;
'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEditorChips } from '../hooks/useEditorChips';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { ChipData } from '../types/editor.types';
import ColorPicker from './ColorPicker';
import { TailwindColor } from '../constants';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export const ChipDetails = ({ chip, editorId }: { chip: ChipData; editorId: string }) => {
    const { updateChip, removeChipData } = useEditorChips(editorId);
    const { quickReferenceRecords } = useFetchQuickRef('broker');

    const handleBrokerChange = (brokerId: string) => {
        const broker = quickReferenceRecords?.find((b) => b.recordKey === brokerId);
        if (broker) {
            updateChip(chip.id, {
                brokerId,
                label: broker.displayValue,
            });
        }
    };

    const handleChange = (field: keyof ChipData, value: string) => {
        updateChip(chip.id, { [field]: value });
    };

    const handleColorChange = (color: TailwindColor) => {
        updateChip(chip.id, { color });
    };

    const handleDelete = () => {
        removeChipData(chip.id);
    };

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between mb-2'>
                <div className='text-sm font-medium'>Chip Configuration</div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Chip</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this chip? This action will remove the chip
                                from both the editor state and the DOM. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                    <label className='text-sm text-muted-foreground'>ID</label>
                    <Input
                        readOnly
                        value={chip.id}
                    />
                </div>
                <div className='space-y-1'>
                    <label className='text-sm text-muted-foreground'>Label</label>
                    <Input
                        value={chip.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                    />
                </div>
                <div className='space-y-1'>
                    <label className='text-sm text-muted-foreground'>Color</label>
                    <ColorPicker
                        value={chip.color as TailwindColor}
                        onValueChange={handleColorChange}
                    />
                </div>
                <div className='space-y-1'>
                    <label className='text-sm text-muted-foreground'>Broker</label>
                    <Select
                        value={chip.brokerId}
                        onValueChange={handleBrokerChange}
                    >
                        <SelectTrigger>
                            <SelectValue>
                                {quickReferenceRecords?.find((b) => b.recordKey === chip.brokerId)?.displayValue || chip.brokerId}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {quickReferenceRecords?.map((broker) => (
                                <SelectItem
                                    key={broker.recordKey}
                                    value={broker.recordKey}
                                >
                                    {broker.displayValue}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className='space-y-1'>
                <label className='text-sm text-muted-foreground'>String Value</label>
                <Textarea
                    value={chip.stringValue}
                    onChange={(e) => handleChange('stringValue', e.target.value)}
                    className='min-h-[100px] font-mono'
                />
            </div>
        </div>
    );
};

export default ChipDetails;
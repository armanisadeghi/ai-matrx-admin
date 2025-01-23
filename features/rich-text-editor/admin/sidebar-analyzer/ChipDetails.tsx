'use client';

import React, { useCallback, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { ChipData } from '../../types/editor.types';
import ChipColorPicker from './ChipColorPicker';
import { TailwindColor } from '../../constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeleteChipDialog from './DeleteChipDialog';
import { useEditorContext } from '../../provider/new/EditorProvider';

export const ChipDetails = ({ chip, editorId }: { chip: ChipData; editorId: string }) => {
    const context = useEditorContext();
    const { quickReferenceRecords } = useFetchQuickRef('dataBroker');

    const removeChipData = useCallback(
        (chipId: string) => {
            context.removeChipData(editorId, chipId);
        },
        [editorId, context]
    );

    const updateChip = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            context.updateChipData(chipId, updates);
        },
        [context]
    );

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

    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between'>
                <div className='text-sm font-medium'>Chip Configuration</div>
                <DeleteChipDialog onDelete={() => removeChipData(chip.id)} />
            </div>

            <div className='space-y-4'>
                <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>ID</label>
                    <Input
                        readOnly
                        value={chip.id}
                    />
                </div>

                <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>Label</label>
                    <Input
                        value={chip.label}
                        onChange={(e) => handleChange('label', e.target.value)}
                    />
                </div>

                <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>Color</label>
                    <ChipColorPicker
                        value={chip.color as TailwindColor}
                        onValueChange={handleColorChange}
                    />
                </div>

                <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>Broker</label>
                    <Select
                        value={chip.brokerId}
                        onValueChange={handleBrokerChange}
                    >
                        <SelectTrigger>
                            <SelectValue>{quickReferenceRecords?.find((b) => b.recordKey === chip.brokerId)?.displayValue || chip.brokerId}</SelectValue>
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

                <div className='space-y-2'>
                    <label className='text-sm text-muted-foreground'>String Value</label>
                    <Textarea
                        value={chip.stringValue}
                        onChange={(e) => handleChange('stringValue', e.target.value)}
                        className='min-h-[100px] font-mono'
                    />
                </div>
            </div>
        </div>
    );
};

export const ChipTabs = ({ chips, editorId }: { chips: ChipData[]; editorId: string }) => {
    const [activeChip, setActiveChip] = useState<string>(chips[0]?.id || '');

    if (chips.length === 0) {
        return <div className='text-sm text-muted-foreground px-1'>No chips added</div>;
    }

    return (
        <Tabs
            value={activeChip}
            onValueChange={setActiveChip}
            className='flex-1'
        >
            <TabsList className='flex flex-col w-full gap-1 bg-transparent h-auto'>
                {chips.map((chip) => (
                    <TabsTrigger
                        key={chip.id}
                        value={chip.id}
                        className='w-full justify-start text-left px-3 py-2 h-auto whitespace-normal break-all'
                    >
                        {chip.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            <div className='mt-4'>
                {chips.map((chip) => (
                    <TabsContent
                        key={chip.id}
                        value={chip.id}
                    >
                        <ChipDetails
                            chip={chip}
                            editorId={editorId}
                        />
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    );
};

export default ChipTabs;

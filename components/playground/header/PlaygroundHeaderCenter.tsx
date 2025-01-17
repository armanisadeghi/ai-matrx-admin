'use client';

import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, History } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from '@/components/ui/select';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import PlaygroundHistoryDialog from './PlaygroundHistoryDialog';
import PlaygroundNavContainer from './PlaygroundNavContainer';
import { usePreferenceValue } from '@/hooks/user-preferences/usePreferenceValue';
import { MatrxRecordId } from '@/types';
import { useCreateAndGetId } from '@/app/entities/hooks/crud/useDirectCreateRecord';
import QuickRefSelectFindNew from '@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSelectFindNew';
import { AddMessagePayload, useAddMessage } from '../hooks/messages/useAddMessage';

interface PlaygroundHeaderCenterProps {
    initialSettings?: {
        recipe?: QuickReferenceRecord;
        version?: number;
    };
    currentMode?: string;
    onModeChange?: (mode: string) => void;
    onVersionChange?: (version: number) => void;
}

const PlaygroundHeaderCenter = ({
    initialSettings = {},
    currentMode = 'prompt',
    onModeChange = () => {},
    onVersionChange = () => {},
}: PlaygroundHeaderCenterProps) => {
    const [lastUsedRecipe, setLastUsedRecipe] = usePreferenceValue('playground', 'lastRecipeId');
    const [newRecordId, setNewRecordId] = useState<MatrxRecordId | undefined>(undefined);
    const { addMessage } = useAddMessage();
    const [version, setVersion] = useState(initialSettings?.version ?? 1);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const handleRecipeChange = (record: QuickReferenceRecord) => {
        setLastUsedRecipe(record.recordKey);
    };

    const handleVersionChange = (newVersion: number) => {
        setVersion(newVersion);
        onVersionChange(newVersion);
    };

    const createRecord = useCreateAndGetId({ entityKey: 'recipe' });

    const AddFirstTwoSections = useCallback(() => {
        const systemMessageSection: AddMessagePayload = {
            role: 'system',
            type: 'text',
            content:
                'You are very a helpful assistant. You will read all instructions carefully and identify the users exact request. When you are unsure of the exact needs of the user, ask relevant questions to clarify the request.',
            order: 0,
        };
        const useMessageSectionOne: AddMessagePayload = {
            role: 'user',
            type: 'text',
            content: 'Replace this text with your custom message. Use "Chips" to include Data Brokers for intelligent, dynamic, automated recipes.',
            order: 1,
        };

        addMessage(systemMessageSection);
        addMessage(useMessageSectionOne);
    }, [addMessage]); // Add addMessage to the dependency array

    const handleCreate = useCallback(async () => {
        try {
            const result = await createRecord({
                data: { name: 'Custom Recipe' },
            });
            const newRecordId = `id:${result.coreId}` as MatrxRecordId;
            setNewRecordId(newRecordId);
            AddFirstTwoSections();
        } catch (error) {
            console.error('Creation failed:', error);
        }
    }, [createRecord, AddFirstTwoSections]);

    return (
        <div className='flex items-center w-full px-2 h-10 gap-2'>
            <PlaygroundNavContainer
                currentMode={currentMode}
                onModeChange={onModeChange}
            />

            <div className='flex items-center gap-2 flex-1 min-w-0'>
                <div className='min-w-[160px] max-w-[320px] w-full'>
                    <QuickRefSelectFindNew
                        entityKey='recipe'
                        initialRecordKey={newRecordId ?? initialSettings?.recipe?.recordKey ?? lastUsedRecipe ?? undefined}
                        onRecordChange={handleRecipeChange}
                        resetKey={newRecordId}
                    />
                </div>

                <Select
                    value={version.toString()}
                    onValueChange={(v) => handleVersionChange(Number(v))}
                >
                    <SelectTrigger className='h-8 w-24'>
                        <div className='flex items-center'>
                            <span className='text-sm'>Version {version}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Select Version</SelectLabel>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
                                <SelectItem
                                    key={v}
                                    value={v.toString()}
                                >
                                    Version {v}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>

                <Button
                    variant='ghost'
                    size='md'
                    className='h-8 w-8 p-0 shrink-0'
                    onClick={() => {
                        handleCreate();
                    }}
                >
                    <Plus size={16} />
                </Button>
                <Button
                    variant='ghost'
                    size='md'
                    className='h-8 w-8 p-0 shrink-0'
                    onClick={() => setIsHistoryOpen(true)}
                >
                    <History size={16} />
                </Button>
            </div>

            <PlaygroundHistoryDialog
                isOpen={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
            />
        </div>
    );
};

export default PlaygroundHeaderCenter;

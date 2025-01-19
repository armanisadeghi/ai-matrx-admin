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
import QuickRefSelectFindNew from '@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSelectFindNew';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { getSimplifiedLayoutProps } from '@/app/entities/layout/configs';
import EntityCreateRecordSheet from '@/app/entities/layout/EntityCreateRecordSheet';
import AddTemplateMessages from './AddTemplateMessages';
import { useEntityTools } from '@/lib/redux';
import { useDispatch } from 'react-redux';
import QuickRefSelect from '@/app/entities/quick-reference/QuickRefSelectFloatingLabel';

const getLayoutOptions = (): UnifiedLayoutProps => {
    const layoutProps = getSimplifiedLayoutProps({
        entityKey: 'recipe',
        formComponent: 'MINIMAL',
        quickReferenceType: 'LIST',
        isExpanded: true,
        handlers: {},
        excludeFields: ['id'],
        defaultShownFields: ['name', 'description', 'tags', 'status', 'version', 'isPublic'],
        density: 'compact',
        size: 'sm',
    });
    return layoutProps;
};

interface PlaygroundHeaderCenterProps {
    initialSettings?: {
        recipe?: QuickReferenceRecord;
        version?: number;
    };
    currentMode?: string;
    onModeChange?: (mode: string) => void;
    onVersionChange?: (version: number) => void;
    onNewRecipe?: () => void;
}

const PlaygroundHeaderCenter = ({
    initialSettings = {},
    currentMode = 'prompt',
    onModeChange = () => {},
    onVersionChange = () => {},
    onNewRecipe = () => {},
}: PlaygroundHeaderCenterProps) => {
    const [lastUsedRecipe, setLastUsedRecipe] = usePreferenceValue('playground', 'lastRecipeId');
    const [version, setVersion] = useState(initialSettings?.version ?? 1);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const handleRecipeChange = (record: QuickReferenceRecord) => {
        setLastUsedRecipe(record.recordKey);
    };

    const handleVersionChange = (newVersion: number) => {
        setVersion(newVersion);
        onVersionChange(newVersion);
    };

    return (
        <div className='flex items-center justify-center w-full px-2 h-10'>
            <div className='flex items-center gap-2 max-w-4xl w-full'>
                <PlaygroundNavContainer
                    currentMode={currentMode}
                    onModeChange={onModeChange}
                />

                <div className='flex items-center justify-center gap-2 flex-1 min-w-0'>
                    <div className='min-w-[160px] max-w-[320px] w-full'>
                        <QuickRefSelect
                            entityKey='recipe'
                            onRecordChange={handleRecipeChange}
                        />
                    </div>

                    <Select
                        value={version.toString()}
                        onValueChange={(v) => handleVersionChange(Number(v))}
                    >
                        <SelectTrigger className='h-8 w-24'>
                            <div className='flex items-center justify-center'>
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

                    <div className='flex items-center gap-2'>
                        <Button
                            variant='ghost'
                            size='md'
                            className='h-8 w-8 p-0 shrink-0'
                            onClick={() => onNewRecipe()}
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
                </div>

                <PlaygroundHistoryDialog
                    isOpen={isHistoryOpen}
                    onOpenChange={setIsHistoryOpen}
                />
            </div>
        </div>
    );
};

export default PlaygroundHeaderCenter;

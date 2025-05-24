'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/ButtonMine';
import { Plus, History, Save } from 'lucide-react';
import PlaygroundHistoryDialog from './PlaygroundHistoryDialog';
import PlaygroundNavContainer from './PlaygroundNavContainer';
import { UseAiCockpitHook } from '../hooks/useAiCockpit';
import QuickRefSearchableSelect from '@/app/entities/quick-reference/QuickRefSearchableSelect';

interface PlaygroundHeaderCenterProps {
    currentMode?: string;
    onModeChange?: (mode: string) => void;
    onVersionChange?: (version: number) => void;
    onNewRecipe?: () => void;
    aiCockpitHook: UseAiCockpitHook;
}

const PlaygroundHeaderCenter = ({
    currentMode,
    onModeChange = () => {},
    onVersionChange = () => {},
    onNewRecipe = () => {},
    aiCockpitHook,
}: PlaygroundHeaderCenterProps) => {
    const { saveCompiledRecipe, recipeVersion, activeRecipeMatrxId, recipeRecord } = aiCockpitHook;
    const [version, setVersion] = useState(recipeVersion);

    useEffect(() => {
        setVersion(recipeVersion-1);
    }, [recipeVersion]);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const handleSaveCompiledRecipe = () => {
        saveCompiledRecipe();
    }

    const handleVersionChange = (newVersion: number) => {
        setVersion(newVersion);
        onVersionChange(newVersion);
    };

    return (
        <div className='flex items-center w-full px-2 h-10'>
            <div className='flex items-center gap-4 w-full'>
                <PlaygroundNavContainer
                    currentMode={currentMode}
                    onModeChange={onModeChange}
                />

                <div className='flex items-center gap-2 flex-1 pl-5 min-w-0'>
                    <Button
                        variant='ghost'
                        size='md'
                        className='bg-elevation2 h-8 w-8 px-2 shrink-0'
                        onClick={() => onNewRecipe()}
                    >
                        <Plus size={16} />
                    </Button>

                    <div className='min-w-[160px] max-w-[320px] w-full'>
                        <QuickRefSearchableSelect
                            entityKey='recipe'
                        />
                    </div>
                    <select
                        className='w-16 bg-elevation1 rounded-md p-2 text-sm'
                        value={version.toString()}
                        onChange={(v) => handleVersionChange(Number(v))}
                    >
                        <option value=''></option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
                            <option
                                key={v}
                                value={v.toString()}
                                className='text-ellipsis overflow-hidden'
                            >
                                {v}
                            </option>
                        ))}
                    </select>
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='ghost'
                            size='md'
                            className='bg-elevation2 h-8 w-8 px-2 shrink-0'
                            disabled={!activeRecipeMatrxId}
                            onClick={handleSaveCompiledRecipe}
                        >
                            <Save size={12} />
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

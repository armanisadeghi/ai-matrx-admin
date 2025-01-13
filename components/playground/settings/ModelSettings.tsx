import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, SquarePlus } from 'lucide-react';
import { useAiSettings } from '../hooks/useAiSettings';
import DynamicPromptSettings from './DynamicPromptSettings';
import { useAppSelector, useEntityTools } from '@/lib/redux';

const ModelSettings = () => {
    const { settingsMatrxId, aiProviderRecordid, aiModelRecordid, aiEndpointRecordid } = useAiSettings();

    const recipeEntity = useEntityTools('recipe');
    const activeRecipeId = useAppSelector(recipeEntity.selectors.selectActiveRecordId) as string;

    const initialSettings = {
        aiAgent: settingsMatrxId,
        provider: aiProviderRecordid,
        model: aiModelRecordid,
        endpoint: aiEndpointRecordid,
    };

    return (
        <>
            <div className='flex gap-2 items-center'>
                <Button
                    variant='outline'
                    size='icon'
                    className='h-9 w-9'
                >
                    <Save size={16} />
                </Button>
                <Button
                    variant='outline'
                    size='icon'
                    className='h-9 w-9'
                >
                    <SquarePlus size={16} />
                </Button>
            </div>
            <DynamicPromptSettings />
        </>
    );
};

export default ModelSettings;

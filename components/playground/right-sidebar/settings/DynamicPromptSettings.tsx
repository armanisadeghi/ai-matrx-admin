import EntityFormCustomMinimal from '@/app/entities/forms/EntityFormCustomMinimal';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { useCallback } from 'react';
import { PlaygroundControls } from '../../types';
import { UseRecipeAgentSettingsHook } from '../../hooks/useRecipeAgentSettings';

const initialLayoutProps = getUnifiedLayoutProps({
    entityKey: 'aiSettings',
    formComponent: 'MINIMAL',
    quickReferenceType: 'LIST',
    isExpanded: true,
    handlers: {},
});

const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
    formComponent: 'MINIMAL',
    dynamicStyleOptions: {
        density: 'compact',
        size: 'sm',
    },
    dynamicLayoutOptions: {
        formStyleOptions: {
            fieldFiltering: {
                excludeFields: ['id'],
                defaultShownFields: ['presetName', 'aiEndpoint', 'aiProvider', 'aiModel', 'temperature', 'maxTokens', 'stream', 'responseFormat', 'tools'],
            },
        },
    },
});


interface DynamicPromptSettingsProps {
    playgroundControls: PlaygroundControls;
    recipeAgentSettingsHook: UseRecipeAgentSettingsHook;
    settingsSetNumber: number;
}

interface FieldOptions {
    onFieldChange: (fieldName: string, value: unknown) => void;
}

export const DynamicPromptSettings = ({ playgroundControls, recipeAgentSettingsHook, settingsSetNumber }: DynamicPromptSettingsProps) => {
    const settingsIndex = settingsSetNumber - 1;
    const {
        aiAgents,
        agentMatrxIds,
        settingsIds,
        settingsMatrxIds = [],
        coreSettings,
        processedSettings,
        recipePkId,
        recipeMatrxId,
        deleteSettings,
        createNewSettingsData,
        aiSettingsIsLoading,
        aiSettingsLoadingState,
    } = recipeAgentSettingsHook;

    const recordId = Array.isArray(settingsMatrxIds) && settingsMatrxIds.length > settingsIndex ? settingsMatrxIds[settingsIndex] : null;


    const handleFieldChange = useCallback((field: string, value: unknown) => {
        console.log('Field changed:', field, value);
    }, []);


    const fieldOptions: FieldOptions = {
        onFieldChange: handleFieldChange,
    };

    return (
        <EntityFormCustomMinimal
            recordId={recordId}
            unifiedLayoutProps={layoutProps}
            fieldOptions={fieldOptions}
            avoidViewMode={false}
            showRelatedFields={true}
            density={'compact'}

        />
    );
};

export default DynamicPromptSettings;

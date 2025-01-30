import EntityFormCustomMinimal from '@/app/entities/forms/EntityFormCustomMinimal';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { useCallback } from 'react';
import { PlaygroundControls } from '../../types';
import { UseRecipeAgentSettingsHook } from '../../hooks/useRecipeAgentSettings';
import { FieldRendererOptions } from '@/app/entities/hooks/form-related/useFieldRenderer';
import { CrudButtonOptions, CrudLayout } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper';

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

const DEFAULT_CRUD_OPTIONS: CrudButtonOptions = {
    allowCreate: false,
    allowEdit: true,
    allowDelete: true,
    allowAdvanced: true,
    allowRefresh: true,
    forceEnable: true,
};

const DEFAULT_CRUD_LAYOUT: CrudLayout = {
    buttonLayout: 'row',
    buttonSize: 'icon',
    buttonsPosition: 'top',
    buttonSpacing: 'compact',
};


export const DynamicPromptSettings = ({ playgroundControls, recipeAgentSettingsHook, settingsSetNumber }: DynamicPromptSettingsProps) => {
    const settingsIndex = settingsSetNumber - 1;
    const {
        settingsMatrxIds = [],
    } = recipeAgentSettingsHook;

    const recordId = Array.isArray(settingsMatrxIds) && settingsMatrxIds.length > settingsIndex ? settingsMatrxIds[settingsIndex] : null;


    const handleFieldChange = useCallback((field: string, value: unknown) => {
        console.log('Field changed:', field, value);
    }, []);


    const fieldOptions: FieldRendererOptions = {
        onFieldChange: handleFieldChange,
        forceEnable: true,
    };

    return (
        <EntityFormCustomMinimal
            recordId={recordId}
            unifiedLayoutProps={layoutProps}
            fieldOptions={fieldOptions}
            avoidViewMode={true}
            showRelatedFields={true}
            density={'compact'}
            crudOptionsOverride={DEFAULT_CRUD_OPTIONS}
            crudLayoutOverride={DEFAULT_CRUD_LAYOUT}
        />
    );
};

export default DynamicPromptSettings;

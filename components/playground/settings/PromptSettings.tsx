import EntityFormCustomMinimal from '@/app/entities/forms/EntityFormCustomMinimal';
import { useCallback } from 'react';
import { CockpitPanelProps } from '../types';
import { RecordTabData, UseRecipeAgentSettingsHook } from '@/hooks/aiCockpit/useRecipeAgentSettings';
import { FieldRendererOptions } from '@/app/entities/hooks/form-related/useFieldRenderer';
import { DEFAULT_CRUD_LAYOUT, DEFAULT_CRUD_OPTIONS, layoutProps } from './constants';
import PlaygroundResources from './PlaygroundResources';
import AppletResources from './AppletResources';
import MetricsCard from './MetricsCard';

interface AiSettingsRecordProps {
    tab: RecordTabData;
    playgroundControls: CockpitPanelProps['playgroundControls'];
    recipeAgentSettingsHook: UseRecipeAgentSettingsHook;
}

const AiSettingsRecord: React.FC<AiSettingsRecordProps> = ({ 
    tab, 
    playgroundControls, 
    recipeAgentSettingsHook 
}) => {
    const settingsIndex = tab.tabId - 1;
    const { settingsMatrxIds = [] } = recipeAgentSettingsHook;

    const recordId = Array.isArray(settingsMatrxIds) && settingsMatrxIds.length > settingsIndex 
        ? settingsMatrxIds[settingsIndex] 
        : null;

    const handleFieldChange = useCallback((field: string, value: unknown) => {
    }, []);

    const fieldOptions: FieldRendererOptions = {
        onFieldChange: handleFieldChange,
        forceEnable: true,
    };

    return (
        <div className='flex flex-col h-full'>
            {/* Scrollable section for settings */}
            <div className='flex-1 overflow-auto'>
                <div className='space-y-4 p-2'>
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
                </div>
            </div>
            {/* Fixed bottom section */}
            <div className='mt-auto border-t border-border/30 space-y-4'>
                <AppletResources
                    playgroundControls={playgroundControls}
                    recipeAgentSettingsHook={recipeAgentSettingsHook}
                />
                <PlaygroundResources
                    playgroundControls={playgroundControls}
                    recipeAgentSettingsHook={recipeAgentSettingsHook}
                    settingsSetNumber={tab.tabId}
                />
                <MetricsCard 
                    playgroundControls={playgroundControls}
                    recipeAgentSettingsHook={recipeAgentSettingsHook}
                    settingsSetNumber={tab.tabId}
                />
            </div>
        </div>
    );
};

export default AiSettingsRecord;
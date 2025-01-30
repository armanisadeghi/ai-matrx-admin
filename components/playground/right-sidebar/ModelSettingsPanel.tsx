'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlaygroundResources from './PlaygroundResources';
import MetricsCard from './MetricsCard';
import { useMeasure } from '@uidotdev/usehooks';
import DynamicPromptSettings from './settings/DynamicPromptSettings';
import { PlaygroundPanelProps } from '../types';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { RecordTabData, UseRecipeAgentSettingsHook } from '../hooks/useRecipeAgentSettings';
import NewSettingsCard from './settings/NewSettingsCard';

const RecordContent: React.FC<{
    tab: RecordTabData;
    playgroundControls: PlaygroundPanelProps['playgroundControls'];
    recipeAgentSettingsHook: UseRecipeAgentSettingsHook;
}> = ({ tab, playgroundControls, recipeAgentSettingsHook }) => (
    <div className='flex flex-col h-full'>
        {/* Scrollable section for settings */}
        <div className='flex-1 overflow-auto'>
            <div className='space-y-4 p-2'>
                <DynamicPromptSettings
                    playgroundControls={playgroundControls}
                    recipeAgentSettingsHook={recipeAgentSettingsHook}
                    settingsSetNumber={tab.tabId}
                />
            </div>
        </div>
        {/* Fixed bottom section */}
        <div className='mt-auto border-t border-border/30'>
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


const ModelSettingsPanel: React.FC<PlaygroundPanelProps> = ({ playgroundControls }) => {
    const dispatch = useAppDispatch();
    const [ref, { width }] = useMeasure<HTMLDivElement>();
    const [isNarrow, setIsNarrow] = useState(false);
    const { actions, selectors } = useEntityTools('aiSettings');

    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    const { generateTabs, createNewSettingsData, recipeAgentSettingsHook } = playgroundControls.aiCockpitHook

    const tabs = generateTabs();
    const [activeTab, setActiveTab] = useState<number>(1);

    useEffect(() => {
        if (operationMode === 'view') {
            dispatch(actions.setOperationMode('update'));
        }
    }, [operationMode, dispatch, actions]);

    useEffect(() => {
        setIsNarrow(width < 175);
    }, [width]);

    const handleTabChange = (tabId: string) => {
        const numericTabId = parseInt(tabId);
        const tab = tabs.find((t) => t.tabId === numericTabId);
        if (!tab?.isDisables) {
            setActiveTab(numericTabId);
        }
    };

    const handleNewSettings = async () => {
        const clickedTab = tabs.find(tab => !tab.isDisables && !tab.isRecord);
        if (clickedTab) {
            const settingsData = {
                id: clickedTab.id,
                presetName: clickedTab.presetName,
            };
            const agentData = {
                name: `Agent for ${clickedTab.presetName}`,
            };
            
            setActiveTab(clickedTab.tabId);
            await createNewSettingsData(settingsData, agentData);
        }
    };

    const activeSlot = tabs.find(tab => tab.tabId === activeTab);

    return (
        <div className='h-full flex flex-col bg-background' ref={ref}>
            <Tabs
                value={activeTab.toString()}
                onValueChange={handleTabChange}
                className='w-full rounded-none'
            >
                <TabsList className='w-full grid grid-cols-4 rounded-none bg-elevation2 p-0.5 gap-px'>
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.tabId}
                            value={tab.tabId.toString()}
                            disabled={tab.isDisables}
                            className={`
                                text-sm font-medium rounded-none px-1 py-1.5 
                                data-[state=active]:bg-primary 
                                data-[state=active]:text-primary-foreground
                                border-r border-border/30 last:border-r-0 
                                transition-colors hover:bg-muted/50 
                                data-[state=active]:shadow-sm
                                ${!tab.isRecord ? 'text-muted-foreground' : ''}
                            `}
                        >
                            {isNarrow ? 
                                (tab.isRecord ? `S${tab.tabId}` : '+') : 
                                tab.label
                            }
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className='p-2 flex-1'>
                {activeSlot && (
                    activeSlot.isRecord ? (
                        <RecordContent
                            key={activeSlot.id}
                            tab={activeSlot}
                            playgroundControls={playgroundControls}
                            recipeAgentSettingsHook={recipeAgentSettingsHook}
                        />
                    ) : (
                        <NewSettingsCard
                            key={activeSlot.id}
                            onCreateNew={handleNewSettings}
                            isDisabled={activeSlot.isDisables}
                        />
                    )
                )}
            </div>
        </div>
    );
};

export default ModelSettingsPanel;
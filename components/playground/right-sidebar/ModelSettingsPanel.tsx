'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlaygroundResources from './PlaygroundResources';
import MetricsCard from './MetricsCard';
import { useMeasure } from '@uidotdev/usehooks';
import DynamicPromptSettings from './settings/DynamicPromptSettings';
import { Button } from '@/components/ui';
import { Save, SquarePlus } from 'lucide-react';
import { PlaygroundPanelProps } from '../types';
import { debugFor } from '@/utils/simple-debugger';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { useRecipeAgentSettings } from '../hooks/useRecipeAgentSettings';

const log = debugFor('aiSettings', 'ModelSettingsPanel');

const ModelSettingsPanel: React.FC<PlaygroundPanelProps> = ({ playgroundControls }) => {
    const dispatch = useAppDispatch();
    const [ref, { width }] = useMeasure<HTMLDivElement>();
    const [isNarrow, setIsNarrow] = useState(false);
    const { actions, selectors } = useEntityTools('aiSettings');

    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    const { doubleParentActiveRecipeHook } = playgroundControls;
    const { activeParentMatrxId: activeRecipeId, secondRelHook: recipeAgentProcessingHook } = doubleParentActiveRecipeHook || {};

    const recipeAgentSettingsHook = useRecipeAgentSettings(recipeAgentProcessingHook);

    const {
        generateTabs,
        createNewSettingsData,
        aiSettingsIsLoading
    } = recipeAgentSettingsHook;

    const tabs = generateTabs();
    const [activeTab, setActiveTab] = useState(() => tabs[0]?.tabId || 'set1');

    useEffect(() => {
        if (operationMode === 'view') {
            dispatch(actions.setOperationMode('update'));
        }
    }, [operationMode, dispatch, actions]);

    useEffect(() => {
        setIsNarrow(width < 175);
    }, [width]);

    const handleTabChange = (tabId: string) => {
        const tab = tabs.find(t => t.tabId === tabId);
        if (!tab?.isDisables) {
            setActiveTab(tabId);
        }
    };

    const handleNewSettings = async () => {
        const clickedTab = tabs.find(tab => tab.label === 'Add' && !tab.isDisables);
        if (clickedTab) {
            const settingsData = {
                id: clickedTab.id,
                presetName: clickedTab.presetName
            };
            const agentData = {
                id: clickedTab.id,
                name: `Agent for ${clickedTab.presetName}`
            };
            
            // Update the active tab to the one being created
            setActiveTab(clickedTab.tabId);
            
            await createNewSettingsData(settingsData, agentData);
        }
    };

    const activeSlot = tabs.find(tab => tab.tabId === activeTab);

    return (
        <div
            className='h-full flex flex-col bg-background'
            ref={ref}
        >
            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className='w-full rounded-none'
            >
                <TabsList className='w-full grid grid-cols-4 rounded-none bg-elevation2 p-0.5 gap-px'>
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.tabId}
                            value={tab.tabId}
                            disabled={tab.isDisables}
                            className={`
                                text-sm font-medium rounded-none px-1 py-1.5 
                                data-[state=active]:bg-primary 
                                data-[state=active]:text-primary-foreground
                                border-r border-border/30 last:border-r-0 
                                transition-colors hover:bg-muted/50 
                                data-[state=active]:shadow-sm
                                ${tab.label === 'Add' ? 'text-muted-foreground' : ''}
                            `}
                        >
                            {isNarrow
                                ? tab.label === 'Add'
                                    ? '+'
                                    : tab.label.replace('set ', 'S')
                                : tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className='p-2 space-y-4'>
                <div className='flex gap-2 items-center'>
                    <Button
                        variant='outline'
                        size='icon'
                        className='h-9 w-9'
                        disabled={!activeSlot || activeSlot.label === 'Add'}
                    >
                        <Save size={16} />
                    </Button>
                    <Button
                        variant='outline'
                        size='icon'
                        className='h-9 w-9'
                        disabled={!tabs.some(tab => tab.label === 'Add' && !tab.isDisables)}
                        onClick={handleNewSettings}
                    >
                        <SquarePlus size={16} />
                    </Button>
                </div>
                {activeSlot && activeSlot.label !== 'Add' && (
                    <DynamicPromptSettings
                        playgroundControls={playgroundControls}
                        recipeAgentSettingsHook={recipeAgentSettingsHook}
                        settingsSetNumber={parseInt(activeSlot.tabId)}
                        key={activeSlot.id}
                    />
                )}
            </div>

            <div className='mt-auto'>
                <PlaygroundResources />
                <MetricsCard />
            </div>
        </div>
    );
};

export default ModelSettingsPanel;
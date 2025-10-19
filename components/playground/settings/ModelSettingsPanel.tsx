'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMeasure } from '@uidotdev/usehooks';
import { CockpitPanelProps } from '../types';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import NewSettingsCard from './NewSettingsCard';
import AiSettingsRecord from './PromptSettings';

const ModelSettingsPanel: React.FC<CockpitPanelProps> = ({ playgroundControls }) => {
    const dispatch = useAppDispatch();
    const [ref, { width }] = useMeasure<HTMLDivElement>();
    const [isNarrow, setIsNarrow] = useState(false);
    const { actions, selectors } = useEntityTools('aiSettings');

    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    const { generateTabs, createNewSettingsData, recipeAgentSettingsHook } = playgroundControls.aiCockpitHook;

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
        const clickedTab = tabs.find((tab) => !tab.isDisables && !tab.isRecord);
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

    const activeSlot = tabs.find((tab) => tab.tabId === activeTab);

    return (
        <div
            className='h-full flex flex-col bg-textured'
            ref={ref}
        >
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
                            {isNarrow ? (tab.isRecord ? `S${tab.tabId}` : '+') : tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className='p-2 flex-1'>
                {activeSlot &&
                    (activeSlot.isRecord ? (
                        <AiSettingsRecord
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
                    ))}
            </div>
        </div>
    );
};

export default ModelSettingsPanel;

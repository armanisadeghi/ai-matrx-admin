"use client";

import React from "react";
import { PanelGroup } from "react-resizable-panels";
import MultiSwitchToggle from "@/components/matrx/MultiSwitchToggle";
import { CompiledRecipeDisplay } from "./CompiledRecipeDisplay";
import { CockpitControls } from "../types";
import { usePanelSystem } from "./usePanelSystem";

interface ResultPanelManagerProps {
    cockpitControls: CockpitControls;
}

export function ResultPanelManager({ cockpitControls: playgroundControls }: ResultPanelManagerProps) {
    const { generateTabs, socketHook, addAssistantResponse } = playgroundControls.aiCockpitHook;
    const { deleteSettings } = playgroundControls.aiCockpitHook.recipeAgentSettingsHook;
    const tabs = generateTabs();

    const {
        currentView,
        setCurrentView,
        renderPanel,
        responseFormats
    } = usePanelSystem({
        defaultView: 'markdown',
        onViewChange: (view) => {
        }
    });

    const {taskIds } = socketHook;


    const recordTabs = tabs.filter((tab) => tab.isRecord);
    
    // Calculate minPanelSize based on number of panels
    const minPanelSize = recordTabs.length > 0 ? 100 / recordTabs.length : 100;

    // Don't render PanelGroup if there are no panels and we're not in compiled view
    if (recordTabs.length === 0 && currentView !== 'compiled') {
        return (
            <div className='h-full flex flex-col'>
                <div className='flex-1' />
                <div>
                    <MultiSwitchToggle
                        variant='geometric'
                        width='w-28'
                        height='h-10'
                        disabled={false}
                        states={responseFormats}
                        onChange={setCurrentView}
                        value={currentView}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className='h-full flex flex-col bg-textured rounded-xl'>
            {currentView === 'compiled' ? (
                <CompiledRecipeDisplay cockpitControls={playgroundControls} />
            ) : (
                <PanelGroup
                    direction='vertical'
                    className='flex-1 bg-textured rounded-xl'
                >
                    {recordTabs.map((tab, index) => 
                        renderPanel({
                            key: tab.id,
                            id: `result-${tab.id}`,
                            order: tab.tabId,
                            number: tab.tabId,
                            label: tab.resultLabel,
                            taskId: taskIds[index] || '',
                            onDelete: deleteSettings,
                            debug: process.env.NODE_ENV === 'development',
                            onDebugClick: (id) => console.log('Debug clicked:', id),
                            minSize: minPanelSize,
                            addAssistantResponse: addAssistantResponse,
                        })
                    )}
                </PanelGroup>
            )}

            <div>
                <MultiSwitchToggle
                    variant='geometric'
                    width='w-28'
                    height='h-10'
                    disabled={false}
                    states={responseFormats}
                    onChange={setCurrentView}
                    value={currentView}
                />
            </div>
        </div>
    );
}
'use client';

import React, { useState } from 'react';
import { PanelGroup } from 'react-resizable-panels';
import { MessageSquare, FileText, Code2, FormInput, Image, Sparkles, FileCode } from 'lucide-react';
import MultiSwitchToggle from '@/components/matrx/MultiSwitchToggle';
import { CompiledRecipeDisplay } from './CompiledRecipeDisplay';
import { ResultPanel } from './ResultPanel';
import { CockpitControls } from '../types';

interface ResultPanelManagerProps {
    cockpitControls: CockpitControls;
}

const responseFormats = [
    { icon: <MessageSquare size={14} />, label: 'Text', value: 'text' },
    { icon: <FileText size={14} />, label: 'Markdown', value: 'markdown' },
    { icon: <Code2 size={14} />, label: 'Code', value: 'code' },
    { icon: <FormInput size={14} />, label: 'Form', value: 'form' },
    { icon: <Image size={14} />, label: 'Image', value: 'image' },
    { icon: <Sparkles size={14} />, label: 'Dynamic', value: 'dynamic' },
    { icon: <FileCode size={14} />, label: 'Compiled', value: 'compiled' },
];

export function ResultPanelManager({ cockpitControls: playgroundControls }: ResultPanelManagerProps) {
    const { generateTabs, socketHook } = playgroundControls.aiCockpitHook;
    const { deleteSettings } = playgroundControls.aiCockpitHook.recipeAgentSettingsHook;
    const tabs = generateTabs();
    const [currentView, setCurrentView] = useState('text');

    const {
        streamingResponses,
        responseRef,
        isResponseActive,
    } = socketHook;

    const recordTabs = tabs.filter((tab) => tab.isRecord);

    const handleResponseFormatChange = (format: string) => {
        setCurrentView(format);
    };

    return (
        <div className='h-full flex flex-col'>
            {currentView === 'compiled' ? (
                <CompiledRecipeDisplay cockpitControls={playgroundControls} />
            ) : (
                <PanelGroup
                    direction='vertical'
                    className='flex-1'
                >
                    {recordTabs.map((tab, index) => (
                        <ResultPanel
                            key={tab.id}
                            id={`result-${tab.id}`}
                            order={tab.tabId}
                            number={tab.tabId}
                            label={tab.resultLabel}
                            streamingText={streamingResponses[index] || ''}
                            onDelete={deleteSettings}
                            debug={process.env.NODE_ENV === 'development'}
                            onDebugClick={(id) => console.log('Debug clicked:', id)}
                        />
                    ))}
                </PanelGroup>
            )}

            <div>
                <MultiSwitchToggle
                    variant='geometric'
                    width='w-28'
                    height='h-10'
                    disabled={false}
                    states={responseFormats}
                    onChange={handleResponseFormatChange}
                    value={currentView}
                />
            </div>
        </div>
    );
}

export default ResultPanelManager;
'use client';

import React from 'react';
import { PanelGroup } from 'react-resizable-panels';
import { AdjustableResultPanel } from './AdjustableResultPanel';
import { PlaygroundControls } from '../types';
import { MessageSquare, FileText, Code2, FormInput, Image, Sparkles } from 'lucide-react';
import MultiSwitchToggle from '@/components/matrx/MultiSwitchToggle';

interface ResultPanelManagerProps {
    playgroundControls: PlaygroundControls;
}

const responseFormats = [
    { icon: <MessageSquare size={14} />, label: 'Text', value: 'text' },
    { icon: <FileText size={14} />, label: 'Markdown', value: 'markdown' },
    { icon: <Code2 size={14} />, label: 'Code', value: 'code' },
    { icon: <FormInput size={14} />, label: 'Form', value: 'form' },
    { icon: <Image size={14} />, label: 'Image', value: 'image' },
    { icon: <Sparkles size={14} />, label: 'Dynamic', value: 'dynamic' },
];

export function ResultPanelManager({ playgroundControls }: ResultPanelManagerProps) {
    const { generateTabs } = playgroundControls.aiCockpitHook;
    const tabs = generateTabs();

    const recordTabs = tabs.filter((tab) => tab.isRecord);

    const handleResponseFormatChange = (format: string) => {
        // Handle format change
    };

    return (
        <div className='h-full flex flex-col'>
            <PanelGroup
                direction='vertical'
                className='flex-1'
            >
                {recordTabs.map((tab) => (
                    <AdjustableResultPanel
                        key={tab.id}
                        id={`result-${tab.id}`}
                        order={tab.tabId}
                        number={tab.tabId}
                        label={tab.resultLabel}
                    />
                ))}
            </PanelGroup>

            {/* Container to match previous button height */}
            <div>
                <MultiSwitchToggle
                    variant='geometric'
                    width='w-28'
                    height='h-10'
                    disabled={false}
                    states={responseFormats}
                    onChange={handleResponseFormatChange}
                />
            </div>
        </div>
    );
}

export default ResultPanelManager;

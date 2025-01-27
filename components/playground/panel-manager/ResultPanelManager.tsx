'use client';

import React, { useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { Button, Card } from '@/components/ui';
import { Plus } from 'lucide-react';
import { AdjustableResultPanel } from './AdjustableResultPanel';
import { PlaygroundControls } from '../types';

interface ResultPanelManagerProps {
    initialPanels?: number;
    onAddSection?: () => void;
    playgroundControls: PlaygroundControls;
}

type Section = {
    id: string;
    number: number;
};

export function ResultPanelManager({ initialPanels = 2, onAddSection, playgroundControls }: ResultPanelManagerProps) {
    const {
        onToggleBrokers,
        onToggleSettings,
        onShowCode,
        onNewRecipe,
        currentMode,
        onModeChange,
        version,
        onVersionChange,
        onPlay,
        isLeftCollapsed,
        isRightCollapsed,
        onOpenLeftPanel,
        onOpenRightPanel,
        fullScreenToggleButton,
        doubleParentActiveRecipeHook,
    } = playgroundControls;

    const [sections, setSections] = useState<Section[]>(
        Array.from({ length: initialPanels }, (_, i) => ({
            id: `result-${i + 1}`,
            number: i + 1,
        }))
    );

    const addSection = () => {
        const newNumber = sections.length + 1;
        const newId = `result-${newNumber}`;

        setSections([
            ...sections,
            {
                id: newId,
                number: newNumber,
            },
        ]);

        if (onAddSection) {
            onAddSection();
        }
    };

    return (
        <PanelGroup
            direction='vertical'
            className='h-full'
        >
            {sections.map((section, index) => (
                <AdjustableResultPanel
                    key={section.id}
                    id={section.id}
                    order={index + 1}
                    number={section.number}
                />
            ))}

            <Button
                variant='ghost'
                className='w-full mt-2'
                onClick={addSection}
            >
                <Plus className='h-4 w-4 mr-2' />
                Add Result
            </Button>
        </PanelGroup>
    );
}

export default ResultPanelManager;

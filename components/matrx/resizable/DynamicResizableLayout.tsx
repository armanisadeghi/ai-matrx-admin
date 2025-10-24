'use client';

import React, {useState} from 'react';
import {
    ResizablePanel,
    ResizablePanelGroup,
    ResizableHandle,
} from '@/components/ui/resizable';

interface PanelConfig {
    content: React.ReactNode;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    collapsible?: boolean;
}

interface DynamicResizableLayoutProps {
    panels: PanelConfig[];
    direction?: 'horizontal' | 'vertical';
    className?: string;
}

export function DynamicResizableLayout(
    {
        panels,
        direction = 'horizontal',
        className = ''
    }: DynamicResizableLayoutProps) {
    const totalDefaultSize = panels.reduce((sum, panel) => sum + (panel.defaultSize || 0), 0);
    if (totalDefaultSize > 100) {
        console.warn('Total default sizes exceed 100%. Panels will be adjusted proportionally.');
    }

    const defaultSizes = panels.map((panel, index) => {
        if (panel.defaultSize) return panel.defaultSize;
        const remainingPanels = panels.length - panels.filter(p => p.defaultSize).length;
        const remainingSize = 100 - panels.reduce((sum, p) => sum + (p.defaultSize || 0), 0);
        return remainingSize / remainingPanels;
    });

    const [panelSizes, setPanelSizes] = useState(defaultSizes);

    const handleResize = (index: number, size: number) => {
        setPanelSizes(prevSizes => {
            const newSizes = [...prevSizes];
            const oldSize = newSizes[index];
            const diff = size - oldSize;

            const totalOtherSizes = prevSizes.reduce((sum, s, i) => i !== index ? sum + s : sum, 0);
            newSizes[index] = size;

            prevSizes.forEach((_, i) => {
                if (i !== index) {
                    newSizes[i] = prevSizes[i] - (diff * (prevSizes[i] / totalOtherSizes));
                }
            });

            return newSizes;
        });
    };

    return (
        <div className={`h-full overflow-hidden ${className}`}>
            <ResizablePanelGroup
                direction={direction}
                className="h-full"
            >
                {panels.map((panel, index) => (
                    <React.Fragment key={index}>
                        <ResizablePanel
                            defaultSize={panelSizes[index]}
                            minSize={panel.minSize || 10}
                            maxSize={panel.maxSize || 90}
                            collapsible={panel.collapsible}
                            onResize={(size) => handleResize(index, size)}
                            className="flex"
                        >
                            <div className="flex-1 min-h-0 relative">
                                <div className="absolute inset-0 overflow-auto">
                                    {panel.content}
                                </div>
                            </div>
                        </ResizablePanel>
                        {index < panels.length - 1 && <ResizableHandle/>}
                    </React.Fragment>
                ))}
            </ResizablePanelGroup>
        </div>
    );
}

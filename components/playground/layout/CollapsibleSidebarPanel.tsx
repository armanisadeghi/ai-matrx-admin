'use client';

import React, { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { Panel, ImperativePanelHandle, PanelResizeHandle } from 'react-resizable-panels';
import { PlaygroundPanelComponent, PlaygroundControls } from '../types';

export interface CollapsibleSidebarPanelProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  height?: number;
  className?: string;
  component: PlaygroundPanelComponent;
  side?: 'left' | 'right';
  playgroundControls: PlaygroundControls;
}

const CollapsibleSidebarPanel = forwardRef<ImperativePanelHandle, CollapsibleSidebarPanelProps>(
    (
        {
            // Panel props
            defaultSize = 17,
            minSize = 8,
            maxSize = 40,
            collapsible = true,
            onCollapse = () => {},
            onExpand = () => {},
            // Card props
            height = 800,
            className = '',
            // Content props
            component: Component,
            side = 'left',
            playgroundControls,
        },
        ref
    ) => {
        const panelContent = (
            <Panel
                defaultSize={defaultSize}
                minSize={minSize}
                maxSize={maxSize}
                collapsible={collapsible}
                ref={ref}
                onCollapse={onCollapse}
                onExpand={onExpand}
            >
                <Card
                    className={`rounded-none bg-background ${className}`}
                    style={{ height: `${height}px`, overflow: 'hidden' }}
                >
                    <div className='h-full overflow-y-auto'>
                        <Component playgroundControls={playgroundControls}/>
                    </div>
                </Card>
            </Panel>
        );

        return (
            <>
                {side === 'left' ? (
                    <>
                        {panelContent}
                        <PanelResizeHandle />
                    </>
                ) : (
                    <>
                        <PanelResizeHandle />
                        {panelContent}
                    </>
                )}
            </>
        );
    }
);

CollapsibleSidebarPanel.displayName = 'CollapsibleSidebarPanel';

export default CollapsibleSidebarPanel;

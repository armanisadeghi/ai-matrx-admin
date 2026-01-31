'use client';

import React, { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { Panel, PanelImperativeHandle, Separator } from 'react-resizable-panels';
import { CockpitPanelComponent, CockpitControls } from '../types';

export interface CollapsibleSidebarPanelProps {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  height?: number;
  className?: string;
  component: CockpitPanelComponent;
  side?: 'left' | 'right';
  cockpitControls: CockpitControls;
}

const CollapsibleSidebarPanel = forwardRef<PanelImperativeHandle, CollapsibleSidebarPanelProps>(
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
            cockpitControls: playgroundControls,
        },
        ref
    ) => {
        const panelContent = (
            <Panel
                defaultSize={defaultSize}
                minSize={minSize}
                maxSize={maxSize}
                collapsible={collapsible}
                panelRef={ref}
            >
                <Card
                    className={`rounded-none bg-textured ${className}`}
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
                        <Separator />
                    </>
                ) : (
                    <>
                        <Separator />
                        {panelContent}
                    </>
                )}
            </>
        );
    }
);

CollapsibleSidebarPanel.displayName = 'CollapsibleSidebarPanel';

export default CollapsibleSidebarPanel;

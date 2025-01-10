'use client';

import React, { useRef, useState, forwardRef } from 'react';
import { PanelGroup, ImperativePanelHandle, PanelResizeHandle, Panel } from 'react-resizable-panels';
import { useMeasure } from '@uidotdev/usehooks';
import CollapsibleSidebarPanel from './CollapsibleSidebarPanel';
import { ResultPanelManager } from '@/components/playground/panel-manager/ResultPanelManager';
import EditorContainer from '../panel-manager/EditorContainer';

interface DynamicPlaygroundPanelsProps {
    leftComponent: React.ComponentType;
    rightComponent: React.ComponentType;
    onLeftCollapsedChange?: (isCollapsed: boolean) => void;
    onRightCollapsedChange?: (isCollapsed: boolean) => void;
    onLeftResize?: (size: number) => void;
    onRightResize?: (size: number) => void;
    initialLeftSize?: number;
    initialRightSize?: number;
    initialPanelCount?: number;
    className?: string;
}

const DynamicPlaygroundPanels = forwardRef<
    {
        leftPanel: ImperativePanelHandle | null;
        rightPanel: ImperativePanelHandle | null;
    },
    DynamicPlaygroundPanelsProps
>(
    (
        {
            leftComponent,
            rightComponent,
            onLeftCollapsedChange,
            onRightCollapsedChange,
            onLeftResize,
            onRightResize,
            initialLeftSize = 15,
            initialRightSize = 15,
            initialPanelCount = 2,
            className = '',
        },
        ref
    ) => {
        const leftPanelRef = useRef<ImperativePanelHandle>(null);
        const rightPanelRef = useRef<ImperativePanelHandle>(null);

        // Expose panel refs to parent
        React.useImperativeHandle(ref, () => ({
            leftPanel: leftPanelRef.current,
            rightPanel: rightPanelRef.current,
        }));

        const onLeftPanelChange = () => {
            if (leftPanelRef.current) {
                onLeftCollapsedChange?.(leftPanelRef.current.isCollapsed());
            }
        };

        const onRightPanelChange = () => {
            if (rightPanelRef.current) {
                onRightCollapsedChange?.(rightPanelRef.current.isCollapsed());
            }
        };

        const [measureRef, { height }] = useMeasure();

        return (
            <div
                ref={measureRef}
                className={`flex-1 overflow-hidden ${className}`}
            >
                <PanelGroup
                    direction='horizontal'
                    className='h-full'
                >
                    <CollapsibleSidebarPanel
                        ref={leftPanelRef}
                        height={height}
                        onCollapse={onLeftPanelChange}
                        onExpand={onLeftPanelChange}
                        className='p-2'
                        component={leftComponent}
                        side='left'
                        defaultSize={initialLeftSize}
                    />
                    <Panel defaultSize={55}>
                        <EditorContainer />
                    </Panel>
                    <PanelResizeHandle />
                    <Panel defaultSize={15}>
                        <ResultPanelManager initialPanels={initialPanelCount} />
                    </Panel>
                    <CollapsibleSidebarPanel
                        ref={rightPanelRef}
                        height={height}
                        onCollapse={onRightPanelChange}
                        onExpand={onRightPanelChange}
                        component={rightComponent}
                        side='right'
                        defaultSize={initialRightSize}
                    />
                </PanelGroup>
            </div>
        );
    }
);

DynamicPlaygroundPanels.displayName = 'DynamicPlaygroundPanels';

export default DynamicPlaygroundPanels;

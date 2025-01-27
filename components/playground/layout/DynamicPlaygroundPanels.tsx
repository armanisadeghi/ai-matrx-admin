'use client';

import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { PanelGroup, ImperativePanelHandle, PanelResizeHandle, Panel } from 'react-resizable-panels';
import { useMeasure } from '@uidotdev/usehooks';
import CollapsibleSidebarPanel from './CollapsibleSidebarPanel';
import { ResultPanelManager } from '@/components/playground/panel-manager/ResultPanelManager';
import MessagesContainer from '../panel-manager/MessagesContainer';
import { PlaygroundPanelComponent, PlaygroundControls } from '../types';

interface DynamicPlaygroundPanelsProps {
    leftComponent: PlaygroundPanelComponent;
    rightComponent: PlaygroundPanelComponent;
    onLeftCollapsedChange?: (isCollapsed: boolean) => void;
    onRightCollapsedChange?: (isCollapsed: boolean) => void;
    onLeftResize?: (size: number) => void;
    onRightResize?: (size: number) => void;
    initialLeftSize?: number;
    initialRightSize?: number;
    initialPanelCount?: number;
    className?: string;
    playgroundControls: PlaygroundControls;
}

const DynamicPlaygroundPanels = forwardRef<{ leftPanel: ImperativePanelHandle | null; rightPanel: ImperativePanelHandle | null, }, DynamicPlaygroundPanelsProps>(
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
            playgroundControls,
        },
        ref
    ) => {
        const leftPanelRef = useRef<ImperativePanelHandle>(null);
        const rightPanelRef = useRef<ImperativePanelHandle>(null);
        const [showBrokers, setShowBrokers] = useState(false);
        const [showSettings, setShowSettings] = useState(false);
        const [showMessages, setShowMessages] = useState(false);
        const [showProcessing, setShowProcessing] = useState(false);

        const { doubleParentActiveRecipeHook } = playgroundControls;

        const { activeParentMatrxId: activeRecipeId, firstRelHook: recipeMessagesProcessingHook, secondRelHook: recipeAgentProcessingHook } = doubleParentActiveRecipeHook;
        const { childRecords: messages } = recipeMessagesProcessingHook;

        useEffect(() => {
            if (activeRecipeId && messages.length > 1) {
                setShowMessages(true);
            }
        }, [activeRecipeId, messages.length]);

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
                        playgroundControls={playgroundControls}
                    />
                    <Panel defaultSize={55}>
                        {/* <EditorContainer /> */}
                        {showMessages && (
                            <MessagesContainer
                                playgroundControls={playgroundControls}
                                />
                        )}
                    </Panel>
                    <PanelResizeHandle />
                    <Panel defaultSize={15}>
                        <ResultPanelManager 
                        initialPanels={initialPanelCount} 
                        playgroundControls={playgroundControls}
                        />
                    </Panel>
                    <CollapsibleSidebarPanel
                        ref={rightPanelRef}
                        height={height}
                        onCollapse={onRightPanelChange}
                        onExpand={onRightPanelChange}
                        component={rightComponent}
                        side='right'
                        defaultSize={initialRightSize}
                        playgroundControls={playgroundControls}
                    />
                </PanelGroup>
            </div>
        );
    }
);

DynamicPlaygroundPanels.displayName = 'DynamicPlaygroundPanels';

export default DynamicPlaygroundPanels;

'use client';

import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { PanelGroup, ImperativePanelHandle, PanelResizeHandle, Panel } from 'react-resizable-panels';
import { useMeasure } from '@uidotdev/usehooks';
import CollapsibleSidebarPanel from './components/CollapsibleSidebarPanel';
import { ResultPanelManager } from '@/components/playground/results/ResultPanelManager';
import MessagesContainer from './messages/MessagesContainer';
import { CockpitPanelComponent, CockpitControls } from './types';
import CompiledRecipeDisplay from './results/CompiledRecipeDisplay';

interface CockpitPanelsProps {
    leftComponent: CockpitPanelComponent;
    rightComponent: CockpitPanelComponent;
    onLeftCollapsedChange?: (isCollapsed: boolean) => void;
    onRightCollapsedChange?: (isCollapsed: boolean) => void;
    onLeftResize?: (size: number) => void;
    onRightResize?: (size: number) => void;
    initialLeftSize?: number;
    initialRightSize?: number;
    className?: string;
    cockpitControls: CockpitControls;
}

const CockpitPanels = forwardRef<{ leftPanel: ImperativePanelHandle | null; rightPanel: ImperativePanelHandle | null }, CockpitPanelsProps>(
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
            className = '',
            cockpitControls,
        },
        ref
    ) => {
        const leftPanelRef = useRef<ImperativePanelHandle>(null);
        const messagesPanelRef = useRef<ImperativePanelHandle>(null);
        const resultsPanelRef = useRef<ImperativePanelHandle>(null);
        const rightPanelRef = useRef<ImperativePanelHandle>(null);


        const [showBrokers, setShowBrokers] = useState(false);
        const [showSettings, setShowSettings] = useState(false);
        const [showMessages, setShowMessages] = useState(false);
        const [showResults, setShowResults] = useState(false);

        const { activeRecipeMatrxId } = cockpitControls.aiCockpitHook;

        useEffect(() => {
            if (activeRecipeMatrxId) {
                setShowMessages(true);
                setShowSettings(true);
                setShowResults(true);
                setShowBrokers(true);
            }
        }, [activeRecipeMatrxId]);

        React.useImperativeHandle(ref, () => ({
            leftPanel: leftPanelRef.current,
            messagesPanel: messagesPanelRef.current,
            resultsPanel: resultsPanelRef.current,
            rightPanel: rightPanelRef.current
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
                        cockpitControls={cockpitControls}
                    />
                    {/* <Panel defaultSize={55}>{showMessages && <DynamicMessagesContainer cockpitControls={cockpitControls} />}</Panel> */}
                    <Panel ref={messagesPanelRef} defaultSize={55}>{showMessages && <MessagesContainer cockpitControls={cockpitControls} />}</Panel>
                    <PanelResizeHandle />
                    <Panel ref={resultsPanelRef} defaultSize={15}>
                        {showResults ? <ResultPanelManager cockpitControls={cockpitControls} /> : <CompiledRecipeDisplay cockpitControls={cockpitControls} />}
                    </Panel>{' '}
                    <CollapsibleSidebarPanel
                        ref={rightPanelRef}
                        height={height}
                        onCollapse={onRightPanelChange}
                        onExpand={onRightPanelChange}
                        component={rightComponent}
                        side='right'
                        defaultSize={initialRightSize}
                        cockpitControls={cockpitControls}
                    />
                </PanelGroup>
            </div>
        );
    }
);

CockpitPanels.displayName = 'CockpitPanels';

export default CockpitPanels;

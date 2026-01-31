'use client';

import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { Group, PanelImperativeHandle, Separator, Panel } from 'react-resizable-panels';
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

const CockpitPanels = forwardRef<{ leftPanel: PanelImperativeHandle | null; rightPanel: PanelImperativeHandle | null }, CockpitPanelsProps>(
    (
        {
            leftComponent,
            rightComponent,
            onLeftCollapsedChange,
            onRightCollapsedChange,
            onLeftResize,
            onRightResize,
            initialLeftSize = 18,
            initialRightSize = 18,
            className = '',
            cockpitControls,
        },
        ref
    ) => {
        const leftPanelRef = useRef<PanelImperativeHandle>(null);
        const messagesPanelRef = useRef<PanelImperativeHandle>(null);
        const resultsPanelRef = useRef<PanelImperativeHandle>(null);
        const rightPanelRef = useRef<PanelImperativeHandle>(null);
        
        const [showBrokers, setShowBrokers] = useState(false);
        const [showSettings, setShowSettings] = useState(false);
        const [showMessages, setShowMessages] = useState(false);
        const [showResults, setShowResults] = useState(false);
        const [isActive, setIsActive] = useState(false);

        const { activeRecipeMatrxId } = cockpitControls.aiCockpitHook;

        useEffect(() => {
            if (activeRecipeMatrxId) {
                // Delay activation by 1000ms to allow things to settle
                const timer = setTimeout(() => {
                    setShowMessages(true);
                    setShowSettings(true);
                    setShowResults(true);
                    setShowBrokers(true);
                    setIsActive(true);
                }, 2000);

                return () => clearTimeout(timer);
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
                className={`flex-1 h-full overflow-hidden transition-opacity duration-1000 ${
                    isActive ? 'opacity-100' : 'opacity-50'
                } ${!isActive ? 'pointer-events-none' : ''} ${className}`}
            >
                <Group
                    orientation='horizontal'
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
                    <Panel panelRef={messagesPanelRef} defaultSize={55}>{showMessages && <MessagesContainer cockpitControls={cockpitControls} />}</Panel>
                    <Separator />
                    <Panel panelRef={resultsPanelRef} defaultSize={9}>
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
                </Group>
            </div>
        );
    }
);

CockpitPanels.displayName = 'CockpitPanels';

export default CockpitPanels;

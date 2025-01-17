'use client';

import React, { useRef, useState, useLayoutEffect } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { Maximize2, Minimize2 } from 'lucide-react';
import PlaygroundHeader from '@/components/playground/header/PlaygroundHeader';
import ModelSettingsPanel from '@/components/playground/right-sidebar/ModelSettingsPanel';
import DynamicPlaygroundPanels from '@/components/playground/layout/DynamicPlaygroundPanels';
import { Button } from '@/components/ui/button';
import BrokerSidebar from '@/components/playground/left-sidebar/BrokersSidebar';

export default function DynamicPanelsPage() {
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const panelsRef = useRef<{
        leftPanel: ImperativePanelHandle | null;
        rightPanel: ImperativePanelHandle | null;
    }>(null);

    useLayoutEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const openLeftPanel = () => {
        if (isFullscreen) {
            panelsRef.current?.leftPanel?.resize(11);
        } else {
            panelsRef.current?.leftPanel?.resize(15);
        }
    };

    const openRightPanel = () => {
        if (isFullscreen) {
            panelsRef.current?.rightPanel?.resize(11);
        } else {
            panelsRef.current?.rightPanel?.resize(15);
        }
    };

    const toggleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                await containerRef.current?.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Error toggling fullscreen:', error);
        }
    };

    const fullScreenToggleButton = (
        <Button
            variant='ghost'
            size='icon'
            onClick={toggleFullscreen}
            className='h-8 w-8 p-0'
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>
    );

    const playgroundControls = {
        onToggleBrokers: () => {
            const newSize = isLeftCollapsed ? (isFullscreen ? 11 : 15) : 0;
            panelsRef.current?.leftPanel?.resize(newSize);
        },
        onToggleSettings: () => {
            const newSize = isRightCollapsed ? (isFullscreen ? 11 : 15) : 0;
            panelsRef.current?.rightPanel?.resize(newSize);
        },
        onShowCode: () => console.log('Show code clicked'),
        currentMode: 'default',
        onModeChange: (mode: string) => console.log(`Mode changed to: ${mode}`),
        version: 1,
        onVersionChange: (version: number) => console.log(`Version changed to: ${version}`),
        onPlay: () => console.log('Play clicked'),
        isLeftCollapsed,
        isRightCollapsed,
        openLeftPanel,
        openRightPanel,
        fullScreenToggleButton,
    };

    return (
        <div
            ref={containerRef}
            className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'}`}
        >
            <PlaygroundHeader {...playgroundControls} />
            <DynamicPlaygroundPanels
                ref={panelsRef}
                leftComponent={BrokerSidebar}
                rightComponent={ModelSettingsPanel}
                onLeftCollapsedChange={setIsLeftCollapsed}
                onRightCollapsedChange={setIsRightCollapsed}
                initialPanelCount={2}
            />
        </div>
    );
}

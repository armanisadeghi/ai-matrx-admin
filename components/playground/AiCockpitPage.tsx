'use client';

import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { Maximize2, Minimize2 } from 'lucide-react';
import PlaygroundHeader from '@/components/playground/header/PlaygroundHeader';
import ModelSettingsPanel from '@/components/playground/settings/ModelSettingsPanel';
import CockpitPanels from '@/components/playground/CockpitPanels';
import { Button } from '@/components/ui/button';
import BrokerSidebar from '@/components/playground/brokers/BrokersSidebar';
import AICockpitIntro from '@/components/playground/components/AICockpitIntro';
import EntityCreateRecordSheet from '@/app/entities/layout/EntityCreateRecordSheet';
import AddTemplateMessages from '@/components/playground/messages/AddTemplateMessages';
import { useDispatch } from 'react-redux';
import { useEntityTools } from '@/lib/redux';
import { getLayoutOptions } from './recipes/constants';
import { useAiCockpit } from '@/components/playground/hooks/useAiCockpit';
import { CockpitControls } from './types';


interface PanelRefs {
    leftPanel: ImperativePanelHandle | null;
    messagesPanel: ImperativePanelHandle | null;
    resultsPanel: ImperativePanelHandle | null;
    rightPanel: ImperativePanelHandle | null;
}


export default function AiCockpitPage() {
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [currentMode, setCurrentMode] = useState('recipe');
    const [recipeVersion, setRecipeVersion] = useState(1);
    const [showPlayground, setShowPlayground] = useState(false);

    const aiCockpitHook = useAiCockpit();

    const { activeRecipeId, messages, onPlay } = aiCockpitHook;

    const dispatch = useDispatch();
    const { actions, selectors, store } = useEntityTools('recipe');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (activeRecipeId && messages.length > 1) {
            setShowPlayground(true);
        }
    }, [activeRecipeId]);

    const panelsRef = useRef<PanelRefs>({
        leftPanel: null,
        messagesPanel: null,
        resultsPanel: null,
        rightPanel: null
    });

    useLayoutEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const onOpenLeftPanel = () => {
        if (isFullscreen) {
            panelsRef.current?.leftPanel?.resize(11);
        } else {
            panelsRef.current?.leftPanel?.resize(15);
        }
    };

    const onOpenRightPanel = () => {
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

    const handleClose = () => {
        setOpen(false);
    };

    const handleNewRecipe = useCallback(
        (count: number = 1) => {
            dispatch(actions.clearActiveRecord());
            dispatch(actions.startRecordCreation({ count }));
            setOpen(true);
        },
        [dispatch, actions]
    );

    const handleShowCode = () => {
        console.log('Show code clicked');
    };

    const handleToggleBrokers = () => {
        const newSize = isLeftCollapsed ? (isFullscreen ? 15 : 18) : 0;
        panelsRef.current?.leftPanel?.resize(newSize);
    };

    const handleToggleSettings = () => {
        const newSize = isRightCollapsed ? (isFullscreen ? 15 : 18) : 0;
        panelsRef.current?.rightPanel?.resize(newSize);
    };

    const handleModeChange = (mode: string) => {
        console.log(`Mode changed to: ${mode}`);
        setCurrentMode(mode);
    }
    const handleVersionChange = (version: number) => {
        console.log(`Version changed to: ${version}`);
        setRecipeVersion(version);
    };

    const handlePlay = useCallback(() => {
        Promise.resolve().then(() => {
            onPlay();
        }).then(() => {
            if (panelsRef.current.leftPanel) {
                panelsRef.current.leftPanel.resize(0);
            }
            if (panelsRef.current.messagesPanel) {
                panelsRef.current.messagesPanel.resize(20);
            }
            if (panelsRef.current.rightPanel) {
                panelsRef.current.rightPanel.resize(0);
            }
        });
    }, [onPlay]);


    const playgroundControls: CockpitControls = {
        onToggleBrokers: handleToggleBrokers,
        onToggleSettings: handleToggleSettings,
        onShowCode: handleShowCode,
        onNewRecipe: handleNewRecipe,
        onModeChange: handleModeChange,
        version: recipeVersion,
        onVersionChange: handleVersionChange,
        onPlay: handlePlay,
        isLeftCollapsed,
        isRightCollapsed,
        onOpenLeftPanel,
        onOpenRightPanel,
        currentMode,
        fullScreenToggleButton,
        aiCockpitHook,
    };

    return (
        <div
            ref={containerRef}
            className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'}`}
        >
            <PlaygroundHeader {...playgroundControls} />
            {activeRecipeId ? (
                <CockpitPanels
                    ref={panelsRef}
                    leftComponent={BrokerSidebar}
                    rightComponent={ModelSettingsPanel}
                    onLeftCollapsedChange={setIsLeftCollapsed}
                    onRightCollapsedChange={setIsRightCollapsed}
                    cockpitControls={playgroundControls}
                />
            ) : (
                <AICockpitIntro {...playgroundControls} />
            )}
            <EntityCreateRecordSheet
                selectedEntity='recipe'
                unifiedLayoutProps={getLayoutOptions()}
                title='Create A New Recipe'
                open={open}
                onOpenChange={setOpen}
                postCreationOptions={true}
            >
                <AddTemplateMessages
                    onClose={handleClose}
                    onError={(error) => {
                        console.error('Error adding messages:', error);
                    }}
                />
            </EntityCreateRecordSheet>
        </div>
    );
}

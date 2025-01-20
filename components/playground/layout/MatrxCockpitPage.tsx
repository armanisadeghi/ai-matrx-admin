'use client';

import React, { useRef, useState, useLayoutEffect, use, useEffect, useCallback } from 'react';
import { ImperativePanelHandle } from 'react-resizable-panels';
import { Maximize2, Minimize2 } from 'lucide-react';
import PlaygroundHeader from '@/components/playground/header/PlaygroundHeader';
import ModelSettingsPanel from '@/components/playground/right-sidebar/ModelSettingsPanel';
import DynamicPlaygroundPanels from '@/components/playground/layout/DynamicPlaygroundPanels';
import { Button } from '@/components/ui/button';
import BrokerSidebar from '@/components/playground/left-sidebar/BrokersSidebar';
import AICockpitIntro from '@/components/playground/panel-manager/AICockpitIntro';
import EntityCreateRecordSheet from '@/app/entities/layout/EntityCreateRecordSheet';
import AddTemplateMessages from '@/components/playground/header/AddTemplateMessages';
import { useDispatch } from 'react-redux';
import { useEntityTools } from '@/lib/redux';
import { getLayoutOptions } from './constants';
import { useJoinedActiveParent } from '@/app/entities/hooks/relationships/useRelationships';
import { createRelationshipDefinition } from '@/app/entities/hooks/relationships/definitionConversionUtil';

export const recipeMessageDef = createRelationshipDefinition('recipeMessage', 'recipe', 'messageTemplate', 'order');

export default function MatrxCockpitPage() {
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { activeParentMatrxId: activeRecipeId, activeParentId, relationshipHook } = useJoinedActiveParent(recipeMessageDef);
    const { childRecords: messages } = relationshipHook;

    const [showPlayground, setShowPlayground] = useState(false);
    const dispatch = useDispatch();
    const { actions, selectors, store } = useEntityTools('recipe');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (activeRecipeId && messages.length > 1) {
            setShowPlayground(true);
        }
    }, [activeRecipeId]);

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
        onNewRecipe: handleNewRecipe,
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
            {activeRecipeId ? (
                <DynamicPlaygroundPanels
                    ref={panelsRef}
                    leftComponent={BrokerSidebar}
                    rightComponent={ModelSettingsPanel}
                    onLeftCollapsedChange={setIsLeftCollapsed}
                    onRightCollapsedChange={setIsRightCollapsed}
                    initialPanelCount={2}
                    activeRecipeId={activeRecipeId}
                    relationshipHook={relationshipHook}
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

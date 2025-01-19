"use client"

import React, {useCallback, useState} from 'react';
import {IconMenu2} from '@tabler/icons-react';
import {LayoutState, PanelGroupId, WorkspaceLayoutProps} from '../types';
import {DEFAULT_LAYOUT_STATE} from '../config';
import {PanelGroup} from '../PanelGroup';
import {ActivityBar} from '../ActivityBar';
import {LayoutTogglers} from '../LayoutTogglers';

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
                                                                    panels,
                                                                    initialState,
                                                                    children,
                                                                    onLayoutChange
                                                                }) => {
    // Initialize layout state with defaults and any provided initial state
    const [layoutState, setLayoutState] = useState<LayoutState>({
        ...DEFAULT_LAYOUT_STATE,
        ...initialState
    });

    const [isActivityBarCollapsed, setIsActivityBarCollapsed] = useState(false);

    // Group panels by their position
    const groupedPanels = panels.reduce((acc, panel) => {
        if (!acc[panel.group]) {
            acc[panel.group] = [];
        }
        acc[panel.group].push(panel);
        return acc;
    }, {} as Record<PanelGroupId, typeof panels>);

    const handlePanelResize = useCallback((panelId: string, size: number) => {
        setLayoutState(prev => {
            const newState = {
                ...prev,
                panels: {
                    ...prev.panels,
                    [panelId]: {
                        ...prev.panels[panelId],
                        size
                    }
                }
            };
            onLayoutChange?.(newState);
            return newState;
        });
    }, [onLayoutChange]);

    const handlePanelVisibilityChange = useCallback((panelId: string, isVisible: boolean) => {
        setLayoutState(prev => {
            const newState = {
                ...prev,
                panels: {
                    ...prev.panels,
                    [panelId]: {
                        ...prev.panels[panelId],
                        isVisible
                    }
                }
            };
            onLayoutChange?.(newState);
            return newState;
        });
    }, [onLayoutChange]);

    const handlePanelFocus = useCallback((panelId: string) => {
        setLayoutState(prev => {
            const panel = panels.find(p => p.id === panelId);
            if (!panel) return prev;

            const newState = {
                ...prev,
                activePanel: {
                    ...prev.activePanel,
                    [panel.group]: panelId
                }
            };
            onLayoutChange?.(newState);
            return newState;
        });
    }, [panels, onLayoutChange]);

    return (
        <div className="h-full flex flex-col">
            {/* Header Bar */}
            <div className="h-10 bg-neutral-900 border-b border-neutral-700 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    {/* Menu Toggle */}
                    <button
                        className="p-2 hover:bg-neutral-800 rounded-md transition-colors"
                        onClick={() => setIsActivityBarCollapsed(!isActivityBarCollapsed)}
                        title={isActivityBarCollapsed ? "Show Activity Bar" : "Hide Activity Bar"}
                    >
                        <IconMenu2 size={18}/>
                    </button>

                    {/* Layout Togglers */}
                    <div className="h-6 border-l border-neutral-700"/>
                    <LayoutTogglers
                        layoutState={layoutState}
                        groupedPanels={groupedPanels}
                        onPanelVisibilityChange={handlePanelVisibilityChange}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Activity Bar */}
                <ActivityBar
                    panels={panels}
                    layoutState={layoutState}
                    onPanelVisibilityChange={handlePanelVisibilityChange}
                    isCollapsed={isActivityBarCollapsed}
                />

                {/* Left Panel Group */}
                {groupedPanels.left && (
                    <PanelGroup
                        groupId="left"
                        panels={groupedPanels.left}
                        state={layoutState}
                        onPanelResize={handlePanelResize}
                        onPanelVisibilityChange={handlePanelVisibilityChange}
                        onPanelFocus={handlePanelFocus}
                    />
                )}

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-hidden">
                        {children}
                    </div>

                    {/* Bottom Panel Group */}
                    <div className="relative">
                        {groupedPanels.bottom && (
                            <PanelGroup
                                groupId="bottom"
                                panels={groupedPanels.bottom}
                                state={layoutState}
                                onPanelResize={handlePanelResize}
                                onPanelVisibilityChange={handlePanelVisibilityChange}
                                onPanelFocus={handlePanelFocus}
                            />
                        )}
                    </div>
                </div>

                {/* Right Panel Group */}
                {groupedPanels.right && (
                    <PanelGroup
                        groupId="right"
                        panels={groupedPanels.right}
                        state={layoutState}
                        onPanelResize={handlePanelResize}
                        onPanelVisibilityChange={handlePanelVisibilityChange}
                        onPanelFocus={handlePanelFocus}
                    />
                )}
            </div>
        </div>
    );
};
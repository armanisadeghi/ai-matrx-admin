import React from 'react';
import {
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarRightCollapse,
    IconLayoutBottombarCollapse
} from '@tabler/icons-react';
import {LayoutState, PanelGroupId} from '../types';

interface LayoutTogglersProps {
    layoutState: LayoutState;
    groupedPanels: Record<PanelGroupId, any[]>;
    onPanelVisibilityChange: (panelId: string, isVisible: boolean) => void;
}

export const LayoutTogglers: React.FC<LayoutTogglersProps> = ({
                                                                  layoutState,
                                                                  groupedPanels,
                                                                  onPanelVisibilityChange
                                                              }) => {
    const toggleGroup = (group: PanelGroupId) => {
        // Get all panels in the group
        const panels = groupedPanels[group] || [];

        // Check if any panel in the group is visible
        const hasVisiblePanel = panels.some(panel => layoutState.panels[panel.id]?.isVisible);

        // Toggle all panels in the group
        panels.forEach(panel => {
            onPanelVisibilityChange(panel.id, !hasVisiblePanel);
        });
    };

    const isGroupVisible = (group: PanelGroupId) => {
        const panels = groupedPanels[group] || [];
        return panels.some(panel => layoutState.panels[panel.id]?.isVisible);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Left Panel Toggle */}
            {groupedPanels.left?.length > 0 && (
                <button
                    className={`p-2 rounded-md transition-colors ${
                        isGroupVisible('left')
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                    onClick={() => toggleGroup('left')}
                    title="Toggle Left Panel"
                >
                    <IconLayoutSidebarLeftCollapse size={18}/>
                </button>
            )}

            {/* Bottom Panel Toggle */}
            {groupedPanels.bottom?.length > 0 && (
                <button
                    className={`p-2 rounded-md transition-colors ${
                        isGroupVisible('bottom')
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                    onClick={() => toggleGroup('bottom')}
                    title="Toggle Bottom Panel"
                >
                    <IconLayoutBottombarCollapse size={18}/>
                </button>
            )}

            {/* Right Panel Toggle */}
            {groupedPanels.right?.length > 0 && (
                <button
                    className={`p-2 rounded-md transition-colors ${
                        isGroupVisible('right')
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                    onClick={() => toggleGroup('right')}
                    title="Toggle Right Panel"
                >
                    <IconLayoutSidebarRightCollapse size={18}/>
                </button>
            )}
        </div>
    );
};
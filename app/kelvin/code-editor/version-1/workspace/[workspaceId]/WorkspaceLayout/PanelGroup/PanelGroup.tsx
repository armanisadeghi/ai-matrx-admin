import { PanelGroupProps } from '../types';
import { Panel } from '../Panel';
import { FC } from "react";

export const PanelGroup: FC<PanelGroupProps> = ({
                                                    groupId,
                                                    panels,
                                                    state,
                                                    onPanelResize,
                                                    onPanelVisibilityChange,
                                                    onPanelFocus
                                                }) => {
    const sortedPanels = [...panels].sort(
        (a, b) => (state.panels[a.id]?.position ?? a.order) - (state.panels[b.id]?.position ?? b.order)
    );

    const visiblePanels = sortedPanels.filter(
        panel => state.panels[panel.id]?.isVisible
    );

    if (visiblePanels.length === 0) {
        return null;
    }

    if (groupId === 'bottom') {
        const activePanel = visiblePanels.find(
            panel => panel.id === state.activePanel?.bottom
        ) || visiblePanels[0];

        return (
            <Panel
                key={activePanel.id}
                id={activePanel.id}
                config={activePanel}
                state={state.panels[activePanel.id]}
                onResize={(size) => onPanelResize?.(activePanel.id, size)}
                onVisibilityChange={(isVisible) => onPanelVisibilityChange?.(activePanel.id, isVisible)}
                onFocus={() => onPanelFocus?.(activePanel.id)}
            >
                <div className="flex flex-col h-full bg-neutral-900">
                    {/* Tabs Header */}
                    <div className="flex h-9 border-b border-neutral-700">
                        {visiblePanels.map((panel) => {
                            const isActive = panel.id === (state.activePanel?.bottom || activePanel.id);
                            const Icon = panel.icon;

                            return (
                                <button
                                    key={panel.id}
                                    className={`flex items-center gap-2 px-3 min-w-[120px] h-full
                                        border-r border-neutral-700 transition-colors
                                        ${isActive
                                        ? 'bg-neutral-800 text-white'
                                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                                    }`}
                                    onClick={() => onPanelFocus?.(panel.id)}
                                >
                                    <Icon size={16}/>
                                    <span className="text-sm">{panel.title}</span>
                                    {isActive && (
                                        <button
                                            className="ml-2 p-1 hover:bg-neutral-700 rounded"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPanelVisibilityChange?.(panel.id, false);
                                            }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {/* Active Panel Content */}
                    <div className="flex-1">
                        <activePanel.component/>
                    </div>
                </div>
            </Panel>
        );
    }

    // For left/right panels, keep the existing stacking behavior
    return (
        <div className="flex flex-col">
            {visiblePanels.map((panel) => (
                <Panel
                    key={panel.id}
                    id={panel.id}
                    config={panel}
                    state={state.panels[panel.id]}
                    onResize={(size) => onPanelResize?.(panel.id, size)}
                    onVisibilityChange={(isVisible) => onPanelVisibilityChange?.(panel.id, isVisible)}
                    onFocus={() => onPanelFocus?.(panel.id)}
                >
                    <panel.component/>
                </Panel>
            ))}
        </div>
    );
};
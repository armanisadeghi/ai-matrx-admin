import {LayoutState, PanelConfig} from '../types';
import {FC} from "react";

interface ActivityBarProps {
    panels: PanelConfig[];
    layoutState: LayoutState;
    onPanelVisibilityChange: (panelId: string, isVisible: boolean) => void;
    isCollapsed?: boolean;
}

export const ActivityBar: FC<ActivityBarProps> = ({
                                                            panels,
                                                            layoutState,
                                                            onPanelVisibilityChange,
                                                            isCollapsed = false
                                                        }) => {
    if (isCollapsed) return null;

    return (
        <div className="w-12 bg-neutral-900 border-r border-neutral-700 flex flex-col items-center py-2">
            {panels.map((panel) => {
                const isActive = layoutState.panels[panel.id]?.isVisible;
                const Icon = panel.icon;

                return (
                    <button
                        key={panel.id}
                        className={`p-3 mb-1 rounded-md transition-colors relative group
              ${isActive
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                        }`}
                        onClick={() => onPanelVisibilityChange(panel.id, !isActive)}
                        title={panel.title}
                    >
                        <Icon size={24}/>

                        {/* Active Indicator */}
                        {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"/>
                        )}

                        {/* Tooltip */}
                        <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-neutral-800
                          rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100
                          pointer-events-none transition-opacity">
                            {panel.title}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
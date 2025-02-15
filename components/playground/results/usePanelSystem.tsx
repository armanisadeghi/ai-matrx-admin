// usePanelSystem.ts
import { useState, useMemo } from 'react';
import { PANEL_REGISTRY } from './panelRegistry';
import { BasePanelProps, PanelConfig } from './types';

interface PanelSystemOptions {
    defaultView?: string;
    onViewChange?: (view: string) => void;
}

type PanelProps = BasePanelProps & { key?: string | number };

export const usePanelSystem = (options: PanelSystemOptions = {}) => {
    const [currentView, setCurrentView] = useState(options.defaultView || 'text');

    const handleViewChange = (view: string) => {
        setCurrentView(view);
        options.onViewChange?.(view);
    };

    const getCurrentPanel = () => PANEL_REGISTRY[currentView];

    const renderPanel = (props: PanelProps) => {
        const config = getCurrentPanel();
        if (!config) return null;

        const PanelComponent = config.component;
        const { key, ...restProps } = props;
        
        return (
            <PanelComponent
                key={key}
                {...config.defaultProps}
                {...restProps}
            />
        );
    };

    const responseFormats = useMemo(() => 
        Object.values(PANEL_REGISTRY).map(({ icon: Icon, label, value }) => ({
            icon: <Icon size={14} />,
            label,
            value
        })), 
    []);

    return {
        currentView,
        setCurrentView: handleViewChange,
        renderPanel,
        responseFormats,
        getCurrentPanel
    };
};

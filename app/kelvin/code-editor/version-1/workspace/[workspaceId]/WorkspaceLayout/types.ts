import { ReactNode } from 'react';
import { Icon } from '@tabler/icons-react';

export type PanelGroupId = 'left' | 'right' | 'bottom';

export interface PanelConfig {
    id: string;
    title: string;
    icon: Icon;
    group: PanelGroupId;
    defaultSize: number;
    minSize: number;
    maxSize?: number;
    order: number;
    component: React.ComponentType<any>;
}

export interface PanelState {
    isVisible: boolean;
    size: number;
    position: number;  // order within group
}

export interface LayoutState {
    panels: Record<string, PanelState>;
    activePanel: Partial<Record<PanelGroupId, string>>;
}

export interface PanelProps {
    id: string;
    config: PanelConfig;
    state: PanelState;
    children?: ReactNode;
    onResize?: (size: number) => void;
    onVisibilityChange?: (isVisible: boolean) => void;
    onFocus?: () => void;
}

export interface PanelGroupProps {
    groupId: PanelGroupId;
    panels: PanelConfig[];
    state: LayoutState;
    onPanelResize?: (panelId: string, size: number) => void;
    onPanelVisibilityChange?: (panelId: string, isVisible: boolean) => void;
    onPanelFocus?: (panelId: string) => void;
}

export interface WorkspaceLayoutProps {
    panels: PanelConfig[];
    initialState?: Partial<LayoutState>;
    children?: ReactNode;
    onLayoutChange?: (state: LayoutState) => void;
}
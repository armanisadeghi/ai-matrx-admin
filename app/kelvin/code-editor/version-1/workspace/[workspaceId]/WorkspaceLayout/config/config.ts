import {
    IconFiles,
    IconSearch,
    IconSourceCode,
    IconTerminal,
    IconBug,
    IconMessages,
    IconAlertCircle,
    IconSettings
} from '@tabler/icons-react';
import { PanelConfig, LayoutState } from './types';

export const DEFAULT_PANELS: PanelConfig[] = [
    {
        id: 'explorer',
        title: 'Explorer',
        icon: IconFiles,
        group: 'left',
        defaultSize: 250,
        minSize: 200,
        order: 1,
        component: () => null // Will be implemented later
    },
    {
        id: 'search',
        title: 'Search',
        icon: IconSearch,
        group: 'left',
        defaultSize: 250,
        minSize: 200,
        order: 2,
        component: () => null
    },
    {
        id: 'source-control',
        title: 'Source Control',
        icon: IconSourceCode,
        group: 'left',
        defaultSize: 250,
        minSize: 200,
        order: 3,
        component: () => null
    },
    {
        id: 'terminal',
        title: 'Terminal',
        icon: IconTerminal,
        group: 'bottom',
        defaultSize: 300,
        minSize: 100,
        order: 1,
        component: () => null
    },
    {
        id: 'problems',
        title: 'Problems',
        icon: IconAlertCircle,
        group: 'bottom',
        defaultSize: 300,
        minSize: 100,
        order: 2,
        component: () => null
    },
    {
        id: 'output',
        title: 'Output',
        icon: IconMessages,
        group: 'bottom',
        defaultSize: 300,
        minSize: 100,
        order: 3,
        component: () => null
    },
    {
        id: 'debug',
        title: 'Debug Console',
        icon: IconBug,
        group: 'bottom',
        defaultSize: 300,
        minSize: 100,
        order: 4,
        component: () => null
    }
];

export const DEFAULT_LAYOUT_STATE: LayoutState = {
    panels: DEFAULT_PANELS.reduce((acc, panel) => ({
        ...acc,
        [panel.id]: {
            isVisible: false,
            size: panel.defaultSize,
            position: panel.order
        }
    }), {}),
    activePanel: {}
};
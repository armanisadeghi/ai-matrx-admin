import { UseAiCockpitHook } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { type FC } from 'react';

export interface CockpitControls {
    onToggleBrokers: () => void;
    onToggleSettings: () => void;
    onShowCode: () => void;
    onNewRecipe: () => void;
    currentMode: string;
    onModeChange: (mode: string) => void;
    version: number;
    onVersionChange: (version: number) => void;
    onPlay: () => void;

    isLeftCollapsed: boolean;
    isRightCollapsed: boolean;
    onOpenLeftPanel: () => void;
    onOpenRightPanel: () => void;
    fullScreenToggleButton: React.ReactNode;
    aiCockpitHook: UseAiCockpitHook;
}

export interface CockpitPanelProps {
    playgroundControls: CockpitControls;
}

export type CockpitPanelComponent = FC<CockpitPanelProps>;
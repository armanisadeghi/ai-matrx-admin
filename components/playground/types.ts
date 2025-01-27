import { DoubleJoinedActiveParentProcessingHook } from '@/app/entities/hooks/relationships/useRelationshipsWithProcessing';
import { type FC } from 'react';

export interface PlaygroundControls {
    onToggleBrokers: () => void;
    onToggleSettings: () => void;
    onShowCode: () => void;
    onNewRecipe: () => void;
    currentMode: string;
    onModeChange: (mode: string) => void;
    version: number;
    onVersionChange: (version: number) => void;
    onPlay: () => void;
    // Panel states
    isLeftCollapsed: boolean;
    isRightCollapsed: boolean;
    onOpenLeftPanel: () => void;
    onOpenRightPanel: () => void;
    fullScreenToggleButton: React.ReactNode;
    doubleParentActiveRecipeHook: DoubleJoinedActiveParentProcessingHook;
}

export interface PlaygroundPanelProps {
    playgroundControls: PlaygroundControls;
}

export type PlaygroundPanelComponent = FC<PlaygroundPanelProps>;

export interface DynamicPromptSettingsProps {
    playgroundControls: PlaygroundControls;
    settingsSetNumber: number;
}
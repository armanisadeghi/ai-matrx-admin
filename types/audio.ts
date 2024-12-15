// types/audio.ts
import { ReactNode } from 'react';

export interface AudioModalOptions {
    text: string;
    icon?: ReactNode;
    title?: string;
    description?: string;
    hideText?: boolean;
}

export interface AudioModalContextType {
    showAudioModal: (props: AudioModalOptions) => void;
}

export interface AudioPlaybackState {
    isPlaying: boolean;
    isPaused: boolean;
    isComplete: boolean;
    status: string;
}

export interface AudioTextSyncState {
    displayedText: string;
    playbackState: AudioPlaybackState;
    controls: {
        start: () => void;
        pause: () => void;
        resume: () => void;
        reset: () => void;
        updatePlaybackState: (state: Partial<AudioPlaybackState>) => void;
    };
}

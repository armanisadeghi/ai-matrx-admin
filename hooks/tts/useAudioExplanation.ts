// hooks/tts/useAudioExplanation.ts
'use client';

import { useCallback } from 'react';
import { useAudioModal } from '@/providers/AudioModalProvider';
import type { AudioModalOptions } from '@/types/audio';

export function useAudioExplanation() {
    const showAudioModal = useAudioModal();

    const playExplanation = useCallback((options: AudioModalOptions) => {
        showAudioModal({
            text: options.text,
            title: options.title || 'Audio',
            description: options.description || 'Listen to the audio and see the text.',
            icon: options.icon,
            hideText: options.hideText
        });
    }, [showAudioModal]);

    return { playExplanation };
}

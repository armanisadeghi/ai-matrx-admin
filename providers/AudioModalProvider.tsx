// providers/AudioModalProvider.tsx
'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AudioModal from '@/components/audio/AudioModal';
import type { AudioModalOptions, AudioModalContextType } from '@/types/audio';
import { registerAudioModal } from '@/utils/audioModal';

const AudioModalContext = createContext<AudioModalContextType | null>(null);

export function useAudioModal() {
    const context = useContext(AudioModalContext);
    if (!context) {
        throw new Error('useAudioModal must be used within an AudioModalProvider');
    }
    return context.showAudioModal;
}

export function AudioModalProvider({ children }: { children: React.ReactNode }) {
    const [modalProps, setModalProps] = useState<AudioModalOptions | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const showAudioModal = useCallback((props: AudioModalOptions) => {
        setModalProps(props);
        setIsOpen(true);
    }, []);

    useEffect(() => {
        setMounted(true);
        registerAudioModal(showAudioModal);
        return () => {
            setMounted(false);
        };
    }, [showAudioModal]);

    return (
        <AudioModalContext.Provider value={{ showAudioModal }}>
            {children}
            {mounted && modalProps && createPortal(
                <AudioModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    text={modalProps.text}
                    icon={modalProps.icon}
                    title={modalProps.title}
                    description={modalProps.description}
                    hideText={modalProps.hideText}
                />,
                document.body
            )}
        </AudioModalContext.Provider>
    );
}

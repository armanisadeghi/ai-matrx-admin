'use client';
import React from 'react';
import { useVoiceChat } from "@/hooks/tts/useVoiceChat";
import AssistantSelect from './extras/AssistantSelect';
import VoiceSelect from './extras/VoiceSelect';
import { VoiceAssistantStatus } from './extras/VoiceAssistantStatus';

interface HeaderProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
}

export const Header: React.FC<HeaderProps> = ({ voiceChatHook }) => {
    return (
        <div className="h-14 bg-background border-b flex items-center">
            <div className="flex-1 grid grid-cols-12 items-center h-full">
                {/* Assistant Selection */}
                <div className="col-span-4 flex items-center gap-3 pl-4">
                    <AssistantSelect voiceChatHook={voiceChatHook} />
                </div>

                {/* Status Display */}
                <div className="col-span-4 flex items-center justify-center">
                    <VoiceAssistantStatus voiceChatHook={voiceChatHook} />
                </div>

                {/* Voice Selection */}
                <div className="col-span-4 flex items-center justify-end pr-4">
                    <VoiceSelect voiceChatHook={voiceChatHook} />
                </div>
            </div>
        </div>
    );
};

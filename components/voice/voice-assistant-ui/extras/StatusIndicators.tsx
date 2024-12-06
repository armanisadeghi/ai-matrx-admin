import React from 'react';
import { Brain, Mic, Power, Volume2 } from "lucide-react";
import { ProcessState } from "@/types/voice/voiceAssistantTypes";

interface StatusIndicatorsProps {
    processState: ProcessState;
    vad: {
        listening: boolean;
        errored: string | false;
        loading: boolean;
        userSpeaking: boolean;
    };
    isReady: boolean;
}

const StatusIndicators = ({ processState, vad, isReady }: StatusIndicatorsProps) => {
    return (
        <div className="flex items-center gap-4">
            <div className={`transition-colors ${isReady ? 'text-primary' : 'text-muted'}`}>
                <Power className="w-4 h-4" />
            </div>

            <div className={`transition-colors ${
                (vad.listening || processState.recording) ? 'text-destructive animate-pulse' : 'text-muted'
            }`}>
                <Mic className="w-4 h-4" />
            </div>

            <div className={`transition-colors ${
                (processState.processing || processState.transcribing || processState.generating)
                ? 'text-amber-500 animate-pulse'
                : 'text-muted'
            }`}>
                <Brain className="w-4 h-4" />
            </div>

            <div className={`transition-colors ${
                processState.speaking ? 'text-primary animate-pulse' : 'text-muted'
            }`}>
                <Volume2 className="w-4 h-4" />
            </div>
        </div>
    );
};

export default StatusIndicators;

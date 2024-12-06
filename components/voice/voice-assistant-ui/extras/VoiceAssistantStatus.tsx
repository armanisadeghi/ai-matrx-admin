'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button, Progress } from '@/components/ui';
import { AlertCircle, Loader2, Mic, Settings, Volume2 } from 'lucide-react';
import { useVoiceChat } from "@/hooks/tts/useVoiceChat";

interface StatusProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
}

export const VoiceAssistantStatus = ({ voiceChatHook }: StatusProps) => {
    const { processState, vad } = voiceChatHook;

    const getStatusConfig = () => {
        if (vad.loading) {
            return {
                icon: Loader2,
                text: 'Initializing',
                className: 'text-muted-foreground',
                animate: 'animate-spin'
            };
        }
        if (vad.errored) {
            return {
                icon: AlertCircle,
                text: 'Error',
                className: 'text-destructive'
            };
        }
        if (processState.speaking) {
            return {
                icon: Volume2,
                text: 'Speaking',
                className: 'text-primary',
                animate: 'animate-pulse'
            };
        }
        if (vad.listening || processState.recording) {
            return {
                icon: Mic,
                text: 'Listening',
                className: 'text-destructive',
                animate: 'animate-pulse'
            };
        }
        return {
            icon: Mic,
            text: 'Ready',
            className: 'text-primary'
        };
    };

    const status = getStatusConfig();
    const StatusIcon = status.icon;

    const steps = [
        { key: 'recording', label: 'Listening' },
        { key: 'processing', label: 'Processing' },
        { key: 'transcribing', label: 'Thinking' },
        { key: 'generating', label: 'Generating' },
        { key: 'speaking', label: 'Speaking' }
    ];

    const activeStep = steps.findIndex(
        (step) => processState[step.key as keyof typeof processState]
    );

    return (
        <Card className="w-full max-w-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full bg-background shadow-sm ${status.className}`}>
                            <StatusIcon className={`h-3.5 w-3.5 ${status.animate || ''}`} />
                        </div>
                        <span className={`text-sm font-medium ${status.className}`}>{status.text}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Matrix AI</span>
                </div>

                <div className="space-y-2">
                    <Progress
                        value={((activeStep + 1) / steps.length) * 100}
                        className="h-1 bg-muted/50"
                    />
                    <div className="flex justify-between">
                        {steps.map((step, index) => (
                            <div
                                key={step.key}
                                className={`flex flex-col items-center transition-colors duration-200 ${
                                    index <= activeStep ? 'text-primary' : 'text-muted-foreground'
                                }`}
                            >
                                <div
                                    className={`h-1 w-1 rounded-full mb-1 transition-colors duration-200 ${
                                        index <= activeStep ? 'bg-primary' : 'bg-muted'
                                    }`}
                                />
                                <span className="text-[9px] font-medium uppercase tracking-wider">
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export const CollapsibleStatus = ({ voiceChatHook }: StatusProps) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="fixed top-4 right-4 z-50">
            {isOpen ? (
                <div className="relative flex items-start gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="mt-1"
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                    <div className="w-[300px]">
                        <VoiceAssistantStatus voiceChatHook={voiceChatHook} />
                    </div>
                </div>
            ) : (
                 <Button
                     variant="outline"
                     size="icon"
                     onClick={() => setIsOpen(true)}
                 >
                     <Settings className="w-4 h-4" />
                 </Button>
             )}
        </div>
    );
};

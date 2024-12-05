import React from 'react';
import {motion} from "framer-motion";
import {AlertCircle, Bot, Mic, Volume2, ChevronDown} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {AssistantType, ProcessState} from '@/types/voice/voiceAssistantTypes';
import {assistantOptions} from '@/constants/voice-assistants';
import {availableVoices} from '@/lib/cartesia/voices';
import {cn} from "@/lib/utils";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

interface HeaderProps {
    selectedAssistant: { value: AssistantType; label: string };
    onAssistantChange: (value: AssistantType) => void;
    selectedVoice?: string;
    onVoiceChange?: (value: string) => void;
    vad: any;
    processState: ProcessState;
}

export const Header: React.FC<HeaderProps> = (
    {
        selectedAssistant,
        onAssistantChange,
        selectedVoice,
        onVoiceChange,
        vad,
        processState
    }) => {
    const getActiveStep = () => {
        if (processState.transcribing) return 0;
        if (processState.processing) return 1;
        if (processState.generating) return 2;
        if (processState.speaking) return 3;
        return -1;
    };

    const steps = [
        {key: 'transcribing', label: 'Transcribing', color: 'bg-blue-400'},
        {key: 'processing', label: 'Processing', color: 'bg-purple-400'},
        {key: 'generating', label: 'Generating', color: 'bg-indigo-400'},
        {key: 'speaking', label: 'Speaking', color: 'bg-green-400'}
    ];

    const StatusIndicator = () => {
        if (vad.loading) {
            return (
                <motion.div
                    className="flex items-center gap-1.5 text-muted-foreground text-sm"
                    animate={{opacity: [1, 0.5, 1]}}
                    transition={{duration: 1.5, repeat: Infinity}}
                >
                    <span className="relative flex h-2 w-2">
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                    </span>
                    Initializing
                </motion.div>
            );
        }

        if (vad.errored) {
            return (
                <div className="flex items-center gap-1.5 text-destructive text-sm">
                    <AlertCircle className="w-3.5 h-3.5"/>
                    Error
                </div>
            );
        }

        if (processState.speaking) {
            return (
                <motion.div
                    className="flex items-center gap-1.5 text-green-500 text-sm"
                    animate={{opacity: [1, 0.5, 1]}}
                    transition={{duration: 1, repeat: Infinity}}
                >
                    <Volume2 className="w-3.5 h-3.5"/>
                    Speaking
                </motion.div>
            );
        }

        if (processState.recording) {
            return (
                <motion.div
                    className="flex items-center gap-1.5 text-red-500 text-sm"
                    animate={{opacity: [1, 0.5, 1]}}
                    transition={{duration: 0.8, repeat: Infinity}}
                >
                    <span className="relative flex h-2 w-2">
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Recording
                </motion.div>
            );
        }

        return (
            <motion.div
                className="flex items-center gap-1.5 text-primary text-sm"
                animate={{opacity: [0.5, 1, 0.5]}}
                transition={{duration: 2, repeat: Infinity}}
            >
                <Mic className="w-3.5 h-3.5"/>
                Listening
            </motion.div>
        );
    };

    return (
        <div className="h-14 bg-background border-b flex items-center">
            <div className="flex-1 grid grid-cols-12 items-center h-full">
                {/* Left section - Assistant Selection */}
                <div className="col-span-4 flex items-center gap-3 pl-4">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-primary"/>
                        <Select value={selectedAssistant.value} onValueChange={onAssistantChange}>
                            <SelectTrigger className="w-[200px] h-8">
                                <SelectValue placeholder="Select assistant"/>
                            </SelectTrigger>
                            <SelectContent>
                                {assistantOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="flex flex-col items-start py-2 cursor-pointer"
                                    >
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Middle section - Process Steps */}
                <div className="col-span-4 flex items-center justify-center gap-1.5 px-4">
                    {steps.map((step, index) => {
                        const isActive = index === getActiveStep();
                        const isPast = index < getActiveStep();

                        return (
                            <Tooltip key={step.key}>
                                <TooltipTrigger>
                                    <div className="flex flex-col items-center gap-1">
                                        <motion.div
                                            className={cn(
                                                "h-1 w-12 rounded-full",
                                                isPast ? step.color : "bg-gray-200",
                                                isActive && "animate-pulse"
                                            )}
                                            animate={isActive ? {opacity: [0.5, 1, 0.5]} : {}}
                                            transition={{duration: 1.5, repeat: Infinity}}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {step.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Right section - Voice Selection & Status */}
                <div className="col-span-4 flex items-center justify-end gap-4 pr-4">
                    {onVoiceChange && (
                        <Select value={selectedVoice} onValueChange={onVoiceChange}>
                            <SelectTrigger className="w-[180px] h-8">
                                <SelectValue placeholder="Select voice"/>
                            </SelectTrigger>
                            <SelectContent>
                                {availableVoices.map((voice) => (
                                    <SelectItem
                                        key={voice.id}
                                        value={voice.id}
                                        className="flex flex-col items-start py-2"
                                    >
                                        <div className="font-medium">{voice.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{voice.description}</div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <StatusIndicator/>
                </div>
            </div>
        </div>
    );
};

export default Header;

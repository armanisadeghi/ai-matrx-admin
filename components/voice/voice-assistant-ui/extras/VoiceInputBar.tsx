'use client';

import React, { useRef, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Send, Brain, Power, Volume2, Upload, Database, Settings2 } from "lucide-react";
import { useVoiceChat } from "@/hooks/tts/useVoiceChat";
import { cn } from "@/lib/utils";
import TextareaAutosize from 'react-textarea-autosize';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { mockUserData, categories } from '@/constants/mockData';
import { Badge } from "@/components/ui/badge";
import { AI_PROVIDERS } from '@/constants/aiProviders';
import { AiSettingsModal } from './AiSettingsModal';
import { ApiName } from "@/types/voice/voiceAssistantTypes";

interface VoiceInputBarProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
}

const VoiceInputBar = ({ voiceChatHook }: VoiceInputBarProps) => {
    const {
        input,
        setInput,
        processState,
        vad,
        handleSubmit,
        apiName,
        setApiName,
        aiCallParams,
        setAiCallParams
    } = voiceChatHook;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const isReady = !vad.loading && !vad.errored;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setInput(prev => prev + '\n');
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log('File selected:', file);
        }
    };

    const insertData = (content: string) => {
        setInput(prev => {
            const cursorPosition = (document.activeElement as HTMLTextAreaElement)?.selectionStart || prev.length;
            return prev.slice(0, cursorPosition) + content + prev.slice(cursorPosition);
        });
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t">
            <div className="max-w-[95%] w-[1400px] mx-auto px-4 py-3 flex items-start gap-4">
                {/* API Selection Controls */}
                <div className="flex flex-col gap-2">
                    <Select
                        value={apiName}
                        onValueChange={(value: ApiName) => setApiName(value)}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select API" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                                <SelectItem key={key} value={key as ApiName}>
                                    {provider.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={aiCallParams.model}
                        onValueChange={(model) => setAiCallParams({ ...aiCallParams, model })}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent>
                            {AI_PROVIDERS[apiName as keyof typeof AI_PROVIDERS]?.models.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                    {model.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Main Input Area */}
                <div className="flex-1 relative">
                    <TextareaAutosize
                        minRows={3}
                        maxRows={8}
                        className="w-full pr-32 pl-4 py-3 rounded-lg bg-background border focus:ring-2
                                 focus:ring-primary text-sm resize-none"
                        placeholder={vad.listening ? "Listening... or type your message" : "Type your message"}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    {/* Floating Action Buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        <AiSettingsModal
                            params={aiCallParams}
                            onParamsChange={setAiCallParams}
                        />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <motion.button
                                            className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <Database className="w-4 h-4" />
                                        </motion.button>
                                    </DropdownMenuTrigger>
                                    {/* ... existing DropdownMenuContent ... */}
                                </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent>Insert saved data</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.button
                                    type="button"
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}
                                    disabled={!input.trim()}
                                    onClick={handleSubmit}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Send className="w-4 h-4"/>
                                </motion.button>
                            </TooltipTrigger>
                            <TooltipContent>Send message (Enter)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.button
                                    type="button"
                                    className={cn(
                                        "p-1.5 rounded-full",
                                        vad.listening ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                                    )}
                                    onClick={() => vad.listening ? vad.pause() : vad.start()}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {vad.listening ? <Mic className="w-4 h-4"/> : <MicOff className="w-4 h-4"/>}
                                </motion.button>
                            </TooltipTrigger>
                            <TooltipContent>Toggle voice input</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.button
                                    type="button"
                                    className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Upload className="w-4 h-4"/>
                                </motion.button>
                            </TooltipTrigger>
                            <TooltipContent>Upload file</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Status Indicators */}
                <div className="flex flex-col gap-2 pt-2">
                    <div className={`transition-colors ${isReady ? 'text-primary' : 'text-muted'}`}>
                        <Power className="w-3.5 h-3.5"/>
                    </div>
                    <div className={`transition-colors ${
                        (vad.listening || processState.recording) ? 'text-destructive animate-pulse' : 'text-muted'
                    }`}>
                        <Mic className="w-3.5 h-3.5"/>
                    </div>
                    <div className={`transition-colors ${
                        (processState.processing || processState.transcribing || processState.generating)
                        ? 'text-amber-500 animate-pulse'
                        : 'text-muted'
                    }`}>
                        <Brain className="w-3.5 h-3.5"/>
                    </div>
                    <div className={`transition-colors ${
                        processState.speaking ? 'text-primary animate-pulse' : 'text-muted'
                    }`}>
                        <Volume2 className="w-3.5 h-3.5"/>
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </div>
        </div>
    );
};

export default VoiceInputBar;

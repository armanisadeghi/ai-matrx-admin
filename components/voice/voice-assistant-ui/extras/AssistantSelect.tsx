import React from 'react';
import { useVoiceChat } from "@/hooks/tts/useVoiceChat";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { assistantOptions } from '@/constants/voice-assistants';

interface AssistantSelectProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
}

const AssistantSelect = ({ voiceChatHook }: AssistantSelectProps) => {
    const { assistant, setAssistant } = voiceChatHook;

    return (
        <Select
            value={assistant?.id}
            onValueChange={(id) => {
                const selectedAssistant = assistantOptions.find(a => a.id === id);
                if (selectedAssistant) {
                    setAssistant(selectedAssistant);
                }
            }}
        >
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Assistant">
                    {assistant && (
                        <div className="flex items-center gap-2">
                            <img
                                src={assistant.imagePath}
                                alt={assistant.name}
                                className="w-6 h-6 rounded-full object-cover"
                            />
                            <span>{assistant.name}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
                {assistantOptions.map((option) => (
                    <SelectItem
                        key={option.id}
                        value={option.id}
                        className="py-3"
                    >
                        <div className="flex flex-col gap-2">
                            {/* Header with Image and Name */}
                            <div className="flex items-center gap-3">
                                <img
                                    src={option.imagePath}
                                    alt={option.name}
                                    className="w-8 h-8 rounded-full object-cover border border-primary/20"
                                />
                                <span className="font-medium">{option.name}</span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground line-clamp-2 pl-11">
                                {option.description}
                            </p>

                            {/* Capabilities */}
                            <div className="flex flex-wrap gap-1.5 pl-11 mt-1">
                                {option.capabilities.map((capability, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs px-2 py-0 bg-primary/10"
                                    >
                                        {capability}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default AssistantSelect;

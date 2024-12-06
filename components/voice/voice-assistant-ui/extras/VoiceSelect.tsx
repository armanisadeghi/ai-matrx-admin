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
import { voiceOptions } from '@/constants/voice-options';

interface VoiceSelectProps {
    voiceChatHook: ReturnType<typeof useVoiceChat>;
}

const VoiceSelect = ({ voiceChatHook }: VoiceSelectProps) => {
    const { voiceId, setVoiceId } = voiceChatHook;
    const currentVoice = voiceOptions.find(v => v.id === voiceId);

    return (
        <Select
            value={voiceId}
            onValueChange={(id) => {
                setVoiceId(id);
            }}
        >
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Voice">
                    {currentVoice && (
                        <div className="flex items-center gap-2">
                            <img
                                src={currentVoice.imagePath}
                                alt={currentVoice.name}
                                className="w-6 h-6 rounded-full object-cover"
                            />
                            <span>{currentVoice.name}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
                {voiceOptions.map((voice) => (
                    <SelectItem
                        key={voice.id}
                        value={voice.id}
                        className="py-3"
                    >
                        <div className="flex flex-col gap-2">
                            {/* Header with Image and Name */}
                            <div className="flex items-center gap-3">
                                <img
                                    src={voice.imagePath}
                                    alt={voice.name}
                                    className="w-8 h-8 rounded-full object-cover border border-primary/20"
                                />
                                <span className="font-medium">{voice.name}</span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground line-clamp-2 pl-11">
                                {voice.description}
                            </p>

                            {/* Language Badge */}
                            <div className="flex flex-wrap gap-1.5 pl-11 mt-1">
                                <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0 bg-primary/10"
                                >
                                    {voice.name.split(' ')[0]} {/* Extracts language from name */}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0 bg-primary/10"
                                >
                                    {voice.name.includes('Woman') ? 'Female' : 'Male'}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0 bg-primary/10"
                                >
                                    {voice.name.includes('Book') ? 'Narrative' : 'Conversational'}
                                </Badge>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default VoiceSelect;

import { Suspense } from 'react';
import { getFlashcardSet } from '@/app/(authenticated)/flashcard/app-data';
import FastFireContainer, {VoiceConfig} from './FastFireContainer';
import { Loader2 } from "lucide-react";
import {AiCallParams, ApiName, PartialBroker} from "@/types/voice/voiceAssistantTypes";
import {InputType} from "node:zlib";
import {getAssistant} from "@/constants/voice-assistants";

const DEFAULT_AI_REQUEST = {
    apiName: 'openai' as ApiName,
    responseType: 'audio' as InputType,
    voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22',
    assistant: getAssistant("flashcardGrader"),
    partialBrokers: [] as PartialBroker[],
    aiCallParams: {} as AiCallParams,
};
const DEFAULT_VOICE_CONFIG: VoiceConfig = {
    apiName: 'openai',
    voiceId: '79a125e8-cd45-4c13-8a67-188112f4dd22',
    responseType: 'audio',
    temperature: 0.5,
    maxTokens: 2000
}



export default async function FastFirePage() {
    const flashcardSet = getFlashcardSet('historyFlashcards');
    const voiceConfig = DEFAULT_VOICE_CONFIG;

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin"/>
                <span className="ml-2">Loading flashcards...</span>
            </div>
        }>
            <FastFireContainer
                initialFlashcards={flashcardSet}
                setId="historyFlashcards"
                voiceConfig={DEFAULT_VOICE_CONFIG}
            />
        </Suspense>
    );
}

// modules/aiVoice/aiVoiceModuleConfig.ts

import {moduleSystemDefaults} from '@/lib/redux/moduleSchema';
import {AiAudioConfig, AiAudioData, AiAudioSchema, AiAudioUserPreferences} from "@/types/aiAudioTypes";

const aiAudioConfig: AiAudioConfig = {
    model_id: "sonic-english",
    voice: {
        mode: "id",
        id: "156fb8d2-335b-4950-9cb3-a2d33befec77",
        __experimental_controls: {
            speed: "normal",
            emotion: [
                "positivity:high",
                "curiosity"
            ]
        },
    },
    transcript: "text",
    defaultVoices: [
        {
            id: "156fb8d2-335b-4950-9cb3-a2d33befec77",
            name: "Ms. Matrx",
            description: "This aiAudio is friendly and conversational, designed for customer support agents and casual conversations"
        },
        {
            id: "ee7ea9f8-c0c1-498c-9279-764d6b56d189",
            name: "Mr. Matrx",
            description: "This aiAudio is polite and conversational, with a slight accent, designed for customer support and casual conversations"
        }
    ],
};

const aiAudioUserPreferences: AiAudioUserPreferences = {
    audio: {
        voiceId: '156fb8d2-335b-4950-9cb3-a2d33befec77',
        language: 'en',
        speed: "normal",
        emotion: 'happy',
        microphone: true,
        speaker: true,
        wakeWord: 'Hey Matrix',
    },
    customVocab: {}
};

const aiAudioInitialData: AiAudioData = {
    availableVoices: [],
    customVoices: [],
    voiceClones: [],
    transcripts: [],
    meetingNotes: [],
    savedAudio: [],
    userAudioFiles: [],
};

export const aiAudioInitialState: AiAudioSchema = {
    moduleName: "aiAudio",
    initiated: moduleSystemDefaults.initiated,
    configs: aiAudioConfig,
    userPreferences: aiAudioUserPreferences,
    data: aiAudioInitialData,
    loading: moduleSystemDefaults.loading,
    error: moduleSystemDefaults.error,
    staleTime: moduleSystemDefaults.staleTime,
};